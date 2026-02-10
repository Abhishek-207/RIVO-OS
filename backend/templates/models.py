"""
Message Template models for Rivo OS.

Two types of templates:
- General: Internal templates sent via sendDirectly in WhatsApp chats.
- System: Linked to approved YCloud/WhatsApp templates, auto-triggered on
  case stage or client status changes.
"""

import uuid
from django.db import models
from users.models import User


class TemplateType(models.TextChoices):
    """Template types."""
    SYSTEM = 'system', 'System'
    GENERAL = 'general', 'General'


class TriggerType(models.TextChoices):
    """What event triggers a system template."""
    CASE_STAGE = 'case_stage', 'Case Stage Change'
    CLIENT_STATUS = 'client_status', 'Client Status Change'


class MessageTemplate(models.Model):
    """
    Message template for WhatsApp communication.

    General templates: internal content with {variable} placeholders,
    sent via sendDirectly within the 24-hour window.

    System templates: linked to a Meta-approved YCloud template,
    auto-triggered on case stage or client status changes.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, help_text='Template name for easy identification')
    category = models.CharField(
        max_length=20,
        choices=TemplateType.choices,
        default=TemplateType.GENERAL,
        help_text='Template type: system (auto-triggered) or general (manual use)'
    )
    content = models.TextField(
        blank=True,
        default='',
        help_text='Message content with {variable} placeholders'
    )
    is_active = models.BooleanField(
        default=True,
        help_text='Whether the template is available for use'
    )

    # System template fields
    trigger_type = models.CharField(
        max_length=20,
        choices=TriggerType.choices,
        null=True,
        blank=True,
        help_text='Event type that triggers this template (system only)'
    )
    trigger_value = models.CharField(
        max_length=50,
        blank=True,
        default='',
        help_text='Specific stage/status value that triggers this template'
    )
    ycloud_template_name = models.CharField(
        max_length=200,
        blank=True,
        default='',
        help_text='Name of the linked YCloud/WhatsApp approved template'
    )
    variable_mapping = models.JSONField(
        default=dict,
        blank=True,
        help_text='Maps positional {{1}},{{2}} to Rivo variable names, e.g. {"1": "first_name", "2": "bank_name"}'
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_templates'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['category', 'name']
        verbose_name = 'Message Template'
        verbose_name_plural = 'Message Templates'
        constraints = [
            models.UniqueConstraint(
                fields=['trigger_type', 'trigger_value'],
                condition=models.Q(category='system', is_active=True),
                name='unique_active_system_trigger'
            )
        ]

    def __str__(self):
        return f'{self.name} ({self.get_category_display()})'

    @classmethod
    def get_available_variables(cls):
        """Return list of available template variables with descriptions."""
        return [
            # Client variables
            {'name': 'first_name', 'description': 'First name'},
            {'name': 'name', 'description': 'Full name'},
            {'name': 'phone', 'description': 'Phone number'},
            {'name': 'email', 'description': 'Email address'},
            {'name': 'salary', 'description': 'Monthly salary'},
            {'name': 'max_loan', 'description': 'Max loan amount'},
            {'name': 'dbr', 'description': 'DBR available'},
            {'name': 'nationality', 'description': 'Nationality'},
            {'name': 'company', 'description': 'Company name'},
            {'name': 'today', 'description': "Today's date"},
            # Case variables
            {'name': 'bank_name', 'description': 'Bank name'},
            {'name': 'loan_amount', 'description': 'Loan amount'},
            {'name': 'property_value', 'description': 'Property value'},
            {'name': 'rate', 'description': 'Interest rate'},
            {'name': 'stage', 'description': 'Current case stage'},
            {'name': 'sign_by_date', 'description': 'Sign by date (7 days from today)'},
        ]
