"""
Lead tracking service for WhatsApp campaign responses.

Handles:
- Lead creation/lookup from inbound messages
- Tag management and status calculation
- Interaction logging
- WebSocket broadcasting
- Dynamic campaign enrollment and tracking
"""

import logging
from django.utils import timezone
from django.db import transaction
from django.conf import settings

from leads.models import (
    Lead, LeadInteraction, LeadMessage,
    CampaignStatus, InteractionType, MessageDirection,
    LeadMessageType, LeadMessageStatus, PipelineStatus
)
from leads.constants import TAG_PRIORITY, TAG_TO_STATUS_MAP
from acquisition_channels.models import Source

logger = logging.getLogger(__name__)


def _fire_pipeline_webhook(lead_id: str, new_status: str, mortgage_amount=None) -> None:
    """
    POST pipeline status update to the partner webhook URL.
    Runs in background thread to avoid blocking the request.
    """
    import threading

    def _send():
        import requests as http_requests
        from django.conf import settings as django_settings

        webhook_url = getattr(django_settings, 'PIPELINE_WEBHOOK_URL', '')
        if not webhook_url:
            return

        payload = {
            'lead_id': str(lead_id),
            'pipeline_status': new_status,
            'mortgage_amount': str(mortgage_amount) if mortgage_amount else None,
        }

        try:
            resp = http_requests.post(webhook_url, json=payload, timeout=10)
            logger.info(
                f'Pipeline webhook sent: lead={lead_id} status={new_status} '
                f'url={webhook_url} response={resp.status_code}'
            )
        except Exception as e:
            logger.error(f'Pipeline webhook failed: lead={lead_id} url={webhook_url} error={e}')

    threading.Thread(target=_send, daemon=True).start()


def update_pipeline_status(lead_id, new_status: str) -> None:
    """
    Update the pipeline_status on a Lead record and fire webhook.

    Called from:
    - lead_ingest: submitted (default)
    - lead change_status (declined): declined
    - lead convert_to_client: contacted
    - case creation: qualified
    - case change_stage (preapproved): approved
    - case change_stage (disbursed): disbursed
    """
    try:
        Lead.objects.filter(id=lead_id).update(
            pipeline_status=new_status
        )
        logger.info(f'Pipeline status updated: lead={lead_id} status={new_status}')

        # Fire webhook to partner backend
        lead = Lead.objects.filter(id=lead_id).values('mortgage_amount').first()
        mortgage_amount = lead['mortgage_amount'] if lead else None
        _fire_pipeline_webhook(lead_id, new_status, mortgage_amount)

    except Exception as e:
        logger.error(f'Failed to update pipeline status: lead={lead_id} error={e}')


# Map case stages to pipeline statuses (only stages that have system templates)
CASE_STAGE_TO_PIPELINE = {
    'submitted_to_bank': PipelineStatus.SUBMITTED_TO_BANK,
    'preapproved': PipelineStatus.PREAPPROVED,
    'fol_received': PipelineStatus.FOL_RECEIVED,
    'disbursed': PipelineStatus.DISBURSED,
    'rejected': PipelineStatus.DECLINED,
    'not_proceeding': PipelineStatus.DECLINED,
}


def update_pipeline_from_case_stage(case) -> None:
    """
    Update pipeline_status based on case stage changes.
    Traces back: Case → Client → Lead (via converted_from_lead).
    Only fires for stages that have system templates.
    """
    pipeline_status = CASE_STAGE_TO_PIPELINE.get(case.stage)
    if not pipeline_status:
        return

    client = case.client
    lead_id = client.converted_from_lead_id
    if not lead_id:
        return

    update_pipeline_status(lead_id, pipeline_status)


def update_pipeline_from_case_created(case) -> None:
    """
    Update pipeline_status to 'qualified' when a case is created.
    Traces back: Case → Client → Lead (via converted_from_lead).
    """
    client = case.client
    if client.converted_from_lead_id:
        update_pipeline_status(client.converted_from_lead_id, PipelineStatus.QUALIFIED)


def get_campaign_service():
    """Lazy import to avoid circular imports."""
    from campaigns.services import CampaignService
    return CampaignService


