"""
Analytics dashboard API.

GET /api/analytics/dashboard/?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD

Admin: all channels, channel breakdown, stage funnel.
Channel Owner: own channels, source breakdown, lead quality, avg response time.
"""

import logging
from datetime import datetime, timedelta
from decimal import Decimal

from django.db.models import Count
from django.utils import timezone
from rest_framework import status
from users.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from acquisition_channels.models import Channel, Source
from cases.models import Case, CaseStage, TERMINAL_STAGES
from clients.models import Client
from common.analytics import (
    get_pipeline_counts, get_avg_response_minutes,
    count_lead_breaches, count_case_breaches,
)
from leads.models import Lead
from users.models import UserRole

logger = logging.getLogger(__name__)

REVENUE_RATE = Decimal('0.009')  # 0.9%


class DashboardAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role not in (UserRole.ADMIN, UserRole.CHANNEL_OWNER):
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN,
            )

        start_date, end_date = self._parse_dates(request)
        start_dt = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
        end_dt = timezone.make_aware(datetime.combine(end_date, datetime.max.time()))

        channels = Channel.objects.filter(is_active=True)
        if user.role == UserRole.CHANNEL_OWNER:
            channels = channels.filter(owner=user)

        channel_ids = list(channels.values_list('id', flat=True))
        source_ids = list(
            Source.objects.filter(channel_id__in=channel_ids).values_list('id', flat=True)
        )

        # Overall aggregates
        overall = self._compute_overall(source_ids, start_dt, end_dt)

        # Breakdown rows
        channel_rows = []
        source_rows = []

        for ch in channels.prefetch_related('sources'):
            ch_sources = list(ch.sources.all())
            ch_source_ids = [s.id for s in ch_sources]

            if user.role == UserRole.ADMIN:
                row = self._compute_row(ch.name, ch_source_ids, start_dt, end_dt,
                                        monthly_spend=ch.monthly_spend, row_id=str(ch.id))
                channel_rows.append(row)

            if user.role == UserRole.CHANNEL_OWNER:
                for src in ch_sources:
                    row = self._compute_source_row(src, start_dt, end_dt)
                    source_rows.append(row)

        response = {
            'overall': overall,
            'date_range': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
            },
        }

        if user.role == UserRole.ADMIN:
            response['breakdown'] = channel_rows
            response['breakdown_type'] = 'channel'
            response['stage_funnel'] = self._stage_funnel(source_ids)
        else:
            response['breakdown'] = source_rows
            response['breakdown_type'] = 'source'
            response['pipeline'] = self._pipeline_snapshot(source_ids)
            response['stage_funnel'] = self._stage_funnel(source_ids)

        return Response(response)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _parse_dates(self, request):
        today = timezone.now().date()
        try:
            s = request.query_params.get('start_date')
            e = request.query_params.get('end_date')
            if s and e:
                return datetime.strptime(s, '%Y-%m-%d').date(), datetime.strptime(e, '%Y-%m-%d').date()
        except ValueError:
            pass
        start = today.replace(day=1)
        if today.month == 12:
            end = today.replace(day=31)
        else:
            end = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
        return start, end

    def _compute_overall(self, source_ids, start_dt, end_dt):
        counts = get_pipeline_counts(source_ids, start_dt, end_dt)
        breaches = self._count_breaches(source_ids, start_dt, end_dt)

        return {
            'total_disbursed': str(counts['total_disbursed']),
            'revenue': str((counts['total_disbursed'] * REVENUE_RATE).quantize(Decimal('0.01'))),
            'total_leads': counts['leads_count'],
            'total_clients': counts['clients_count'],
            'total_cases': counts['cases_count'],
            'loans_count': counts['loans_count'],
            'sla_breaches': breaches,
        }

    def _compute_row(self, name, source_ids, start_dt, end_dt, monthly_spend=None, row_id=''):
        counts = get_pipeline_counts(source_ids, start_dt, end_dt)
        breaches = self._count_breaches(source_ids, start_dt, end_dt)

        return {
            'id': row_id,
            'name': name,
            'monthly_spend': str(monthly_spend) if monthly_spend else None,
            'leads_count': counts['leads_count'],
            'clients_count': counts['clients_count'],
            'cases_count': counts['cases_count'],
            'loans_count': counts['loans_count'],
            'total_disbursed': str(counts['total_disbursed']),
            'sla_breaches': breaches,
        }

    def _compute_source_row(self, source, start_dt, end_dt):
        """Source-level row for channel owners with lead quality + avg response time."""
        sid = [source.id]
        leads_qs = Lead.objects.filter(source_id__in=sid, created_at__range=(start_dt, end_dt))
        converted = leads_qs.filter(converted_client_id__isnull=False).count()
        declined = leads_qs.filter(status='declined').count()

        counts = get_pipeline_counts(sid, start_dt, end_dt)
        leads_count = counts['leads_count']
        avg_response_minutes = get_avg_response_minutes(leads_qs)
        breaches = self._count_breaches(sid, start_dt, end_dt)

        return {
            'id': str(source.id),
            'name': source.name,
            'leads_count': leads_count,
            'clients_count': counts['clients_count'],
            'cases_count': counts['cases_count'],
            'total_disbursed': str(counts['total_disbursed']),
            'sla_breaches': breaches,
            'converted_pct': round(converted / leads_count * 100, 1) if leads_count > 0 else 0,
            'declined_pct': round(declined / leads_count * 100, 1) if leads_count > 0 else 0,
            'avg_response_minutes': avg_response_minutes,
        }

    # ------------------------------------------------------------------
    # Admin-only sections
    # ------------------------------------------------------------------

    def _stage_funnel(self, source_ids):
        """Current cases by stage (live snapshot, not date-filtered)."""
        excluded = TERMINAL_STAGES | {CaseStage.ON_HOLD}
        cases = Case.objects.filter(
            client__source_id__in=source_ids,
        ).exclude(
            stage__in=excluded,
        ).values('stage').annotate(count=Count('id')).order_by()

        stage_map = dict(CaseStage.choices)
        # Order stages by the natural workflow progression
        stage_order = [s.value for s in CaseStage if s not in excluded]
        rows = {row['stage']: row['count'] for row in cases}
        return [
            {'stage': stage_map.get(key, key), 'stage_key': key, 'count': rows[key]}
            for key in stage_order if key in rows
        ]

    # ------------------------------------------------------------------
    # Channel Owner sections
    # ------------------------------------------------------------------

    def _pipeline_snapshot(self, source_ids):
        """Current pipeline: active leads, clients, cases (live snapshot)."""
        active_leads = Lead.objects.filter(
            source_id__in=source_ids, status='active', converted_client_id__isnull=True,
        ).count()
        active_clients = Client.objects.filter(
            source_id__in=source_ids, status='active',
        ).count()
        active_cases = Case.objects.filter(
            client__source_id__in=source_ids,
        ).exclude(stage__in=TERMINAL_STAGES).count()

        return {
            'active_leads': active_leads,
            'active_clients': active_clients,
            'active_cases': active_cases,
        }

    # ------------------------------------------------------------------
    # Shared
    # ------------------------------------------------------------------

    @staticmethod
    def _count_breaches(source_ids, start_dt, end_dt):
        """Count SLA breaches for leads and active cases (DB-level)."""
        now = timezone.now()
        return (
            count_lead_breaches(source_ids, start_dt, end_dt, now)
            + count_case_breaches(source_ids, start_dt, end_dt, now)
        )
