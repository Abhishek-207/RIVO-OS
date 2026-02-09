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
    get_source_stats, aggregate_source_stats,
    count_breaches_by_source,
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

        now = timezone.now()

        # Batch-fetch all data upfront (5 queries total regardless of channel/source count)
        stats_by_source = get_source_stats(source_ids, start_dt, end_dt)
        breaches_by_source = count_breaches_by_source(source_ids, start_dt, end_dt, now)

        # Overall aggregates
        overall_counts = aggregate_source_stats(stats_by_source, source_ids)
        overall_breaches = sum(breaches_by_source.get(s, 0) for s in source_ids)
        overall = {
            'total_disbursed': str(overall_counts['total_disbursed']),
            'revenue': str((overall_counts['total_disbursed'] * REVENUE_RATE).quantize(Decimal('0.01'))),
            'total_leads': overall_counts['leads_count'],
            'total_clients': overall_counts['clients_count'],
            'total_cases': overall_counts['cases_count'],
            'loans_count': overall_counts['loans_count'],
            'sla_breaches': overall_breaches,
        }

        # Breakdown rows (built from pre-fetched data, no extra queries)
        channel_rows = []
        source_rows = []

        for ch in channels.prefetch_related('sources'):
            ch_sources = list(ch.sources.all())
            ch_source_ids = [s.id for s in ch_sources]

            if user.role == UserRole.ADMIN:
                rc = aggregate_source_stats(stats_by_source, ch_source_ids)
                rb = sum(breaches_by_source.get(s, 0) for s in ch_source_ids)
                channel_rows.append({
                    'id': str(ch.id),
                    'name': ch.name,
                    'monthly_spend': str(ch.monthly_spend) if ch.monthly_spend else None,
                    'leads_count': rc['leads_count'],
                    'clients_count': rc['clients_count'],
                    'cases_count': rc['cases_count'],
                    'loans_count': rc['loans_count'],
                    'total_disbursed': str(rc['total_disbursed']),
                    'sla_breaches': rb,
                })

            if user.role == UserRole.CHANNEL_OWNER:
                for src in ch_sources:
                    ss = stats_by_source.get(src.id, {})
                    lc = ss.get('leads_count', 0)
                    source_rows.append({
                        'id': str(src.id),
                        'name': src.name,
                        'leads_count': lc,
                        'clients_count': ss.get('clients_count', 0),
                        'cases_count': ss.get('cases_count', 0),
                        'total_disbursed': str(ss.get('total_disbursed', Decimal('0'))),
                        'sla_breaches': breaches_by_source.get(src.id, 0),
                        'converted_pct': round(ss.get('converted', 0) / lc * 100, 1) if lc > 0 else 0,
                        'declined_pct': round(ss.get('declined', 0) / lc * 100, 1) if lc > 0 else 0,
                        'avg_response_minutes': ss.get('avg_response_minutes'),
                    })

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

    def _stage_funnel(self, source_ids):
        """Current cases by stage (live snapshot, not date-filtered)."""
        excluded = TERMINAL_STAGES | {CaseStage.ON_HOLD}
        cases = Case.objects.filter(
            client__source_id__in=source_ids,
        ).exclude(
            stage__in=excluded,
        ).values('stage').annotate(count=Count('id')).order_by()

        stage_map = dict(CaseStage.choices)
        stage_order = [s.value for s in CaseStage if s not in excluded]
        rows = {row['stage']: row['count'] for row in cases}
        return [
            {'stage': stage_map.get(key, key), 'stage_key': key, 'count': rows[key]}
            for key in stage_order if key in rows
        ]

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
