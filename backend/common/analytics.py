"""
Shared analytics query helpers.

All functions use GROUP BY source_id so the dashboard can batch-fetch
data for every channel/source in a constant number of queries.
"""

from decimal import Decimal

from django.db.models import (
    Avg, Case as DBCase, Count, DateTimeField, DurationField,
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


_ZERO_STATS = {
    'leads_count': 0,
    'clients_count': 0,
    'cases_count': 0,
    'loans_count': 0,
    'total_disbursed': Decimal('0'),
    'converted': 0,
    'declined': 0,
    'avg_response_minutes': None,
}


def get_source_stats(source_ids, start_dt, end_dt):
    """
    Batch-fetch pipeline counts + lead quality grouped by source_id.

    3 queries total: leads, clients, cases.
    Returns {source_id: {leads_count, clients_count, cases_count,
             loans_count, total_disbursed, converted, declined, avg_response_minutes}}
    """
    result = {sid: {**_ZERO_STATS} for sid in source_ids}

    # Query 1: Leads — count + quality + avg response in one shot
    for row in Lead.objects.filter(
        source_id__in=source_ids, created_at__range=(start_dt, end_dt),
    ).annotate(
        response_time=ExpressionWrapper(
            F('first_response_at') - F('created_at'),
            output_field=DurationField(),
        ),
    ).values('source_id').annotate(
        count=Count('id'),
        converted=Count('id', filter=Q(converted_client_id__isnull=False)),
        declined=Count('id', filter=Q(status=LeadStatus.DECLINED)),
        avg_response=Avg('response_time'),
    ):
        sid = row['source_id']
        result[sid]['leads_count'] = row['count']
        result[sid]['converted'] = row['converted']
        result[sid]['declined'] = row['declined']
        avg = row['avg_response']
        result[sid]['avg_response_minutes'] = round(avg.total_seconds() / 60) if avg else None

    # Query 2: Clients
    for row in Client.objects.filter(
        source_id__in=source_ids, created_at__range=(start_dt, end_dt),
    ).values('source_id').annotate(count=Count('id')):
        result[row['source_id']]['clients_count'] = row['count']

    # Query 3: Cases + disbursed (merged via conditional aggregation)
    for row in Case.objects.filter(
        client__source_id__in=source_ids,
    ).filter(
        Q(created_at__range=(start_dt, end_dt))
        | Q(stage=CaseStage.DISBURSED, stage_changed_at__range=(start_dt, end_dt))
    ).values('client__source_id').annotate(
        cases_count=Count('id', filter=Q(created_at__range=(start_dt, end_dt))),
        loans_count=Count('id', filter=Q(
            stage=CaseStage.DISBURSED, stage_changed_at__range=(start_dt, end_dt),
        )),
        total_disbursed=Coalesce(
            Sum('loan_amount', filter=Q(
                stage=CaseStage.DISBURSED, stage_changed_at__range=(start_dt, end_dt),
            )),
            Value(Decimal('0')),
        ),
    ):
        sid = row['client__source_id']
        result[sid]['cases_count'] = row['cases_count']
        result[sid]['loans_count'] = row['loans_count']
        result[sid]['total_disbursed'] = row['total_disbursed']

    return result


def aggregate_source_stats(stats_by_source, source_ids):
    """Sum pipeline counts across a set of source_ids (pure Python, no DB)."""
    totals = {
        'leads_count': 0,
        'clients_count': 0,
        'cases_count': 0,
        'loans_count': 0,
        'total_disbursed': Decimal('0'),
    }
    for sid in source_ids:
        c = stats_by_source.get(sid)
        if not c:
            continue
        totals['leads_count'] += c['leads_count']
        totals['clients_count'] += c['clients_count']
        totals['cases_count'] += c['cases_count']
        totals['loans_count'] += c['loans_count']
        totals['total_disbursed'] += c['total_disbursed']
    return totals


def count_breaches_by_source(source_ids, start_dt, end_dt, now):
    """
    Count SLA breaches (leads + cases) grouped by source_id.

    2 queries total: one for leads, one for cases.
    Returns {source_id: int}
    """
    result = {sid: 0 for sid in source_ids}

    # -- Query 1: Lead breaches (responded + no-response in one query) --
    effective_sla = Coalesce(
        F('source__sla_minutes'),
        F('source__channel__default_sla_minutes'),
    )
    deadline_expr = ExpressionWrapper(
        F('created_at') + MinutesToInterval(F('_sla')),
        output_field=DateTimeField(),
    )
    for row in Lead.objects.filter(
        source_id__in=source_ids,
        created_at__range=(start_dt, end_dt),
    ).annotate(
        _sla=effective_sla,
        _deadline=deadline_expr,
    ).filter(
        _sla__isnull=False,
    ).values('source_id').annotate(
        breached_responded=Count('id', filter=Q(
            first_response_at__isnull=False,
            first_response_at__gt=F('_deadline'),
        )),
        breached_no_response=Count('id', filter=(
            Q(first_response_at__isnull=True, _deadline__lt=now)
            & ~Q(status=LeadStatus.DECLINED)
            & Q(converted_client_id__isnull=True)
        )),
    ):
        result[row['source_id']] += row['breached_responded'] + row['breached_no_response']

    # -- Query 2: Case breaches --
    if StageSLAConfig._sla_cache is None:
        StageSLAConfig.get_sla_for_stage('')
    if StageSLAConfig._sla_cache is None:
        StageSLAConfig._sla_cache = {
            c.from_stage: c.sla_hours
            for c in StageSLAConfig.objects.filter(is_active=True)
        }

    sla_whens = [
        When(stage=stage, then=Value(hours))
        for stage, hours in StageSLAConfig._sla_cache.items()
    ]
    if sla_whens:
        case_deadline = ExpressionWrapper(
            F('stage_changed_at') + HoursToInterval(F('_sla_hours')),
            output_field=DateTimeField(),
        )
        for row in Case.objects.filter(
            client__source_id__in=source_ids,
            created_at__range=(start_dt, end_dt),
        ).exclude(
            stage__in=TERMINAL_STAGES,
        ).annotate(
            _sla_hours=DBCase(*sla_whens, output_field=IntegerField()),
            _deadline=case_deadline,
        ).filter(
            _sla_hours__isnull=False,
            _deadline__lt=now,
        ).values('client__source_id').annotate(count=Count('id')):
            result[row['client__source_id']] += row['count']

    return result
