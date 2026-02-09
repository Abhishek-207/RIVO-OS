"""
Shared analytics query helpers.

Consolidates the repeated leads/clients/cases count + disbursed queries
used by the dashboard analytics view so they are defined once.
"""

from decimal import Decimal

from django.db.models import Sum, Value, Avg, F, ExpressionWrapper, DurationField
from django.db.models.functions import Coalesce

from cases.models import Case, CaseStage
from clients.models import Client
from leads.models import Lead


def get_pipeline_counts(source_ids, start_dt, end_dt):
    """
    Get lead/client/case counts and disbursed totals for a set of sources.

    Returns dict with: leads_count, clients_count, cases_count,
    loans_count, total_disbursed.
    """
    leads = Lead.objects.filter(
        source_id__in=source_ids, created_at__range=(start_dt, end_dt)
    ).count()

    clients = Client.objects.filter(
        source_id__in=source_ids, created_at__range=(start_dt, end_dt)
    ).count()

    cases_count = Case.objects.filter(
        client__source_id__in=source_ids, created_at__range=(start_dt, end_dt)
    ).count()

    disbursed_qs = Case.objects.filter(
        client__source_id__in=source_ids,
        stage=CaseStage.DISBURSED,
        stage_changed_at__range=(start_dt, end_dt),
    )
    agg = disbursed_qs.aggregate(
        total=Coalesce(Sum('loan_amount'), Value(Decimal('0')))
    )
    total_disbursed = agg['total']
    loans_count = disbursed_qs.count()

    return {
        'leads_count': leads,
        'clients_count': clients,
        'cases_count': cases_count,
        'loans_count': loans_count,
        'total_disbursed': total_disbursed,
    }


def get_avg_response_minutes(leads_qs):
    """
    Calculate average first-response time in minutes using DB aggregation.

    Args:
        leads_qs: a Lead queryset (already filtered by source/date)

    Returns:
        int or None
    """
    result = leads_qs.filter(
        first_response_at__isnull=False
    ).annotate(
        response_time=ExpressionWrapper(
            F('first_response_at') - F('created_at'),
            output_field=DurationField()
        )
    ).aggregate(avg_time=Avg('response_time'))

    avg_time = result['avg_time']
    if avg_time is None:
        return None
    return round(avg_time.total_seconds() / 60)
