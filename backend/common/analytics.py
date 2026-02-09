"""
Shared analytics query helpers.

Consolidates the repeated leads/clients/cases count + disbursed queries
used by the dashboard analytics view so they are defined once.
"""

from decimal import Decimal

from django.db.models import (
    Avg, Case as DBCase, DateTimeField, DurationField,
    ExpressionWrapper, F, Func, IntegerField, Q, Sum, Value, When,
)
from django.db.models.functions import Coalesce

from cases.models import Case, CaseStage, StageSLAConfig, TERMINAL_STAGES
from clients.models import Client
from leads.models import Lead, LeadStatus


class MinutesToInterval(Func):
    """Convert an integer minutes value to a PostgreSQL interval."""
    function = ''
    template = "(%(expressions)s * interval '1 minute')"
    output_field = DurationField()


class HoursToInterval(Func):
    """Convert an integer hours value to a PostgreSQL interval."""
    function = ''
    template = "(%(expressions)s * interval '1 hour')"
    output_field = DurationField()


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


def count_lead_breaches(source_ids, start_dt, end_dt, now):
    """
    Count lead SLA breaches using DB-level queries.

    A lead is breached if:
    - It responded AFTER the SLA deadline, OR
    - It has NOT responded AND the deadline has passed AND it's not terminal
    """
    effective_sla = Coalesce(
        F('source__sla_minutes'),
        F('source__channel__default_sla_minutes'),
    )
    deadline_expr = ExpressionWrapper(
        F('created_at') + MinutesToInterval(F('_sla')),
        output_field=DateTimeField(),
    )

    base = Lead.objects.filter(
        source_id__in=source_ids,
        created_at__range=(start_dt, end_dt),
    ).annotate(
        _sla=effective_sla,
        _deadline=deadline_expr,
    ).filter(_sla__isnull=False)

    # Responded after deadline
    breached_responded = base.filter(
        first_response_at__isnull=False,
        first_response_at__gt=F('_deadline'),
    ).count()

    # No response, deadline passed, not terminal
    breached_no_response = base.filter(
        first_response_at__isnull=True,
        _deadline__lt=now,
    ).exclude(
        Q(status=LeadStatus.DECLINED) | Q(converted_client_id__isnull=False)
    ).count()

    return breached_responded + breached_no_response


def count_case_breaches(source_ids, start_dt, end_dt, now):
    """
    Count case SLA breaches using DB-level queries.

    A case is breached if it has been in its current stage longer than
    the configured SLA hours for that stage.
    """
    sla_configs = StageSLAConfig.get_sla_for_stage  # triggers cache load
    if StageSLAConfig._sla_cache is None:
        StageSLAConfig._sla_cache = {
            c.from_stage: c.sla_hours
            for c in StageSLAConfig.objects.filter(is_active=True)
        }

    sla_whens = [
        When(stage=stage, then=Value(hours))
        for stage, hours in StageSLAConfig._sla_cache.items()
    ]
    if not sla_whens:
        return 0

    deadline_expr = ExpressionWrapper(
        F('stage_changed_at') + HoursToInterval(F('_sla_hours')),
        output_field=DateTimeField(),
    )

    return Case.objects.filter(
        client__source_id__in=source_ids,
        created_at__range=(start_dt, end_dt),
    ).exclude(
        stage__in=TERMINAL_STAGES,
    ).annotate(
        _sla_hours=DBCase(*sla_whens, output_field=IntegerField()),
        _deadline=deadline_expr,
    ).filter(
        _sla_hours__isnull=False,
        _deadline__lt=now,
    ).count()
