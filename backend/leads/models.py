"""
Lead model for Rivo OS Mortgage Journey Management.

Leads are prospective clients from untrusted channels that need to be verified
for real identity and real intent before conversion to Clients.
"""

import uuid
from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from audit.models import AuditableModel
from acquisition_channels.models import Source
from common.sla import format_sla_duration


class LeadStatus(models.TextChoices):
    """
    Allowed status values for Lead records.

    ACTIVE: Lead is being worked on
    DECLINED: Lead was declined (no real intent)
    """
    ACTIVE = 'active', 'Active'
    DECLINED = 'declined', 'Declined'


class CampaignStatus(models.TextChoices):
    """
    Campaign-specific status values derived from YCloud tags.
    Ordered by priority (lowest to highest).
    """
    SUBSCRIBER_PENDING = 'subscriber_pending', 'Subscriber Pending'
    # Segment tags
    SEGMENT_MORTGAGED = 'segment_mortgaged', 'Mortgaged'
    SEGMENT_RENTING = 'segment_renting', 'Renting'
    SEGMENT_OTHER = 'segment_other', 'Other Segment'
    # Locale tags
    LOCALE_DUBAI = 'locale_dubai', 'Dubai'
    LOCALE_ABU_DHABI = 'locale_abudhabi', 'Abu Dhabi'
    LOCALE_OTHER = 'locale_other', 'Other Locale'
    # Qualification
    QUALIFIED = 'qualified', 'Qualified'
    DISQUALIFIED = 'disqualified', 'Disqualified'
    # Terminal
    CONVERTED = 'converted', 'Converted'


