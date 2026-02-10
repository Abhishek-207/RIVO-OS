"""
Campaign models for dynamic WhatsApp campaign management.

These models allow campaigns to be configured in Rivo with their
templates, journeys, chatbot flows, and tags - no code changes needed
for new campaigns.
"""

import uuid
from django.db import models
from django.utils import timezone


class Campaign(models.Model):
    """
    A YCloud WhatsApp campaign with its configuration.

    When you create a campaign in YCloud, register it in Rivo with
    its templates, journeys, and tags. When leads respond, the system
    automatically tracks which campaign they're in.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    # YCloud reference (optional - for linking to YCloud campaign)
    ycloud_campaign_id = models.CharField(
        max_length=255,
        blank=True,
        help_text='YCloud campaign ID for reference'
    )

    # Source for attribution (links to acquisition channel)
    source = models.ForeignKey(
        'acquisition_channels.Source',
        on_delete=models.SET_NULL,
        related_name='campaigns',
        null=True,
        blank=True,
        help_text='Attribution source for leads from this campaign'
    )

    # Auto-discovery tracking
    is_auto_discovered = models.BooleanField(
        default=False,
        help_text='True if this campaign was auto-discovered from YCloud'
    )
    last_synced_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Last time this campaign was synced from YCloud'
    )

    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_campaigns'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Campaign'
        verbose_name_plural = 'Campaigns'

    def __str__(self):
        return self.name

    @property
    def enrollment_count(self):
        """Number of leads enrolled in this campaign."""
        return self.enrollments.count()

    @property
    def active_enrollments_count(self):
        """Number of active (non-completed) enrollments."""
        return self.enrollments.exclude(
            status__in=['completed', 'dropped']
        ).count()


class CampaignTemplate(models.Model):
    """
    A template used in a campaign (YCloud template name).

    Register all templates that are part of a campaign's journey.
    This allows the system to identify which campaign a response
    belongs to based on the template used.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign = models.ForeignKey(
        Campaign,
        on_delete=models.CASCADE,
        related_name='templates'
    )

    template_name = models.CharField(
        max_length=255,
        help_text='YCloud template name (e.g., revo_test_initial_v1)'
    )
    display_name = models.CharField(
        max_length=255,
        blank=True,
        help_text='Human-readable name for display'
    )
    description = models.TextField(blank=True)
    sequence_order = models.PositiveIntegerField(
        default=0,
        help_text='Order in the campaign journey (0 = first)'
    )

    # Button configuration (for tracking which buttons exist)
    buttons = models.JSONField(
        default=list,
        blank=True,
        help_text='List of button objects: [{"text": "Yes", "payload": "Yes"}]'
    )

    # Auto-discovery tracking
    is_auto_discovered = models.BooleanField(
        default=False,
        help_text='True if this template was auto-discovered from YCloud'
    )
    ycloud_template_data = models.JSONField(
        default=dict,
        blank=True,
        help_text='Raw template data from YCloud API'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['campaign', 'template_name']
        ordering = ['sequence_order']
        verbose_name = 'Campaign Template'
        verbose_name_plural = 'Campaign Templates'

    def __str__(self):
        return f'{self.display_name or self.template_name} ({self.campaign.name})'


class CampaignTag(models.Model):
    """
    A tag used by a campaign and its meaning/priority.

    Tags are applied by YCloud chatbot flows and used to track
    lead progress through the campaign journey.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign = models.ForeignKey(
        Campaign,
        on_delete=models.CASCADE,
        related_name='tags'
    )

    tag_name = models.CharField(
        max_length=100,
        help_text='YCloud tag name (e.g., revo_test_interested)'
    )
    display_name = models.CharField(
        max_length=100,
        blank=True,
        help_text='Human-readable name for display'
    )
    description = models.TextField(blank=True)
    priority = models.PositiveIntegerField(
        default=1,
        help_text='Higher priority = more important for status calculation'
    )

    # What this tag means for the lead
    is_positive = models.BooleanField(
        default=True,
        help_text='True = interested/qualified, False = not interested/disqualified'
    )
    is_terminal = models.BooleanField(
        default=False,
        help_text='True = journey complete (completed or dropped)'
    )

    # Auto-discovery tracking
    is_auto_discovered = models.BooleanField(
        default=False,
        help_text='True if this tag was auto-discovered from webhook'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['campaign', 'tag_name']
        ordering = ['priority']
        verbose_name = 'Campaign Tag'
        verbose_name_plural = 'Campaign Tags'

    def __str__(self):
        return f'{self.display_name or self.tag_name} ({self.campaign.name})'


class CampaignJourneyStep(models.Model):
    """
    A step in the campaign journey (for visualization/tracking).

    Defines the sequence of steps in a campaign and what triggers
    each step (manual send, tag added, button click, text reply).
    """

    TRIGGER_TYPE_CHOICES = [
        ('manual', 'Manual Send'),
        ('tag_added', 'Tag Added'),
        ('button_click', 'Button Click'),
        ('text_reply', 'Text Reply'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign = models.ForeignKey(
        Campaign,
        on_delete=models.CASCADE,
        related_name='journey_steps'
    )

    step_order = models.PositiveIntegerField(
        help_text='Order of this step in the journey (1 = first)'
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    # Trigger: what causes this step
    trigger_type = models.CharField(
        max_length=50,
        choices=TRIGGER_TYPE_CHOICES,
        default='manual'
    )
    trigger_value = models.CharField(
        max_length=255,
        blank=True,
        help_text='Tag name, button payload, or text pattern that triggers this step'
    )

    # Action: template to send (optional)
    template = models.ForeignKey(
        CampaignTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='triggered_by_steps',
        help_text='Template sent when this step is triggered'
    )

    # Tags to add when this step is reached
    adds_tags = models.JSONField(
        default=list,
        blank=True,
        help_text='Tags to add when this step is reached: ["tag1", "tag2"]'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['campaign', 'step_order']
        ordering = ['step_order']
        verbose_name = 'Campaign Journey Step'
        verbose_name_plural = 'Campaign Journey Steps'

    def __str__(self):
        return f'{self.step_order}. {self.name} ({self.campaign.name})'


class LeadCampaignEnrollment(models.Model):
    """
    Links a Lead to a Campaign they're enrolled in.

    A lead can be in multiple campaigns. This model tracks their
    progress through each campaign's journey.
    """

    STATUS_CHOICES = [
        ('enrolled', 'Enrolled'),
        ('progressing', 'Progressing'),
        ('stalled', 'Stalled'),
        ('completed', 'Completed'),
        ('dropped', 'Dropped'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lead = models.ForeignKey(
        'leads.Lead',
        on_delete=models.CASCADE,
        related_name='campaign_enrollments'
    )
    campaign = models.ForeignKey(
        Campaign,
        on_delete=models.CASCADE,
        related_name='enrollments'
    )

    enrolled_at = models.DateTimeField(auto_now_add=True)

    # Current position in journey
    current_step = models.ForeignKey(
        CampaignJourneyStep,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='current_enrollments'
    )

    # Campaign-specific status derived from tags
    status = models.CharField(
        max_length=50,
        choices=STATUS_CHOICES,
        default='enrolled'
    )
    completed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['lead', 'campaign']
        ordering = ['-enrolled_at']
        verbose_name = 'Lead Campaign Enrollment'
        verbose_name_plural = 'Lead Campaign Enrollments'

    def __str__(self):
        return f'{self.lead.name} in {self.campaign.name} ({self.status})'

    def mark_completed(self, is_positive: bool = True):
        """Mark enrollment as completed or dropped."""
        self.status = 'completed' if is_positive else 'dropped'
        self.completed_at = timezone.now()
        self.save(update_fields=['status', 'completed_at', 'updated_at'])