class LeadTrackingService:
    """Service for tracking leads from WhatsApp campaigns."""

    @staticmethod
    def normalize_phone(phone: str) -> str:
        """Normalize phone number by keeping only digits."""
        return ''.join(c for c in phone if c.isdigit())

    @staticmethod
    def find_lead_by_phone(phone: str) -> Lead | None:
        """
        Find existing lead by phone number.
        Matches on last 10 digits to handle country code variations.
        """
        normalized = LeadTrackingService.normalize_phone(phone)
        if len(normalized) < 10:
            return None

        last_10 = normalized[-10:]
        return Lead.objects.filter(phone__endswith=last_10).first()

    @staticmethod
    def find_lead_by_ycloud_contact(ycloud_contact_id: str) -> Lead | None:
        """Find lead by YCloud contact ID."""
        if not ycloud_contact_id:
            return None
        return Lead.objects.filter(ycloud_contact_id=ycloud_contact_id).first()

    @staticmethod
    def get_default_campaign_source() -> Source:
        """
        Get the source for campaign leads.

        Priority:
        1. Source from an active campaign (configured in Campaign model)
        2. Any source from an untrusted channel
        """
        from campaigns.models import Campaign

        # Use the source configured on an active campaign
        active_campaign = Campaign.objects.filter(
            is_active=True, source__isnull=False
        ).select_related('source').first()
        if active_campaign and active_campaign.source:
            return active_campaign.source

        # Fallback: any untrusted channel source
        source = Source.objects.filter(
            channel__is_trusted=False
        ).first()

        if source:
            return source

        raise ValueError(
            'No campaign source configured. '
            'Set a source on an active Campaign, or create a source under an untrusted channel.'
        )

    @staticmethod
    def find_or_create_lead(
        phone: str,
        name: str = '',
        ycloud_contact_id: str = '',
        campaign_source_id: str = None
    ) -> tuple[Lead, bool]:
        """
        Find existing lead by phone or create new one.

        Returns:
            tuple: (Lead instance, created: bool)
        """
        # First try to find by ycloud_contact_id
        if ycloud_contact_id:
            existing_lead = LeadTrackingService.find_lead_by_ycloud_contact(ycloud_contact_id)
            if existing_lead:
                # Update with new data if provided
                updated_fields = []
                if name and (not existing_lead.name or existing_lead.name == 'Unknown'):
                    existing_lead.name = name
                    updated_fields.append('name')
                if updated_fields:
                    existing_lead.save(update_fields=updated_fields + ['updated_at'])
                return existing_lead, False

        # Then try to find by phone
        existing_lead = LeadTrackingService.find_lead_by_phone(phone)

        if existing_lead:
            # Update with new data if provided
            updated_fields = []
            if name and (not existing_lead.name or existing_lead.name == 'Unknown'):
                existing_lead.name = name
                updated_fields.append('name')
            if ycloud_contact_id and not existing_lead.ycloud_contact_id:
                existing_lead.ycloud_contact_id = ycloud_contact_id
                updated_fields.append('ycloud_contact_id')
            if updated_fields:
                existing_lead.save(update_fields=updated_fields + ['updated_at'])
            return existing_lead, False

        # Create new lead
        source = None
        if campaign_source_id:
            try:
                source = Source.objects.get(id=campaign_source_id)
            except Source.DoesNotExist:
                logger.warning(f'Source not found: {campaign_source_id}')

        if not source:
            source = LeadTrackingService.get_default_campaign_source()

        # Create lead without calling full_clean (bypass untrusted channel check for webhooks)
        lead = Lead(
            name=name or 'Unknown',
            phone=phone,
            source=source,
            ycloud_contact_id=ycloud_contact_id,
            first_response_at=timezone.now(),
            last_response_at=timezone.now(),
            response_count=1,
            current_tags=['subscriber_pending'],
            campaign_status=CampaignStatus.SUBSCRIBER_PENDING,
        )
        # Save without full_clean validation (skip untrusted channel check for webhook-created leads)
        lead.save(force_insert=True, update_fields=None)

        logger.info(f'Created new lead from campaign response: {lead.id} - {phone}')
        return lead, True

    @staticmethod
    def handle_inbound_response(
        phone: str,
        name: str,
        message_type: str,  # 'button' or 'text'
        content: str,
        ycloud_message_id: str = '',
        context_message_id: str = '',
        button_payload: str = '',
        template_name: str = '',
        ycloud_contact_id: str = '',
        campaign_source_id: str = None,
        metadata: dict = None
    ) -> Lead:
        """
        Handle an inbound campaign response (button click or text reply).

        1. Find or create lead
        2. Create LeadMessage record
        3. Create LeadInteraction record
        4. Update response tracking fields
        5. Broadcast to WebSocket
        """
        with transaction.atomic():
            # Find or create lead
            lead, created = LeadTrackingService.find_or_create_lead(
                phone=phone,
                name=name,
                ycloud_contact_id=ycloud_contact_id,
                campaign_source_id=campaign_source_id
            )

            # Determine message type enum
            if message_type == 'button':
                msg_type_enum = LeadMessageType.BUTTON
            else:
                msg_type_enum = LeadMessageType.TEXT

            # Get business phone number from settings
            business_phone = getattr(settings, 'YCLOUD_WHATSAPP_FROM_NUMBER', '')

            # Create message record
            message = LeadMessage.objects.create(
                lead=lead,
                direction=MessageDirection.INBOUND,
                message_type=msg_type_enum,
                content=content,
                status=LeadMessageStatus.DELIVERED,
                ycloud_message_id=ycloud_message_id,
                from_number=phone,
                to_number=business_phone,
                button_payload=button_payload,
                template_name=template_name,
                reply_to_message_id=context_message_id,
            )

            # Create interaction record
            interaction_type = (
                InteractionType.BUTTON_CLICK
                if message_type == 'button'
                else InteractionType.TEXT_REPLY
            )

            LeadInteraction.objects.create(
                lead=lead,
                interaction_type=interaction_type,
                ycloud_message_id=ycloud_message_id,
                original_message_id=context_message_id,
                template_name=template_name,
                content=content if message_type != 'button' else button_payload,
                metadata=metadata or {}
            )

            # Update response tracking if not newly created
            if not created:
                lead.last_response_at = timezone.now()
                lead.response_count = (lead.response_count or 0) + 1
                lead.save(update_fields=['last_response_at', 'response_count', 'updated_at'])

            # Process campaign enrollment and tracking
            try:
                CampaignService = get_campaign_service()
                if message_type == 'button':
                    CampaignService.process_button_click_for_campaigns(
                        lead=lead,
                        button_payload=button_payload,
                        template_name=template_name
                    )
                else:
                    CampaignService.process_text_reply_for_campaigns(
                        lead=lead,
                        template_name=template_name
                    )
            except Exception as e:
                # Don't fail the main response handling if campaign tracking fails
                logger.warning(f'Campaign tracking failed for lead {lead.id}: {e}')

            # Broadcast to WebSocket (lead overview updates)
            LeadTrackingService.broadcast_lead_update(lead, 'new_response')

            # Broadcast to WhatsApp chat WebSocket
            LeadTrackingService.broadcast_lead_whatsapp_message(lead, message)

            logger.info(
                f'Processed inbound response for lead {lead.id}: '
                f'{message_type} - "{content[:50]}..."'
            )

            return lead

    @staticmethod
    def handle_tag_change(
        ycloud_contact_id: str,
        phone: str,
        old_tags: list,
        new_tags: list,
        action: str,  # 'ADDED' or 'REMOVED'
        changed_tag: str
    ) -> Lead | None:
        """
        Handle tag change event from YCloud webhook.

        1. Find lead by ycloud_contact_id or phone
        2. Update current_tags
        3. Recalculate campaign_status
        4. Log interaction
        5. Broadcast update
        """
        # Find lead
        lead = None
        if ycloud_contact_id:
            lead = LeadTrackingService.find_lead_by_ycloud_contact(ycloud_contact_id)
        if not lead and phone:
            lead = LeadTrackingService.find_lead_by_phone(phone)

        if not lead:
            logger.warning(
                f'Lead not found for tag change: '
                f'ycloud_contact_id={ycloud_contact_id}, phone={phone}'
            )
            return None

        with transaction.atomic():
            # Store old status for comparison
            old_status = lead.campaign_status

            # Update tags
            lead.current_tags = new_tags

            # Recalculate status
            lead.campaign_status = lead.calculate_campaign_status()

            lead.save(update_fields=['current_tags', 'campaign_status', 'updated_at'])

            # Log tag change interaction
            interaction_type = (
                InteractionType.TAG_ADDED
                if action == 'ADDED'
                else InteractionType.TAG_REMOVED
            )

            LeadInteraction.objects.create(
                lead=lead,
                interaction_type=interaction_type,
                tag_value=changed_tag,
                metadata={
                    'old_tags': old_tags,
                    'new_tags': new_tags,
                    'old_status': old_status,
                    'new_status': lead.campaign_status
                }
            )

            # Log status change if it changed
            if old_status != lead.campaign_status:
                LeadInteraction.objects.create(
                    lead=lead,
                    interaction_type=InteractionType.STATUS_CHANGE,
                    metadata={
                        'old_status': old_status,
                        'new_status': lead.campaign_status,
                        'triggered_by_tag': changed_tag
                    }
                )

                logger.info(
                    f'Lead {lead.id} status changed: {old_status} -> {lead.campaign_status} '
                    f'(triggered by tag: {changed_tag})'
                )

            # Auto-discover tag if not in database (creates campaign if needed)
            try:
                from campaigns.discovery import CampaignDiscoveryService
                CampaignDiscoveryService.ensure_tag_exists(changed_tag)
            except Exception as e:
                logger.warning(f'Tag auto-discovery failed for {changed_tag}: {e}')

            # Process campaign enrollment and tracking
            try:
                CampaignService = get_campaign_service()
                CampaignService.process_tag_change_for_campaigns(
                    lead=lead,
                    changed_tag=changed_tag,
                    action=action
                )
            except Exception as e:
                # Don't fail the main tag handling if campaign tracking fails
                logger.warning(f'Campaign tracking failed for lead {lead.id}: {e}')

            # Broadcast
            LeadTrackingService.broadcast_lead_update(lead, 'tag_change')

            return lead

    @staticmethod
    def broadcast_lead_update(lead: Lead, event_type: str) -> None:
        """Broadcast lead update to WebSocket subscribers."""
        try:
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer

            channel_layer = get_channel_layer()
            if channel_layer is None:
                logger.debug('No channel layer configured, skipping WebSocket broadcast')
                return

            # Prepare lead data
            lead_data = {
                'id': str(lead.id),
                'name': lead.name,
                'phone': lead.phone,
                'campaign_status': lead.campaign_status,
                'current_tags': lead.current_tags,
                'response_count': lead.response_count,
                'last_response_at': lead.last_response_at.isoformat() if lead.last_response_at else None,
            }

            # Broadcast to specific lead channel
            async_to_sync(channel_layer.group_send)(
                f'leads_{lead.id}',
                {
                    'type': 'lead_update',
                    'event': event_type,
                    'lead': lead_data
                }
            )

            # Also broadcast to campaign dashboard subscribers
            async_to_sync(channel_layer.group_send)(
                'campaign_leads',
                {
                    'type': 'lead_update',
                    'event': event_type,
                    'lead': lead_data
                }
            )

            logger.debug(f'Broadcasted lead update: {lead.id} - {event_type}')

        except Exception as e:
            logger.error(f'Failed to broadcast lead update: {e}')

    @staticmethod
    def broadcast_lead_whatsapp_message(lead: Lead, message: 'LeadMessage') -> None:
        """Broadcast new message to WhatsApp chat WebSocket subscribers."""
        try:
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer
            from leads.serializers import LeadMessageSerializer

            channel_layer = get_channel_layer()
            if channel_layer is None:
                logger.debug('No channel layer configured, skipping WhatsApp broadcast')
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

            logger.debug(f'Broadcasted WhatsApp message {message.id} to lead_whatsapp_{lead.id}')

        except Exception as e:
            logger.error(f'Failed to broadcast lead WhatsApp message: {e}')