class Lead(AuditableModel):
    """
    Lead model for tracking prospective clients from untrusted channels.

    Leads must be verified for real identity and intent before being
    converted to Clients. They can only be created from untrusted channels.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text='Unique identifier for the lead'
    )

    name = models.CharField(
        max_length=255,
        help_text='Full name of the lead'
    )

    phone = models.CharField(
        max_length=20,
        help_text='Phone number of the lead'
    )

    email = models.EmailField(
        max_length=255,
        blank=True,
        default='',
        help_text='Email address (optional)'
    )

    source = models.ForeignKey(
        Source,
        on_delete=models.PROTECT,
        related_name='leads',
        help_text='Source this lead came from (must be untrusted channel)'
    )

    intent = models.TextField(
        blank=True,
        default='',
        help_text='Notes about the lead intent (optional)'
    )

    status = models.CharField(
        max_length=20,
        choices=LeadStatus.choices,
        default=LeadStatus.ACTIVE,
        help_text='Current status of the lead'
    )

    # Store converted_client_id as UUID for now
    # Will be converted to FK when clients app is created
    converted_client_id = models.UUIDField(
        null=True,
        blank=True,
        help_text='Client record ID created when lead was converted'
    )

    # YCloud Integration Fields
    ycloud_contact_id = models.CharField(
        max_length=255,
        blank=True,
        default='',
        db_index=True,
        help_text='YCloud contact ID for this lead'
    )

    # Tag-based Campaign Status Tracking
    current_tags = models.JSONField(
        default=list,
        blank=True,
        help_text='Current list of YCloud tags assigned to this lead'
    )

    campaign_status = models.CharField(
        max_length=50,
        choices=CampaignStatus.choices,
        default=CampaignStatus.SUBSCRIBER_PENDING,
        help_text='Derived campaign status from tags (highest priority)'
    )

    # Response Tracking
    first_response_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the lead first responded to a campaign'
    )

    last_response_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the lead last responded'
    )

    response_count = models.PositiveIntegerField(
        default=0,
        help_text='Total number of responses from this lead'
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text='Timestamp when lead was created'
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        help_text='Timestamp when lead was last updated'
    )

    class Meta:
        db_table = 'leads'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status'], name='leads_status_idx'),
            models.Index(fields=['source'], name='leads_source_idx'),
            models.Index(fields=['created_at'], name='leads_created_at_idx'),
            models.Index(fields=['campaign_status'], name='leads_campaign_status_idx'),
            models.Index(fields=['ycloud_contact_id'], name='leads_ycloud_contact_idx'),
            models.Index(fields=['phone'], name='leads_phone_idx'),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.phone})"

    def clean(self) -> None:
        """Validate model fields."""
        super().clean()

        # Validate status is a valid choice
        if self.status and self.status not in LeadStatus.values:
            raise ValidationError({
                'status': f'Invalid status. Must be one of: {", ".join(LeadStatus.values)}'
            })

        # Validate source belongs to an untrusted channel
        if self.source_id:
            try:
                source = self.source
                if source.channel.is_trusted:
                    raise ValidationError({
                        'source': 'Leads can only be created from untrusted channels. '
                                 f'Channel "{source.channel.name}" is trusted.'
                    })
            except Source.DoesNotExist:
                raise ValidationError({
                    'source': 'Source does not exist.'
                })

    def save(self, *args, **kwargs) -> None:
        """Run full clean before saving."""
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def sla_minutes(self) -> int | None:
        """Get effective SLA in minutes from the channel cascade."""
        if self.source:
            return self.source.effective_sla_minutes
        return None

    @property
    def sla_deadline(self) -> timezone.datetime | None:
        """Calculate SLA deadline timestamp."""
        sla = self.sla_minutes
        if sla is None:
            return None
        return self.created_at + timedelta(minutes=sla)

    @property
    def sla_timer(self) -> dict:
        """
        Calculate SLA timer status.

        Returns:
            dict with keys:
                - remaining_minutes: Minutes until deadline (negative if overdue)
                - is_overdue: Boolean indicating if SLA is breached
                - display: Human-readable string (e.g., "2h 30m", "Overdue by 1h 15m")
        """
        # SLA stops when lead is in terminal state (declined or converted)
        if self.is_terminal:
            return {
                'remaining_minutes': None,
                'is_overdue': False,
                'display': 'Completed'
            }

        deadline = self.sla_deadline
        if deadline is None:
            return {
                'remaining_minutes': None,
                'is_overdue': False,
                'display': 'No SLA'
            }

        now = timezone.now()
        remaining = deadline - now
        remaining_minutes = int(remaining.total_seconds() / 60)
        is_overdue = remaining_minutes < 0

        if is_overdue:
            display = format_sla_duration(abs(remaining_minutes), 'overdue')
        else:
            display = format_sla_duration(remaining_minutes, 'remaining')

        return {
            'remaining_minutes': remaining_minutes,
            'is_overdue': is_overdue,
            'display': display
        }

    @property
    def is_terminal(self) -> bool:
        """Check if lead is in a terminal state (declined or converted)."""
        return self.status == LeadStatus.DECLINED or self.converted_client_id is not None

    def calculate_campaign_status(self) -> str:
        """
        Calculate campaign status from current_tags based on priority hierarchy.
        Returns the status corresponding to the highest priority tag present.
        """
        from leads.constants import TAG_PRIORITY, TAG_TO_STATUS_MAP

        if not self.current_tags:
            return CampaignStatus.SUBSCRIBER_PENDING

        highest_priority = 0
        highest_tag = None

        for tag in self.current_tags:
            tag_lower = tag.lower()
            priority = TAG_PRIORITY.get(tag_lower, 0)
            if priority > highest_priority:
                highest_priority = priority
                highest_tag = tag_lower

        if highest_tag and highest_tag in TAG_TO_STATUS_MAP:
            return TAG_TO_STATUS_MAP[highest_tag]

        return CampaignStatus.SUBSCRIBER_PENDING

    def update_campaign_status(self) -> None:
        """Recalculate and save campaign status based on current tags."""
        self.campaign_status = self.calculate_campaign_status()
        self.save(update_fields=['campaign_status', 'updated_at'])


class InteractionType(models.TextChoices):
    """Types of lead interactions."""
    TEMPLATE_SENT = 'template_sent', 'Template Sent'
    BUTTON_CLICK = 'button_click', 'Button Click'
    TEXT_REPLY = 'text_reply', 'Text Reply'
    TAG_ADDED = 'tag_added', 'Tag Added'
    TAG_REMOVED = 'tag_removed', 'Tag Removed'
    STATUS_CHANGE = 'status_change', 'Status Change'


class LeadInteraction(models.Model):
    """
    Tracks each interaction/touchpoint in a lead's campaign journey.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    lead = models.ForeignKey(
        Lead,
        on_delete=models.CASCADE,
        related_name='interactions',
        help_text='Lead this interaction belongs to'
    )

    interaction_type = models.CharField(
        max_length=20,
        choices=InteractionType.choices,
        help_text='Type of interaction'
    )

    # Message context
    ycloud_message_id = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='YCloud message ID (for replies)'
    )

    original_message_id = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='ID of the message being replied to (context.id)'
    )

    template_name = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='Template name if template_sent or reply to template'
    )

    # Content
    content = models.TextField(
        blank=True,
        default='',
        help_text='Message content or button payload'
    )

    # Tag change details
    tag_value = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text='Tag value for tag_added/tag_removed interactions'
    )

    # Metadata
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional event data from webhook'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lead_interactions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['lead', 'created_at'], name='lead_interaction_idx'),
            models.Index(fields=['interaction_type'], name='lead_interaction_type_idx'),
        ]

    def __str__(self) -> str:
        return f"{self.lead.name} - {self.interaction_type} at {self.created_at}"


