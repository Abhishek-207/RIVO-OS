"""
API views for Case management.

This module provides ViewSets for case CRUD operations and stage management.
"""

import logging
from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from cases.models import Case, Bank, CaseStage, StageSLAConfig, ACTIVE_STAGES, TERMINAL_STAGES, QUERY_STAGES
from cases.serializers import (
    CaseListSerializer,
    CaseDetailSerializer,
    CaseCreateSerializer,
    CaseUpdateSerializer,
    StageChangeSerializer,
    BankListSerializer,
    CaseReassignSerializer,
)
from clients.models import Client, ClientStatus
from common.pagination import StandardPagination
from users.permissions import IsAuthenticated, IsChannelOwnerOrAdmin, CanAccessCases

logger = logging.getLogger(__name__)


class CaseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for case management.

    Provides CRUD operations for cases:
    - GET /cases - List all cases (paginated, with search/filter)
    - POST /cases - Create case
    - GET /cases/{id} - Get case details
    - PATCH /cases/{id} - Update case
    - POST /cases/{id}/change_stage - Change case stage
    - PATCH /cases/{id}/reassign - Reassign case owner (Channel Owner or Admin)

    NO destroy action (no delete per spec).
    """

    queryset = Case.objects.all().select_related(
        'client',
        'client__co_applicant',
        'assigned_to',
    ).order_by('-created_at')
    permission_classes = [IsAuthenticated, CanAccessCases]
    pagination_class = StandardPagination

    # Disable delete action
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return CaseListSerializer
        elif self.action == 'create':
            return CaseCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return CaseUpdateSerializer
        elif self.action == 'change_stage':
            return StageChangeSerializer
        elif self.action == 'reassign':
            return CaseReassignSerializer
        return CaseDetailSerializer

    def get_queryset(self):
        """Filter queryset based on query params."""
        queryset = super().get_queryset()

        # Search filter (by client name)
        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(client__name__icontains=search) |
                Q(client__phone__icontains=search) |
                Q(client__email__icontains=search)
            )

        # Stage filter
        stage = self.request.query_params.get('stage', '').strip()
        if stage:
            if stage == 'active':
                queryset = queryset.filter(stage__in=ACTIVE_STAGES)
            elif stage == 'terminal':
                queryset = queryset.filter(stage__in=TERMINAL_STAGES)
            elif stage == 'on_hold':
                queryset = queryset.filter(stage=CaseStage.ON_HOLD)
            elif stage in CaseStage.values:
                queryset = queryset.filter(stage=stage)

        # Bank filter
        bank = self.request.query_params.get('bank', '').strip()
        if bank:
            queryset = queryset.filter(bank__iexact=bank)

        # Client ID filter
        client_id = self.request.query_params.get('client_id', '').strip()
        if client_id:
            queryset = queryset.filter(client_id=client_id)

        # Channel filter (for dashboard drill-down)
        channel = self.request.query_params.get('channel', '').strip()
        if channel:
            queryset = queryset.filter(client__source__channel_id=channel)

        # Source filter (for dashboard drill-down)
        source = self.request.query_params.get('source', '').strip()
        if source:
            queryset = queryset.filter(client__source_id=source)

        # Date range filter
        # When a specific stage is set, filter by stage_changed_at (matches dashboard counts)
        # Otherwise filter by created_at
        start_date = self.request.query_params.get('start_date', '').strip()
        end_date = self.request.query_params.get('end_date', '').strip()
        if start_date and end_date:
            if stage and stage not in ('active', 'terminal') and stage in CaseStage.values:
                queryset = queryset.filter(stage_changed_at__date__gte=start_date, stage_changed_at__date__lte=end_date)
            else:
                queryset = queryset.filter(created_at__date__gte=start_date, created_at__date__lte=end_date)

        # SLA status filter - uses DB-level filtering where possible
        sla_status_filter = self.request.query_params.get('sla_status', '').strip()
        if sla_status_filter:
            if sla_status_filter == 'completed':
                queryset = queryset.filter(
                    Q(stage__in=TERMINAL_STAGES) | Q(stage=CaseStage.ON_HOLD)
                )
            elif sla_status_filter in ('overdue', 'remaining'):
                # Exclude terminal/on_hold first at DB level
                active_qs = queryset.exclude(
                    Q(stage__in=TERMINAL_STAGES) | Q(stage=CaseStage.ON_HOLD)
                )
                # Pre-warm SLA config cache, then iterate minimal fields
                StageSLAConfig.get_sla_for_stage('')
                now = timezone.now()
                overdue_ids = []
                remaining_ids = []
                for c in active_qs.only('id', 'stage', 'stage_changed_at').iterator():
                    sla_hours = StageSLAConfig.get_sla_for_stage(c.stage)
                    if sla_hours is None:
                        continue
                    deadline = c.stage_changed_at + timedelta(hours=sla_hours)
                    if deadline < now:
                        overdue_ids.append(c.id)
                    else:
                        remaining_ids.append(c.id)
                ids = overdue_ids if sla_status_filter == 'overdue' else remaining_ids
                queryset = queryset.filter(id__in=ids)

        return queryset

    def list(self, request: Request) -> Response:
        """
        List all cases with pagination, search, and stage filter.

        GET /cases?page=1&page_size=10&search=john&stage=processing&bank=emirates
        Returns: { items: [...], total, page, page_size, total_pages }
        """
        queryset = self.filter_queryset(self.get_queryset())

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request: Request) -> Response:
        """
        Create a new case.

        POST /cases
        Body: { client_id, property fields, loan fields, bank product fields }

        Validates client eligibility before creating the case.
        Copies application_type from client.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            case = serializer.save()
            return Response(
                CaseDetailSerializer(case).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            logger.error(f'Case creation failed: {str(e)}')
            return Response(
                {'error': f'Failed to create case: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def retrieve(self, request: Request, pk=None) -> Response:
        """
        Get a single case's details.

        GET /cases/{id}
        Returns all case fields plus computed LTV.
        """
        case = self.get_object()
        serializer = CaseDetailSerializer(case)
        return Response(serializer.data)

    def partial_update(self, request: Request, pk=None) -> Response:
        """
        Update a case's fields.

        PATCH /cases/{id}
        Body: { property fields, loan fields, bank product fields }

        Cannot update terminal cases.
        """
        case = self.get_object()

        # Check if case is in terminal stage
        if case.is_terminal:
            return Response(
                {'error': 'Cannot update a case in a terminal stage.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(case, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        try:
            serializer.save()
            return Response(CaseDetailSerializer(case).data)
        except Exception as e:
            logger.error(f'Case update failed: {str(e)}')
            return Response(
                {'error': f'Failed to update case: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def change_stage(self, request: Request, pk=None) -> Response:
        """
        Change the case stage.

        POST /cases/{id}/change_stage
        Body: { stage: 'new_stage' }

        Validates stage transition rules:
        - Cannot transition from terminal stages
        - Updates stage_changed_at timestamp
        """
        case = self.get_object()

        serializer = StageChangeSerializer(
            data=request.data,
            context={'case': case}
        )
        serializer.is_valid(raise_exception=True)

        new_stage = serializer.validated_data['stage']

        try:
            case.change_stage(new_stage)

            # Auto-send system template if configured for this stage
            try:
                from templates.services import TemplateService
                TemplateService().trigger_on_case_stage_change(case, new_stage)
            except Exception as tmpl_err:
                logger.warning(f'Template auto-send failed (non-blocking): {tmpl_err}')

            return Response(CaseDetailSerializer(case).data)
        except Exception as e:
            logger.error(f'Stage change failed: {str(e)}')
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def stages(self, request: Request) -> Response:
        """
        Get all available stages with their categories.

        GET /cases/stages
        Returns stage choices grouped by category.
        """
        active_stages = [
            {'value': stage.value, 'label': stage.label}
            for stage in CaseStage
            if stage in ACTIVE_STAGES
        ]
        terminal_stages = [
            {'value': stage.value, 'label': stage.label}
            for stage in CaseStage
            if stage in TERMINAL_STAGES
        ]
        hold_stages = [
            {'value': CaseStage.ON_HOLD.value, 'label': CaseStage.ON_HOLD.label}
        ]

        return Response({
            'active': active_stages,
            'hold': hold_stages,
            'terminal': terminal_stages,
        })

    @action(detail=False, methods=['get'])
    def banks(self, request: Request) -> Response:
        """
        Get all active banks for dropdown.

        GET /cases/banks
        Returns list of banks with id, name, and icon.
        """
        banks = Bank.objects.filter(is_active=True).order_by('name')
        serializer = BankListSerializer(banks, many=True)
        return Response(serializer.data)
