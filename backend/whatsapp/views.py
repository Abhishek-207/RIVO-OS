"""
API views for WhatsApp messaging.
"""

import logging
from datetime import timedelta
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from common.ycloud_sync import sync_message_statuses
from users.permissions import IsAuthenticated

from clients.models import Client
from .models import WhatsAppMessage, MessageDirection, MessageStatus, MessageType
from .serializers import WhatsAppMessageSerializer, SendMessageSerializer
from .services import ycloud_service, YCloudError, verify_webhook_signature

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_client_messages(request, client_id):
    """
    Get all WhatsApp messages for a specific client.
    Syncs delivery/read status from YCloud for outbound messages.

    GET /api/whatsapp/messages/{client_id}/
    """
    try:
        client = Client.objects.get(pk=client_id)
    except Client.DoesNotExist:
        return Response(
            {'error': 'Client not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    messages = list(
        WhatsAppMessage.objects.filter(client=client)
        .order_by('-created_at')[:200]
    )
    messages.reverse()  # chronological order for display

    # Sync outbound statuses from YCloud
    updated = sync_message_statuses(
        messages,
        status_enum=MessageStatus,
        ycloud_service=ycloud_service,
        direction_outbound=MessageDirection.OUTBOUND,
        terminal_statuses={MessageStatus.READ, MessageStatus.FAILED},
        sent_after=timezone.now() - timedelta(hours=24),
    )
    for msg in updated:
        msg.save()

    serializer = WhatsAppMessageSerializer(messages, many=True)

    return Response({
        'client_id': str(client_id),
        'client_name': client.name,
        'client_phone': client.phone,
        'messages': serializer.data,
        'count': len(messages)
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_message(request):
    """
    Send a WhatsApp message to a client.

    POST /api/whatsapp/send/
    Body: { "client_id": "uuid", "message": "Hello!" }
    """
    serializer = SendMessageSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    client_id = serializer.validated_data['client_id']
    message_content = serializer.validated_data['message']

    # Get the client
    try:
        client = Client.objects.get(pk=client_id)
    except Client.DoesNotExist:
        return Response(
            {'error': 'Client not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Validate client has a phone number
    if not client.phone:
        return Response(
            {'error': 'Client does not have a phone number'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Create the message record
    whatsapp_message = WhatsAppMessage.objects.create(
        client=client,
        direction=MessageDirection.OUTBOUND,
        content=message_content,
        status=MessageStatus.PENDING,
        from_number=ycloud_service.from_number,
        to_number=client.phone,
        sent_by=request.user if hasattr(request, 'user') else None,
    )

    # Send via YCloud
    try:
        ycloud_response = ycloud_service.send_text_message(
            to_number=client.phone,
            message=message_content
        )

        # Update message with success
        whatsapp_message.ycloud_message_id = ycloud_response.get('id', '')
        whatsapp_message.status = MessageStatus.SENT
        whatsapp_message.sent_at = timezone.now()
        whatsapp_message.save()

        return Response({
            'success': True,
            'message': WhatsAppMessageSerializer(whatsapp_message).data,
            'ycloud_response': ycloud_response
        }, status=status.HTTP_201_CREATED)

    except YCloudError as e:
        # Update message with failure
        whatsapp_message.status = MessageStatus.FAILED
        whatsapp_message.error_message = e.message
        whatsapp_message.save()

        logger.error(f'Failed to send WhatsApp message to client {client_id}: {e.message}')

        return Response({
            'success': False,
            'error': e.message,
            'message': WhatsAppMessageSerializer(whatsapp_message).data
        }, status=status.HTTP_502_BAD_GATEWAY)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_template_message(request):
    """
    Send a WhatsApp template message to a client.
    Use this for initial contact (before 24-hour window is open).

    POST /api/whatsapp/send-template/
    Body: {
        "client_id": "uuid",
        "template_name": "my_segmentation_v1",
        "language_code": "en" (optional, default: en)
    }
    """
    client_id = request.data.get('client_id')
    template_name = request.data.get('template_name')
    language_code = request.data.get('language_code', 'en')

    if not client_id or not template_name:
        return Response(
            {'error': 'client_id and template_name are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get the client
    try:
        client = Client.objects.get(pk=client_id)
    except Client.DoesNotExist:
        return Response(
            {'error': 'Client not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Validate client has a phone number
    if not client.phone:
        return Response(
            {'error': 'Client does not have a phone number'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Create the message record
    whatsapp_message = WhatsAppMessage.objects.create(
        client=client,
        direction=MessageDirection.OUTBOUND,
        message_type=MessageType.TEMPLATE,
        content=f'[Template: {template_name}]',
        status=MessageStatus.PENDING,
        from_number=ycloud_service.from_number,
        to_number=client.phone,
        sent_by=request.user if hasattr(request, 'user') else None,
    )

    # Send via YCloud
    try:
        ycloud_response = ycloud_service.send_template_message(
            to_number=client.phone,
            template_name=template_name,
            language_code=language_code
        )

        # Update message with success
        whatsapp_message.ycloud_message_id = ycloud_response.get('id', '')
        whatsapp_message.status = MessageStatus.SENT
        whatsapp_message.sent_at = timezone.now()
        whatsapp_message.save()

        return Response({
            'success': True,
            'message': WhatsAppMessageSerializer(whatsapp_message).data,
            'ycloud_response': ycloud_response
        }, status=status.HTTP_201_CREATED)

    except YCloudError as e:
        # Update message with failure
        whatsapp_message.status = MessageStatus.FAILED
        whatsapp_message.error_message = e.message
        whatsapp_message.save()

        logger.error(f'Failed to send WhatsApp template to client {client_id}: {e.message}')

        return Response({
            'success': False,
            'error': e.message,
            'message': WhatsAppMessageSerializer(whatsapp_message).data
        }, status=status.HTTP_502_BAD_GATEWAY)


@csrf_exempt
@api_view(['GET', 'POST'])
@permission_classes([])  # No auth - YCloud calls this endpoint
def webhook(request):
    """
    YCloud webhook for receiving inbound WhatsApp messages and status updates.

    GET /api/whatsapp/webhook/ - For URL validation by YCloud
    POST /api/whatsapp/webhook/ - For receiving webhook events

    Events handled:
    - whatsapp.inbound_message.received: Customer sends a message
    - whatsapp.message.updated: Message status updates (delivered, read, etc.)
    - contact.attributes_changed: Contact tag changes
    """
    # Handle GET request for YCloud URL validation
    if request.method == 'GET':
        return Response({'status': 'ok'}, status=status.HTTP_200_OK)

    # Verify webhook signature (if secret is configured)
    signature_header = request.headers.get('YCloud-Signature', '')
    if not verify_webhook_signature(request.body, signature_header):
        logger.warning('Webhook signature verification failed')
        # Still process for now, but log the warning
        # In production, you may want to reject: return Response(status=status.HTTP_401_UNAUTHORIZED)

    try:
        payload = request.data
        event_type = payload.get('type', '')

        if event_type == 'whatsapp.inbound_message.received':
            return handle_inbound_message(payload)
        elif event_type == 'whatsapp.message.updated':
            return handle_message_status_update(payload)
        elif event_type == 'contact.attributes_changed':
            return handle_contact_attributes_changed(payload)
        else:
            return Response({'status': 'ignored'}, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f'Webhook processing error: {str(e)}')
        # Always return 200 to prevent YCloud from retrying
        return Response({'status': 'error', 'message': str(e)}, status=status.HTTP_200_OK)


def handle_inbound_message(payload):
    """
    Handle incoming WhatsApp message from customer.

    Payload structure:
    {
      "id": "evt_xxx",
      "type": "whatsapp.inbound_message.received",
      "whatsappInboundMessage": {
        "id": "wim123",
        "from": "+917700098657",
        "to": "+918138020960",
        "customerProfile": {"name": "John"},
        "sendTime": "2026-01-19T12:00:00.000Z",
        "type": "text",
        "text": {"body": "Hello!"},
        "button": {"payload": "JOIN", "text": "I'm in"},  # For button clicks
        "context": {"from": "+918138020960", "id": "wamid.original..."}  # For replies
      }
    }
    """
    inbound_msg = payload.get('whatsappInboundMessage', {})

    from_number = inbound_msg.get('from', '')
    to_number = inbound_msg.get('to', '')
    message_type = inbound_msg.get('type', 'text')
    ycloud_message_id = inbound_msg.get('id', '')
    send_time = inbound_msg.get('sendTime')
    customer_profile = inbound_msg.get('customerProfile', {})
    customer_name = customer_profile.get('name', '')

    # Extract context for replies (links to original campaign message)
    context = inbound_msg.get('context', {})
    context_message_id = context.get('id', '')

    # Extract button payload if it's a button click
    button_data = inbound_msg.get('button', {})
    button_payload = button_data.get('payload', '')
    button_text = button_data.get('text', '')

    # Extract message content based on type
    if message_type == 'text':
        content = inbound_msg.get('text', {}).get('body', '')
    elif message_type == 'button':
        content = button_text or button_payload
    elif message_type == 'image':
        content = '[Image]'
    elif message_type == 'document':
        content = '[Document]'
    elif message_type == 'audio':
        content = '[Audio]'
    elif message_type == 'video':
        content = '[Video]'
    else:
        content = f'[{message_type}]'

    # Find client by phone number (normalize phone number for matching)
    normalized_phone = normalize_phone_for_lookup(from_number)
    client = find_client_by_phone(normalized_phone)

    if not client:
        # No client found - handle as a LEAD (campaign response)
        return handle_lead_inbound_response(
            from_number=from_number,
            customer_name=customer_name,
            message_type=message_type,
            content=content,
            ycloud_message_id=ycloud_message_id,
            context_message_id=context_message_id,
            button_payload=button_payload,
            raw_payload=inbound_msg
        )

    # Check for duplicate message
    if WhatsAppMessage.objects.filter(ycloud_message_id=ycloud_message_id).exists():
        return Response({'status': 'duplicate'}, status=status.HTTP_200_OK)

    # Create the message record for existing client
    whatsapp_message = WhatsAppMessage.objects.create(
        client=client,
        direction=MessageDirection.INBOUND,
        content=content,
        status=MessageStatus.DELIVERED,  # Inbound messages are already delivered
        ycloud_message_id=ycloud_message_id,
        from_number=from_number,
        to_number=to_number,
        sent_at=parse_datetime(send_time) if send_time else timezone.now(),
        delivered_at=timezone.now(),
    )

    # Broadcast to WebSocket for real-time update
    broadcast_message_to_websocket(client.id, whatsapp_message)

    return Response({
        'status': 'success',
        'type': 'client',
        'message_id': str(whatsapp_message.id)
    }, status=status.HTTP_200_OK)


def handle_lead_inbound_response(
    from_number: str,
    customer_name: str,
    message_type: str,
    content: str,
    ycloud_message_id: str,
    context_message_id: str,
    button_payload: str,
    raw_payload: dict
):
    """
    Handle inbound message as a lead campaign response.

    This is called when no existing client matches the phone number,
    indicating this is a new lead responding to a WhatsApp campaign.
    """
    from leads.services import LeadTrackingService
    from leads.models import LeadMessage
    from campaigns.models import CampaignTemplate
    from acquisition_channels.models import Channel, Source

    # Check if lead already exists — always process existing leads
    existing_lead = LeadTrackingService.find_lead_by_phone(from_number)

    campaign_source_id = None

    if not existing_lead:
        # New lead — only accept if the message is a reply to a registered campaign template
        matched_campaign = None
        if context_message_id:
            # Look up the original outbound message to get the template name
            original_msg = LeadMessage.objects.filter(
                ycloud_message_id=context_message_id
            ).first()
            if original_msg and original_msg.template_name:
                campaign_tpl = CampaignTemplate.objects.filter(
                    template_name=original_msg.template_name,
                    campaign__is_active=True,
                    campaign__name__startswith='Mortgage'
                ).select_related('campaign').first()
                if campaign_tpl:
                    matched_campaign = campaign_tpl.campaign

        if not matched_campaign:
            return Response(
                {'status': 'ignored', 'reason': 'no matching campaign'},
                status=status.HTTP_200_OK
            )

        # Auto-create source under "WhatsApp" channel using the campaign name
        if matched_campaign.source_id:
            campaign_source_id = str(matched_campaign.source_id)
        else:
            whatsapp_channel, _ = Channel.objects.get_or_create(
                name='WhatsApp',
                defaults={'is_trusted': False}
            )
            source, _ = Source.objects.get_or_create(
                channel=whatsapp_channel,
                name=matched_campaign.name,
            )
            # Save the source back to the campaign for future use
            matched_campaign.source = source
            matched_campaign.save(update_fields=['source', 'updated_at'])
            campaign_source_id = str(source.id)

    # Check for duplicate in lead messages
    if LeadMessage.objects.filter(ycloud_message_id=ycloud_message_id).exists():
        return Response({'status': 'duplicate', 'type': 'lead'}, status=status.HTTP_200_OK)

    try:
        # Process as lead campaign response
        lead = LeadTrackingService.handle_inbound_response(
            phone=from_number,
            name=customer_name,
            message_type='button' if message_type == 'button' else 'text',
            content=content,
            ycloud_message_id=ycloud_message_id,
            context_message_id=context_message_id,
            button_payload=button_payload,
            campaign_source_id=campaign_source_id,
            metadata={'raw_payload': raw_payload}
        )

        return Response({
            'status': 'success',
            'type': 'lead',
            'lead_id': str(lead.id),
            'lead_name': lead.name
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f'Failed to process lead inbound response: {e}')
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_200_OK)


def handle_contact_attributes_changed(payload):
    """
    Handle YCloud contact.attributes_changed webhook event.

    Processes tag changes and updates lead campaign status.

    Payload structure:
    {
      "id": "evt_xxx",
      "type": "contact.attributes_changed",
      "contact": {
        "id": "cont_xxx",
        "phoneNumber": "+971501234567",
        "countryCode": "AE"
      },
      "changedAttributes": {
        "tags": {
          "oldValue": ["subscriber_pending"],
          "newValue": ["subscriber_pending", "qualified"],
          "extra": {
            "action": "ADDED",
            "tagId": "tag_xxx",
            "tagName": "qualified"
          }
        }
      }
    }
    """
    from leads.services import LeadTrackingService

    contact = payload.get('contact', {})
    ycloud_contact_id = contact.get('id', '')
    phone = contact.get('phoneNumber', '')

    changed_attrs = payload.get('changedAttributes', {})
    tags_change = changed_attrs.get('tags', {})

    if not tags_change:
        return Response({'status': 'ignored', 'reason': 'no tag change'}, status=status.HTTP_200_OK)

    old_tags = tags_change.get('oldValue', [])
    new_tags = tags_change.get('newValue', [])
    extra = tags_change.get('extra', {})

    # Handle both single tag change and multiple tag changes
    if isinstance(extra, list):
        # Multiple tag changes
        for change in extra:
            action = change.get('action', 'UNKNOWN')
            changed_tag = change.get('tagName', '') or change.get('value', '')
            _process_tag_change(ycloud_contact_id, phone, old_tags, new_tags, action, changed_tag)
    else:
        # Single tag change
        action = extra.get('action', 'UNKNOWN')
        changed_tag = extra.get('tagName', '') or extra.get('value', '')
        _process_tag_change(ycloud_contact_id, phone, old_tags, new_tags, action, changed_tag)

    return Response({
        'status': 'success',
        'phone': phone,
        'new_tags': new_tags
    }, status=status.HTTP_200_OK)


def _process_tag_change(ycloud_contact_id, phone, old_tags, new_tags, action, changed_tag):
    """Process a single tag change."""
    from leads.services import LeadTrackingService

    lead = LeadTrackingService.handle_tag_change(
        ycloud_contact_id=ycloud_contact_id,
        phone=phone,
        old_tags=old_tags,
        new_tags=new_tags,
        action=action,
        changed_tag=changed_tag
    )

    if not lead:
        logger.warning(f'Lead not found for tag change: {phone}')


def handle_message_status_update(payload):
    """
    Handle message status update (delivered, read, failed).

    This updates existing outbound messages with delivery status.
    """
    message_data = payload.get('whatsappMessage', {})
    ycloud_message_id = message_data.get('id', '')
    new_status = message_data.get('status', '').lower()

    if not ycloud_message_id:
        return Response({'status': 'ignored'}, status=status.HTTP_200_OK)

    try:
        message = WhatsAppMessage.objects.get(ycloud_message_id=ycloud_message_id)

        status_map = {
            'sent': MessageStatus.SENT,
            'delivered': MessageStatus.DELIVERED,
            'read': MessageStatus.READ,
            'failed': MessageStatus.FAILED,
        }

        if new_status in status_map:
            message.status = status_map[new_status]
            if new_status == 'delivered':
                message.delivered_at = timezone.now()
            if new_status == 'failed':
                error_info = message_data.get('error', {})
                error_msg = error_info.get('message', '') if isinstance(error_info, dict) else str(error_info)
                message.error_message = error_msg
                logger.error(f'WhatsApp message {ycloud_message_id} delivery failed: {error_msg} | full_error={error_info}')
            message.save()

        return Response({'status': 'success'}, status=status.HTTP_200_OK)

    except WhatsAppMessage.DoesNotExist:
        logger.warning(f'Message not found for status update: {ycloud_message_id}')
        return Response({'status': 'not_found'}, status=status.HTTP_200_OK)


def normalize_phone_for_lookup(phone: str) -> str:
    """
    Normalize phone number for database lookup.
    Uses the centralized phone normalizer for consistent formatting.
    """
    from common.phone import normalize_phone
    return normalize_phone(phone)


def find_client_by_phone(phone: str):
    """
    Find a client by phone number.
    Tries exact match on the full normalized number first,
    then falls back to local-digits matching for legacy data.
    """
    from common.phone import normalize_phone
    normalized = normalize_phone(phone)

    # Exact match (preferred — includes country code)
    client = Client.objects.filter(phone=normalized).first()
    if client:
        return client

    # Fallback: match on local digits
    digits_only = ''.join(c for c in phone if c.isdigit())
    if len(digits_only) >= 9:
        last_9 = digits_only[-9:]
        client = Client.objects.filter(phone__endswith=last_9).first()
        if client:
            return client

    return None


def broadcast_message_to_websocket(client_id, whatsapp_message):
    """
    Broadcast a new WhatsApp message to connected WebSocket clients.

    This sends the message to all users viewing the WhatsApp tab for this client.
    """
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer

        channel_layer = get_channel_layer()
        if channel_layer is None:
            logger.warning('Channel layer not available for WebSocket broadcast')
            return

        # Serialize the message
        message_data = WhatsAppMessageSerializer(whatsapp_message).data

        # Broadcast to the client-specific group
        async_to_sync(channel_layer.group_send)(
            f'whatsapp_{client_id}',
            {
                'type': 'whatsapp_message',
                'message': message_data
            }
        )

    except Exception as e:
        logger.error(f'Failed to broadcast to WebSocket: {e}')