class MessageDirection(models.TextChoices):
    """Direction of WhatsApp message."""
    OUTBOUND = 'outbound', 'Outbound'
    INBOUND = 'inbound', 'Inbound'


class LeadMessageType(models.TextChoices):
    """Type of WhatsApp message."""
    TEXT = 'text', 'Text'
    TEMPLATE = 'template', 'Template'
    BUTTON = 'button', 'Button'
    IMAGE = 'image', 'Image'
    DOCUMENT = 'document', 'Document'


class LeadMessageStatus(models.TextChoices):
    """Status of WhatsApp message delivery."""
    PENDING = 'pending', 'Pending'
    SENT = 'sent', 'Sent'
    DELIVERED = 'delivered', 'Delivered'
    READ = 'read', 'Read'
    FAILED = 'failed', 'Failed'


class LeadMessage(models.Model):
    """
    WhatsApp messages associated with leads (before conversion to client).
    Mirrors WhatsAppMessage structure but with Lead FK instead of Client.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    lead = models.ForeignKey(
        Lead,
        on_delete=models.CASCADE,
        related_name='messages',
        help_text='Lead this message is associated with'
    )

    direction = models.CharField(
        max_length=10,
        choices=MessageDirection.choices
    )

    message_type = models.CharField(
        max_length=20,
        choices=LeadMessageType.choices
    )

    content = models.TextField(
        help_text='Message content/body'
    )

    status = models.CharField(
        max_length=20,
        choices=LeadMessageStatus.choices,
        default=LeadMessageStatus.PENDING
    )

    ycloud_message_id = models.CharField(
        max_length=255,
        blank=True,
        default=''
    )

    from_number = models.CharField(max_length=20)
    to_number = models.CharField(max_length=20)

    # Button-specific fields
    button_payload = models.CharField(
        max_length=255,
        blank=True,
        default=''
    )

    # Template-specific fields
    template_name = models.CharField(
        max_length=255,
        blank=True,
        default=''
    )

    # Context for replies
    reply_to_message_id = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='YCloud message ID this is a reply to'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'lead_messages'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['lead', 'created_at'], name='lead_msg_idx'),
            models.Index(fields=['ycloud_message_id'], name='lead_msg_ycloud_idx'),
        ]

    def __str__(self) -> str:
        return f"{self.direction} {self.message_type} to {self.lead.name}"
