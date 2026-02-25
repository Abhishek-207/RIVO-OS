"""
API views for lead management.

This module provides ViewSets for lead CRUD operations
and status management actions.
"""

import logging

from django.db.models import Q, F, ExpressionWrapper, DurationField
from django.db.models.functions import Now
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, action, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response

from django.db.models import Count
from django.utils import timezone
from datetime import timedelta

from leads.models import (
    Lead, LeadStatus, CampaignStatus, LeadInteraction, LeadMessage,
    MessageDirection, LeadMessageStatus, LeadMessageType
)
from leads.services import LeadTrackingService
from leads.serializers import (
    LeadChangeStatusSerializer,
    LeadDetailSerializer,
    LeadListSerializer,
    LeadUpdateSerializer,
    LeadInteractionSerializer,
    LeadMessageSerializer,
)
from common.pagination import StandardPagination
from common.ycloud_sync import sync_message_statuses
from users.permissions import IsAuthenticated, CanAccessLeads
from whatsapp.services import ycloud_service, YCloudError

logger = logging.getLogger(__name__)


class LeadViewSet(viewsets.ModelViewSet):
    """
    ViewSet for lead management.

    Provides CRUD operations for leads:
    - GET /leads - List all leads (paginated, with search/filter)
    - POST /leads - Create lead
    - GET /leads/{id} - Get lead details
    - PATCH /leads/{id} - Update lead
    - POST /leads/{id}/change_status - Change lead status
    - POST /leads/{id}/convert_to_client - Convert lead to client

    NO destroy action (no delete per spec).
    """

    queryset = Lead.objects.select_related(
        'source__channel'
    ).filter(converted_client_id__isnull=True).order_by('-created_at')
    permission_classes = [IsAuthenticated, CanAccessLeads]
    pagination_class = StandardPagination
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return LeadListSerializer
        elif self.action in ['update', 'partial_update']:
            return LeadUpdateSerializer
        elif self.action == 'change_status':
            return LeadChangeStatusSerializer
        return LeadDetailSerializer

    def get_queryset(self):
        """Filter queryset based on search and status query params."""
        queryset = super().get_queryset()

        # Search filter (name or phone)
        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(phone__icontains=search)
            )

        # Status filter
        status_filter = self.request.query_params.get('status', '').strip()
        if status_filter and status_filter in LeadStatus.values:
            queryset = queryset.filter(status=status_filter)

        # Source filter
        source_id = self.request.query_params.get('source_id', '').strip()
        if source_id:
            queryset = queryset.filter(source_id=source_id)

        # Channel filter (filter by channel id)
        channel_id = self.request.query_params.get('channel_id', '').strip()
        if channel_id:
            queryset = queryset.filter(source__channel_id=channel_id)

        # Campaign status filter
        campaign_status_filter = self.request.query_params.get('campaign_status', '').strip()
        if campaign_status_filter and campaign_status_filter in CampaignStatus.values:
            queryset = queryset.filter(campaign_status=campaign_status_filter)

        return queryset

    def list(self, request: Request) -> Response:
        """
        List all leads with pagination, search, and status filter.

        GET /leads?page=1&page_size=10&search=john&status=active
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
        """Leads are created via the public /api/leads/ingest/ endpoint only."""
        return Response(
            {'error': 'Lead creation via this endpoint is not supported. Use /api/leads/ingest/ instead.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )

    def retrieve(self, request: Request, pk=None) -> Response:
        """
        Get a single lead's details with SLA timer.

        GET /leads/{id}
        """
        lead = self.get_object()
        serializer = self.get_serializer(lead)
        return Response(serializer.data)

    def partial_update(self, request: Request, pk=None) -> Response:
        """
        Update a lead's allowed fields.

        PATCH /leads/{id}
        Body: { name?, phone?, email?, intent? }

        Cannot update leads in terminal status.
        """
        lead = self.get_object()

        if lead.is_terminal:
            return Response(
                {'error': 'Cannot update a lead in terminal status.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(lead, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        try:
            serializer.save()
            return Response(LeadDetailSerializer(lead).data)
        except Exception as e:
            logger.error(f'Lead update failed: {str(e)}')
            return Response(
                {'error': f'Failed to update lead: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def change_status(self, request: Request, pk=None) -> Response:
        """
        Change a lead's status.

        POST /leads/{id}/change_status
        Body: { status: 'converted' | 'declined' | 'not_proceeding' }

        Cannot change status of terminal leads.
        """
        lead = self.get_object()

        serializer = LeadChangeStatusSerializer(
            data=request.data,
            context={'lead': lead}
        )
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data['status']

        try:
            # Update status and updated_at (bypass full_clean for status-only changes)
            from django.utils import timezone
            Lead.objects.filter(pk=lead.pk).update(
                status=new_status,
                updated_at=timezone.now()
            )
            lead.refresh_from_db()

            return Response(LeadDetailSerializer(lead).data)
        except Exception as e:
            logger.error(f'Lead status change failed: {str(e)}')
            return Response(
                {'error': f'Failed to change status: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def convert_to_client(self, request: Request, pk=None) -> Response:
        """
        Convert a lead to a client.

        POST /leads/{id}/convert_to_client

        Creates a new Client record with the lead's data and sets:
        - Lead status to 'converted'
        - Lead.converted_client_id to the new Client's ID

        Only active leads can be converted.
        """
        lead = self.get_object()

        if lead.status != LeadStatus.ACTIVE:
            return Response(
                {'error': 'Only active leads can be converted to clients.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Import here to avoid circular imports
            from clients.models import Client, ClientStatus

            # Create client from lead data
            client = Client.objects.create(
                name=lead.name,
                phone=lead.phone,
                email=lead.email,
                source=lead.source,
                converted_from_lead=lead,
                notes=lead.intent,
                status=ClientStatus.ACTIVE,
            )

            # Link lead to client via UUID (is_terminal will return True)
            Lead.objects.filter(pk=lead.pk).update(
                converted_client_id=client.id
            )
            lead.refresh_from_db()

            return Response({
                'message': 'Lead converted to client successfully.',
                'lead': LeadDetailSerializer(lead).data,
                'client_id': str(client.id)
            })
        except ImportError:
            # Client model doesn't exist yet
            return Response(
                {'error': 'Client model not yet implemented.'},
                status=status.HTTP_501_NOT_IMPLEMENTED
            )
        except Exception as e:
            logger.error(f'Lead conversion failed: {str(e)}')
            return Response(
                {'error': f'Failed to convert lead: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def destroy(self, request: Request, pk=None) -> Response:
        """
        Delete is not allowed for leads.

        DELETE /leads/{id} - Returns 405 Method Not Allowed
        """
        return Response(
            {'error': 'Leads cannot be deleted.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )

    @action(detail=False, methods=['get'])
    def campaign_dashboard(self, request: Request) -> Response:
        """
        Get campaign lead statistics and recent activity.

        GET /leads/campaign_dashboard/

        Returns:
            - status_distribution: Count of leads by campaign_status
            - recent_leads: Last 10 leads that responded (24 hours)
            - total_leads: Total lead count
            - responding_leads: Leads with response_count > 0
            - response_rate: Percentage of leads that responded
        """
        # Status distribution
        status_counts = Lead.objects.values('campaign_status').annotate(
            count=Count('id')
        ).order_by('campaign_status')

        # Convert to dict with status labels
        status_distribution = []
        for item in status_counts:
            status_value = item['campaign_status']
            status_label = CampaignStatus(status_value).label if status_value else 'Unknown'
            status_distribution.append({
                'status': status_value,
                'label': status_label,
                'count': item['count']
            })

        # Recent leads (last 24 hours with responses)
        since = timezone.now() - timedelta(hours=24)
        recent_leads = Lead.objects.select_related(
            'source__channel'
        ).filter(
            first_response_at__gte=since
        ).order_by('-first_response_at')[:10]

        # Response rate calculation
        total_leads = Lead.objects.count()
        responding_leads = Lead.objects.filter(response_count__gt=0).count()
        response_rate = (responding_leads / total_leads * 100) if total_leads > 0 else 0

        return Response({
            'status_distribution': status_distribution,
            'recent_leads': LeadListSerializer(recent_leads, many=True).data,
            'total_leads': total_leads,
            'responding_leads': responding_leads,
            'response_rate': round(response_rate, 1)
        })

    @action(detail=True, methods=['get'])
    def journey(self, request: Request, pk=None) -> Response:
        """
        Get the complete interaction history for a lead.

        GET /leads/{id}/journey/

        Returns the lead's journey through campaign interactions,
        including button clicks, text replies, tag changes, and status changes.
        """
        lead = self.get_object()

        # Get interactions and messages (last 200 each)
        interactions = lead.interactions.order_by('-created_at')[:200]
        messages = lead.messages.order_by('-created_at')[:200]

        # Merge and sort by timestamp
        journey_items = []

        for interaction in interactions:
            journey_items.append({
                'type': 'interaction',
                'interaction_type': interaction.interaction_type,
                'content': interaction.content,
                'tag_value': interaction.tag_value,
                'template_name': interaction.template_name,
                'created_at': interaction.created_at.isoformat(),
                'metadata': interaction.metadata
            })

        for message in messages:
            journey_items.append({
                'type': 'message',
                'direction': message.direction,
                'message_type': message.message_type,
                'content': message.content,
                'status': message.status,
                'button_payload': message.button_payload,
                'created_at': message.created_at.isoformat()
            })

        # Sort by timestamp
        journey_items.sort(key=lambda x: x['created_at'])

        # Get campaign enrollments
        campaign_enrollments = []
        try:
            from campaigns.services import CampaignService
            campaign_enrollments = CampaignService.get_lead_enrollments(lead)
        except Exception as e:
            logger.warning(f'Failed to get campaign enrollments for lead {lead.id}: {e}')

        return Response({
            'lead_id': str(lead.id),
            'lead_name': lead.name,
            'lead_phone': lead.phone,
            'current_status': lead.campaign_status,
            'current_status_display': lead.get_campaign_status_display(),
            'current_tags': lead.current_tags,
            'journey': journey_items,
            'campaign_enrollments': campaign_enrollments,
            'stats': {
                'total_interactions': interactions.count(),
                'total_messages': messages.count(),
                'first_response': lead.first_response_at.isoformat() if lead.first_response_at else None,
                'last_response': lead.last_response_at.isoformat() if lead.last_response_at else None,
                'response_count': lead.response_count
            }
        })

    @action(detail=False, methods=['get'])
    def by_campaign_status(self, request: Request) -> Response:
        """
        Filter leads by campaign status.

        GET /leads/by_campaign_status/?status=qualified

        Returns paginated list of leads filtered by campaign_status.
        """
        campaign_status_param = request.query_params.get('status', '')

        queryset = self.get_queryset()
        if campaign_status_param and campaign_status_param in CampaignStatus.values:
            queryset = queryset.filter(campaign_status=campaign_status_param)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = LeadListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = LeadListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def campaign_statuses(self, request: Request) -> Response:
        """
        Get available campaign status choices.

        GET /leads/campaign_statuses/

        Returns list of campaign status options with value and label.
        """
        statuses = [
            {'value': choice.value, 'label': choice.label}
            for choice in CampaignStatus
        ]
        return Response(statuses)

    @action(detail=True, methods=['get'])
    def messages(self, request: Request, pk=None) -> Response:
        """
        Get WhatsApp messages for a specific lead (last 200).

        GET /api/leads/{lead_id}/messages/
        """
        lead = self.get_object()

        messages = list(
            LeadMessage.objects.filter(lead=lead)
            .order_by('-created_at')[:200]
        )
        messages.reverse()  # chronological order for display

        # Sync outbound statuses from YCloud (last 24h only)
        updated = sync_message_statuses(
            messages,
            status_enum=LeadMessageStatus,
            ycloud_service=ycloud_service,
            direction_outbound=MessageDirection.OUTBOUND,
            terminal_statuses={LeadMessageStatus.READ, LeadMessageStatus.FAILED},
            sent_after=timezone.now() - timedelta(hours=24),
        )
        if updated:
            LeadMessage.objects.bulk_update(updated, ['status', 'delivered_at'])

        serializer = LeadMessageSerializer(messages, many=True)

        return Response({
            'lead_id': str(lead.id),
            'lead_name': lead.name,
            'lead_phone': lead.phone,
            'messages': serializer.data,
            'count': len(messages)
        })

    @action(detail=True, methods=['post'], url_path='messages/send')
    def send_message(self, request: Request, pk=None) -> Response:
        """
        Send a WhatsApp message to a lead.

        POST /api/leads/{lead_id}/messages/send/
        Body: { "message": "Hello!" }

        Creates a LeadMessage record and sends via YCloud.
        """
        lead = self.get_object()

        message_content = request.data.get('message', '').strip()
        if not message_content:
            return Response(
                {'error': 'Message cannot be empty'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate lead has a phone number
        if not lead.phone:
            return Response(
                {'error': 'Lead does not have a phone number'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create the message record
        lead_message = LeadMessage.objects.create(
            lead=lead,
            direction=MessageDirection.OUTBOUND,
            message_type=LeadMessageType.TEXT,
            content=message_content,
            status=LeadMessageStatus.PENDING,
            from_number=ycloud_service.from_number,
            to_number=lead.phone,
        )

        # Send via YCloud
        try:
            ycloud_response = ycloud_service.send_text_message(
                to_number=lead.phone,
                message=message_content
            )

            # Update message with success
            lead_message.ycloud_message_id = ycloud_response.get('id', '')
            lead_message.status = LeadMessageStatus.SENT
            lead_message.sent_at = timezone.now()
            lead_message.save()

            # Broadcast to WebSocket
            self._broadcast_lead_message(lead, lead_message)

            return Response({
                'success': True,
                'message': LeadMessageSerializer(lead_message).data,
                'ycloud_response': ycloud_response
            }, status=status.HTTP_201_CREATED)

        except YCloudError as e:
            # Update message with failure
            lead_message.status = LeadMessageStatus.FAILED
            lead_message.save()

            logger.error(f'Failed to send WhatsApp message to lead {lead.id}: {e.message}')

            return Response({
                'success': False,
                'error': e.message,
                'message': LeadMessageSerializer(lead_message).data
            }, status=status.HTTP_502_BAD_GATEWAY)

    def _broadcast_lead_message(self, lead: Lead, message: LeadMessage) -> None:
        """Broadcast new message to WebSocket subscribers."""
        try:
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer

            channel_layer = get_channel_layer()
            if channel_layer is None:
                return

            message_data = LeadMessageSerializer(message).data

            async_to_sync(channel_layer.group_send)(
                f'lead_whatsapp_{lead.id}',
                {
                    'type': 'lead_message',
                    'message': {
                        'event': 'new_message',
                        'data': message_data
                    }
                }
            )

        except Exception as e:
            logger.error(f'Failed to broadcast lead message to WebSocket: {e}')


@csrf_exempt
@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def lead_ingest(request):
    """
    Public lead ingestion endpoint for external form providers (Pabbly, Zapier, etc.).

    POST /api/leads/ingest/
    Body:
    {
        "name": "John Doe",
        "phone": "+971501234567",
        "email": "john@example.com",    (optional)
        "mortgage_amount": 500000,          (optional)
        "source": "Mortgage Q1 2026",
        "channel": "Meta"
    }

    Rules:
    - If no Campaign record exists yet, one is auto-created.
    - A Source is auto-created under an untrusted channel named by channel
      (e.g. "WhatsApp", "Meta").
    - Duplicate phone with active lead → updates existing lead.
    - Duplicate phone with declined lead → reactivates it.
    """
    # Handle string-encoded JSON (Pabbly sometimes double-encodes)
    import json as _json
    data = request.data
    if isinstance(data, str):
        try:
            data = _json.loads(data)
        except (ValueError, TypeError):
            logger.error(f"Lead ingest: could not parse request body: {str(data)[:500]}")
            return Response({'error': 'Invalid JSON in request body.'}, status=status.HTTP_400_BAD_REQUEST)

    name = (data.get('name') or '').strip()
    phone = (data.get('phone') or '').strip()
    email = (data.get('email') or '').strip()
    campaign_name = (data.get('source') or '').strip()
    channel_name = (data.get('channel') or '').strip()
    mortgage_amount_raw = data.get('mortgage_amount')

    # --- Validation ---
    errors = {}
    if not name:
        errors['name'] = 'Name is required.'
    if not phone:
        errors['phone'] = 'Phone is required.'
    if not campaign_name:
        errors['source'] = 'source is required.'
    if not channel_name:
        errors['channel'] = 'channel is required.'

    # Parse mortgage_amount
    mortgage_amount = None
    if mortgage_amount_raw is not None and str(mortgage_amount_raw).strip():
        try:
            from decimal import Decimal, InvalidOperation
            mortgage_amount = Decimal(str(mortgage_amount_raw).strip())
            if mortgage_amount < 0:
                errors['mortgage_amount'] = 'Mortgage amount cannot be negative.'
        except (InvalidOperation, ValueError):
            errors['mortgage_amount'] = 'Invalid mortgage amount.'

    if errors:
        logger.warning(f"Lead ingest validation failed: {errors}")
        return Response({'errors': errors}, status=status.HTTP_400_BAD_REQUEST)

    # --- Find or create Campaign ---
    from campaigns.models import Campaign
    from acquisition_channels.models import Channel, Source

    campaign, _ = Campaign.objects.get_or_create(
        name=campaign_name,
        defaults={'is_active': True, 'description': f'Auto-created from lead ingest ({channel_name})'},
    )

    # --- Resolve source under an untrusted channel ---
    if campaign.source_id:
        source_id = str(campaign.source_id)
    else:
        channel, _ = Channel.objects.get_or_create(
            name=channel_name,
            defaults={'is_trusted': False, 'default_sla_minutes': 240, 'description': f'{channel_name} lead gen channel'},
        )
        if channel.is_trusted:
            return Response(
                {'error': f'Channel "{channel_name}" is trusted. Leads must go through an untrusted channel.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        source, _ = Source.objects.get_or_create(
            channel=channel,
            name=campaign_name,
        )
        campaign.source = source
        campaign.save(update_fields=['source', 'updated_at'])
        source_id = str(source.id)

    # --- Duplicate check ---
    existing_lead = LeadTrackingService.find_lead_by_phone(phone)
    if existing_lead:
        updated = []
        if name and (not existing_lead.name or existing_lead.name == 'Unknown'):
            existing_lead.name = name
            updated.append('name')
        if email and not existing_lead.email:
            existing_lead.email = email
            updated.append('email')
        if mortgage_amount is not None and not existing_lead.mortgage_amount:
            existing_lead.mortgage_amount = mortgage_amount
            updated.append('mortgage_amount')

        # Reactivate declined leads
        if existing_lead.status == LeadStatus.DECLINED:
            existing_lead.status = LeadStatus.ACTIVE
            updated.append('status')

        if updated:
            existing_lead.save(update_fields=updated + ['updated_at'])

        existing_lead.refresh_from_db()
        logger.info(f"Lead ingest duplicate: id={existing_lead.id} phone={phone} updated={updated}")
        return Response({
            'lead_id': str(existing_lead.id),
            'lead_name': existing_lead.name,
            'created_at': existing_lead.created_at.isoformat(),
            'updated_at': existing_lead.updated_at.isoformat(),
        }, status=status.HTTP_200_OK)

    # --- Create lead ---
    try:
        source_obj = Source.objects.get(id=source_id)

        lead = Lead(
            name=name,
            phone=phone,
            email=email or '',
            source=source_obj,
            mortgage_amount=mortgage_amount,
            campaign_status=CampaignStatus.SUBSCRIBER_PENDING,
            current_tags=['subscriber_pending'],
            first_response_at=timezone.now(),
            last_response_at=timezone.now(),
            response_count=0,
        )
        lead.save(force_insert=True, update_fields=None)

        LeadTrackingService.broadcast_lead_update(lead, 'new_lead')

        lead.refresh_from_db()
        logger.info(f"Lead ingested: id={lead.id} phone={phone} source={campaign_name} channel={channel_name}")
        return Response({
            'lead_id': str(lead.id),
            'lead_name': lead.name,
            'created_at': lead.created_at.isoformat(),
            'updated_at': lead.updated_at.isoformat(),
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.error(f"Lead ingest failed: phone={phone} error={str(e)}", exc_info=True)
        return Response(
            {'error': f'Failed to create lead: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@csrf_exempt
@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def lead_status(request, lead_id):
    """
    Public lead status lookup endpoint.

    GET /api/leads/status/<lead_id>/

    Returns the current status of a lead by its ID.
    """
    try:
        lead = Lead.objects.select_related('source__channel').get(id=lead_id)
    except (Lead.DoesNotExist, ValueError):
        return Response(
            {'error': 'Lead not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response({
        'lead_id': str(lead.id),
        'lead_name': lead.name,
        'phone': lead.phone,
        'status': lead.status,
        'campaign_status': lead.campaign_status,
        'campaign_status_display': lead.get_campaign_status_display(),
        'mortgage_amount': str(lead.mortgage_amount) if lead.mortgage_amount else None,
        'source': lead.source.name if lead.source else None,
        'channel': lead.source.channel.name if lead.source and lead.source.channel else None,
        'created_at': lead.created_at.isoformat(),
        'updated_at': lead.updated_at.isoformat(),
    })
