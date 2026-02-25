"""
Channel models for Rivo OS Lead Management.

Channels are entry points for leads with two levels of attribution:
Channel -> Source
"""

import uuid
from django.db import models
from users.models import User


class Channel(models.Model):
    """
    Top-level channel representing a lead source category.

    Examples: Performance Marketing, Partner Hub, Freelance Network,
    BH Mortgage Team, AskRivo
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    name = models.CharField(
        max_length=100,
        unique=True,
        help_text='Channel name (e.g., Performance Marketing)'
    )

    description = models.TextField(
        blank=True,
        default='',
        help_text='Description of this channel'
    )

    is_trusted = models.BooleanField(
        default=False,
        help_text='Trusted channels create Clients directly; untrusted create Leads'
    )

    default_sla_minutes = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Default SLA in minutes for this channel'
    )

    is_active = models.BooleanField(
        default=True,
        help_text='Whether this channel is active'
    )

    owner = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='owned_channels'
    )

    monthly_spend = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Monthly marketing spend for this channel in AED'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'channels'
        ordering = ['name']

    def __str__(self):
        return self.name


class Source(models.Model):
    """
    Source within a channel.

    Examples: Google Search, Meta (under Performance Marketing),
    AEON, Azizi (under Partner Hub)
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    channel = models.ForeignKey(
        Channel,
        on_delete=models.CASCADE,
        related_name='sources',
        help_text='Parent channel'
    )

    name = models.CharField(
        max_length=100,
        help_text='Source name (e.g., Google Search)'
    )

    sla_minutes = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='SLA override in minutes (null = use channel default)'
    )

    status = models.CharField(
        max_length=20,
        choices=[('active', 'Active'), ('inactive', 'Inactive')],
        default='active',
        help_text='Source status: active or inactive'
    )

    linked_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='linked_sources',
        help_text='Linked MS user (for BH Mortgage Team self-sourcing)'
    )

    referrer_phone = models.CharField(
        max_length=20,
        blank=True,
        default='',
        help_text='Referrer phone for WhatsApp notifications (human sources)'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sources'
        ordering = ['name']
        unique_together = ['channel', 'name']
        indexes = [
            models.Index(fields=['channel'], name='sources_channel_idx'),
            models.Index(fields=['status'], name='sources_status_idx'),
            models.Index(fields=['linked_user'], name='sources_linked_user_idx'),
        ]

    def __str__(self):
        return f"{self.name} ({self.channel.name})"

    @property
    def effective_sla_minutes(self):
        """Get effective SLA (source override or channel default)."""
        if self.sla_minutes is not None:
            return self.sla_minutes
        return self.channel.default_sla_minutes
