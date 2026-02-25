"""
API views for Client management.

This module provides ViewSets for client CRUD operations,
status changes, co-applicant management, and case creation.
"""

import logging
from datetime import timedelta

from django.db.models import Exists, OuterRef, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from clients.models import Client, ClientStatus, CoApplicant, ClientExtraDetails, ApplicationType
from leads.models import PipelineStatus
from leads.services import update_pipeline_status
from clients.serializers import (
    ClientListSerializer,
    ClientDetailSerializer,
    ClientCreateSerializer,
    ClientUpdateSerializer,
    ClientChangeStatusSerializer,
    CoApplicantSerializer,
    CoApplicantCreateUpdateSerializer,
    ClientExtraDetailsSerializer,
    ClientExtraDetailsCreateUpdateSerializer,
)
from common.pagination import StandardPagination
from users.permissions import IsAuthenticated, CanAccessClients

logger = logging.getLogger(__name__)


class ClientViewSet(viewsets.ModelViewSet):
    """
    ViewSet for client management.

    Provides CRUD operations plus custom actions for status changes,
    co-applicant management, and case creation.

    Endpoints:
    - GET /clients - List all clients (paginated, with search/filter)
    - POST /clients - Create client
    - GET /clients/{id} - Get client details with calculations
    - PATCH /clients/{id} - Update client
    - POST /clients/{id}/change_status - Change client status
    - POST /clients/{id}/update_co_applicant - Create/update co-applicant
    - POST /clients/{id}/create_case - Create case from client
    - PATCH /clients/{id}/reassign - Reassign client owner (Channel Owner or Admin)

    - DELETE /clients/{id} - Delete client (if no linked cases)
    """

    queryset = Client.objects.all().select_related(
        'source__channel',
        'converted_from_lead',
        'assigned_to',
        'co_applicant',  # OneToOne should use select_related
        'extra_details',
    ).prefetch_related(
        'cases',  # Prefetch cases for SLA status check (self.cases.exists())
    ).order_by('-created_at')
    permission_classes = [IsAuthenticated, CanAccessClients]
    pagination_class = StandardPagination

    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def destroy(self, request, *args, **kwargs):
        client = self.get_object()
        try:
            client.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception:
            return Response(
                {'error': 'Cannot delete client with linked cases. Delete the cases first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return ClientListSerializer
        elif self.action == 'create':
            return ClientCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ClientUpdateSerializer
        elif self.action == 'change_status':
            return ClientChangeStatusSerializer
        elif self.action == 'update_co_applicant':
            return CoApplicantCreateUpdateSerializer
        return ClientDetailSerializer

    def get_queryset(self):
        """Filter queryset based on search and status query params."""
        queryset = super().get_queryset()

        # Annotate _has_whatsapp for detail view to avoid N+1 in serializer
        if self.action in ('retrieve', 'partial_update'):
            from whatsapp.models import WhatsAppMessage
            queryset = queryset.annotate(
                _has_whatsapp=Exists(
                    WhatsAppMessage.objects.filter(client_id=OuterRef('pk'))
                )
            )

        # Search filter (name, phone, email)
        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(phone__icontains=search) |
                Q(email__icontains=search)
            )

        # Status filter
        status_filter = self.request.query_params.get('status', '').strip()
        if status_filter and status_filter in ClientStatus.values:
            queryset = queryset.filter(status=status_filter)

        # Application type filter
        app_type_filter = self.request.query_params.get('application_type', '').strip()
        if app_type_filter and app_type_filter in ApplicationType.values:
            queryset = queryset.filter(application_type=app_type_filter)

        # Source filter
        source_id = self.request.query_params.get('source_id', '').strip()
        if source_id:
            queryset = queryset.filter(source_id=source_id)

        # Channel filter
        channel_id = self.request.query_params.get('channel_id', '').strip()
        if channel_id:
            queryset = queryset.filter(source__channel_id=channel_id)

        # Date range filter (created_at)
        start_date = self.request.query_params.get('start_date', '').strip()
        end_date = self.request.query_params.get('end_date', '').strip()
        if start_date and end_date:
            queryset = queryset.filter(created_at__date__gte=start_date, created_at__date__lte=end_date)

        # SLA status filter - uses DB-level filtering where possible
        sla_status_filter = self.request.query_params.get('sla_status', '').strip()
        if sla_status_filter:
            terminal_statuses = [ClientStatus.DECLINED, ClientStatus.NOT_PROCEEDING]
            if sla_status_filter == 'completed':
                # Terminal clients or those with first_contact_completed_at
                queryset = queryset.filter(
                    Q(status__in=terminal_statuses) |
                    Q(first_contact_completed_at__isnull=False)
                )
            elif sla_status_filter in ('overdue', 'remaining'):
                # Exclude terminal and already-completed first
                active_qs = queryset.exclude(
                    Q(status__in=terminal_statuses) |
                    Q(first_contact_completed_at__isnull=False)
                )
                now = timezone.now()
                overdue_ids = []
                remaining_ids = []
                for c in active_qs.only(
                    'id', 'converted_from_lead_id', 'created_at',
                    'source_id', 'first_contact_completed_at', 'status',
                ).select_related('source__channel').iterator():
                    sla_minutes = c.effective_sla_minutes
                    if sla_minutes is None:
                        continue
                    deadline = c.created_at + timedelta(minutes=sla_minutes)
                    if deadline < now:
                        overdue_ids.append(c.id)
                    else:
                        remaining_ids.append(c.id)
                ids = overdue_ids if sla_status_filter == 'overdue' else remaining_ids
                queryset = queryset.filter(id__in=ids)

        return queryset

    def list(self, request):
        """
        List all clients with pagination, search, and filters.

        GET /clients?page=1&page_size=10&search=john&status=active
        Returns: { items: [...], total, page, page_size, total_pages }
        """
        queryset = self.filter_queryset(self.get_queryset())

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request):
        """
        Create a new client.

        POST /clients
        Body: All client fields plus source_id (and optional lead_id for conversion)

        Validates trusted channel OR accepts lead_id for conversion.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            client = serializer.save()
            return Response(
                ClientDetailSerializer(client).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            logger.error(f'Client creation failed: {str(e)}')
            return Response(
                {'error': f'Failed to create client: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def retrieve(self, request, pk=None):
        """
        Get client details with all calculations.

        GET /clients/{id}
        Returns full client with DBR, LTV, max_loan, can_create_case.
        """
        client = self.get_object()
        serializer = ClientDetailSerializer(client)
        return Response(serializer.data)

    def partial_update(self, request, pk=None):
        """
        Update client fields.

        PATCH /clients/{id}
        Body: Any writable field

        Calculations are recalculated on response.
        """
        client = self.get_object()
        serializer = self.get_serializer(client, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        try:
            client = serializer.save()
            client.refresh_from_db()
            return Response(ClientDetailSerializer(client).data)
        except Exception as e:
            logger.error(f'Client update failed: {str(e)}')
            return Response(
                {'error': f'Failed to update client: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def change_status(self, request, pk=None):
        """
        Change client status.

        POST /clients/{id}/change_status
        Body: { status: 'converted' | 'declined' | 'not_proceeding' | 'active' }

        Validates allowed status transitions.
        """
        client = self.get_object()
        serializer = ClientChangeStatusSerializer(
            data=request.data,
            context={'client': client}
        )
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data['status']
        client.status = new_status
        client.save()

        # Update pipeline status on decline/not_proceeding
        if new_status in (ClientStatus.DECLINED, ClientStatus.NOT_PROCEEDING) and client.converted_from_lead_id:
            update_pipeline_status(client.converted_from_lead_id, PipelineStatus.DECLINED)

        # Auto-send system template if configured for this status
        try:
            from templates.services import TemplateService
            TemplateService().trigger_on_client_status_change(client, new_status)
        except Exception as tmpl_err:
            logger.warning(f'Template auto-send failed (non-blocking): {tmpl_err}')

        return Response(ClientDetailSerializer(client).data)

    @action(detail=True, methods=['post'])
    def update_co_applicant(self, request, pk=None):
        """
        Create or update co-applicant for joint applications.

        POST /clients/{id}/update_co_applicant
        Body: Co-applicant fields (identity, income, liabilities)

        Only valid for clients with application_type='joint'.
        """
        client = self.get_object()

        # Validate client is joint application
        if client.application_type != ApplicationType.JOINT:
            return Response(
                {'error': 'Co-applicant can only be added to joint applications.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = CoApplicantCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            # Check if co-applicant exists
            co_applicant = getattr(client, 'co_applicant', None)

            if co_applicant:
                # Update existing
                for field, value in serializer.validated_data.items():
                    setattr(co_applicant, field, value)
                co_applicant.save()
            else:
                # Create new
                co_applicant = CoApplicant.objects.create(
                    client=client,
                    **serializer.validated_data
                )

            # Refresh client to get updated calculations
            client.refresh_from_db()
            return Response(ClientDetailSerializer(client).data)

        except Exception as e:
            logger.error(f'Co-applicant update failed: {str(e)}')
            return Response(
                {'error': f'Failed to update co-applicant: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def create_case(self, request, pk=None):
        """
        Create a case from this client.

        POST /clients/{id}/create_case
        Body: { property_value?, loan_amount?, bank?, product?, rate_type?, rate? }

        Validates can_create_case before proceeding.
        """
        client = self.get_object()

        # Validate can_create_case
        eligibility = client.can_create_case
        if not eligibility['valid']:
            return Response(
                {
                    'error': 'Cannot create case. Requirements not met.',
                    'reasons': eligibility['reasons']
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Import Case model here to avoid circular imports
        try:
            from cases.models import Case

            # Get case data from request or use client defaults
            case_data = {
                'client': client,
                'application_type': client.application_type,
                'property_type': request.data.get('property_type', client.property_type),
                'transaction_type': request.data.get('transaction_type', client.transaction_type),
                'property_value': request.data.get('property_value', client.property_value),
                'loan_amount': request.data.get('loan_amount', client.loan_amount),
                'tenure_years': request.data.get('tenure_years', 25),
                'bank': request.data.get('bank', ''),
                'product': request.data.get('product', ''),
                'rate_type': request.data.get('rate_type', 'fixed'),
                'rate': request.data.get('rate'),
            }

            case = Case.objects.create(**case_data)

            # Return case data
            from cases.serializers import CaseDetailSerializer
            return Response(
                CaseDetailSerializer(case).data,
                status=status.HTTP_201_CREATED
            )

        except ImportError:
            # Cases app not yet implemented
            return Response(
                {'error': 'Cases module not available yet.'},
                status=status.HTTP_501_NOT_IMPLEMENTED
            )
        except Exception as e:
            logger.error(f'Case creation failed: {str(e)}')
            return Response(
                {'error': f'Failed to create case: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['delete'])
    def delete_co_applicant(self, request, pk=None):
        """
        Delete co-applicant from client.

        DELETE /clients/{id}/delete_co_applicant

        Removes the co-applicant record.
        """
        client = self.get_object()

        try:
            co_applicant = client.co_applicant
            co_applicant.delete()

            # Refresh client to get updated calculations
            client.refresh_from_db()
            return Response(ClientDetailSerializer(client).data)

        except CoApplicant.DoesNotExist:
            return Response(
                {'error': 'No co-applicant found for this client.'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f'Co-applicant deletion failed: {str(e)}')
            return Response(
                {'error': f'Failed to delete co-applicant: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get', 'post', 'patch'])
    def extra_details(self, request, pk=None):
        """
        Get or update extra details for a client.

        GET /clients/{id}/extra_details - Get extra details
        POST/PATCH /clients/{id}/extra_details - Create/update extra details

        Body (POST/PATCH): Extra details fields (personal, work, address, references)
        """
        client = self.get_object()

        if request.method == 'GET':
            try:
                extra_details = client.extra_details
                return Response(ClientExtraDetailsSerializer(extra_details).data)
            except ClientExtraDetails.DoesNotExist:
                return Response({}, status=status.HTTP_200_OK)

        # POST or PATCH - create or update
        serializer = ClientExtraDetailsCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            # Check if extra details exist
            try:
                extra_details = client.extra_details
                # Update existing
                for field, value in serializer.validated_data.items():
                    setattr(extra_details, field, value)
                extra_details.save()
            except ClientExtraDetails.DoesNotExist:
                # Create new
                extra_details = ClientExtraDetails.objects.create(
                    client=client,
                    **serializer.validated_data
                )

            return Response(ClientExtraDetailsSerializer(extra_details).data)

        except Exception as e:
            logger.error(f'Extra details update failed: {str(e)}')
            return Response(
                {'error': f'Failed to update extra details: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
