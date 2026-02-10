"""
Template service for auto-sending system templates on triggers.

Handles variable resolution from case/client data and sending
approved YCloud templates when case stages or client statuses change.
"""

import logging
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from templates.models import MessageTemplate
from whatsapp.models import (
    WhatsAppMessage,
    MessageDirection,
    MessageType,
    MessageStatus,
)
from whatsapp.services import YCloudService, YCloudError

logger = logging.getLogger(__name__)


def _format_currency(value):
    """Format a number as currency string (no symbol)."""
    if value is None or value == '':
        return ''
    try:
        num = float(value)
        return f'{num:,.0f}'
    except (ValueError, TypeError):
        return str(value)


def _format_date(date):
    """Format a date as DD Mon YYYY."""
    return date.strftime('%d %b %Y')


def _get_first_name(full_name):
    """Extract first name from full name."""
    if not full_name:
        return ''
    return full_name.strip().split()[0]


class TemplateService:
    """Service for system template auto-sending."""

    def __init__(self):
        self.ycloud_service = YCloudService()

    def resolve_variables(self, client, case=None):
        """
        Build a dict of all template variable values from client and case data.

        Returns:
            dict mapping variable names to their resolved string values.
        """
        today = timezone.now().date()

        variables = {
            # Client variables
            'first_name': _get_first_name(getattr(client, 'name', '')),
            'name': getattr(client, 'name', '') or '',
            'phone': getattr(client, 'phone', '') or '',
            'email': getattr(client, 'email', '') or '',
            'salary': _format_currency(getattr(client, 'monthly_salary', None)),
            'max_loan': _format_currency(getattr(client, 'max_loan_amount', None)),
            'dbr': f"{client.dbr_percentage}%" if getattr(client, 'dbr_percentage', None) else '',
            'nationality': getattr(client, 'nationality', '') or '',
            'company': getattr(client, 'company_name', '') or '',
            'today': _format_date(today),
            # Case variables (empty if no case)
            'bank_name': '',
            'loan_amount': '',
            'property_value': '',
            'rate': '',
            'stage': '',
            'sign_by_date': _format_date(today + timedelta(days=7)),
        }

        if case:
            variables.update({
                'bank_name': getattr(case, 'bank', '') or '',
                'loan_amount': _format_currency(getattr(case, 'loan_amount', None)),
                'property_value': _format_currency(getattr(case, 'property_value', None)),
                'rate': f"{case.rate}%" if getattr(case, 'rate', None) else '',
                'stage': case.get_stage_display() if hasattr(case, 'get_stage_display') else '',
            })

        return variables

    def build_template_components(self, template, variable_values):
        """
        Build YCloud template components from variable mapping and values.

        The variable_mapping on the template maps positional indices to
        Rivo variable names, e.g. {"1": "first_name", "2": "bank_name"}.

        Returns:
            list of component dicts for YCloud send_template_message API.
        """
        mapping = template.variable_mapping or {}
        if not mapping:
            return []

        # Build parameters in positional order
        parameters = []
        for i in range(1, len(mapping) + 1):
            var_name = mapping.get(str(i), '')
            value = variable_values.get(var_name, '')
            parameters.append({
                'type': 'text',
                'text': value or '-',
            })

        return [
            {
                'type': 'body',
                'parameters': parameters,
            }
        ]

    def send_system_template(self, template, client, case=None):
        """
        Send a system template via YCloud and log as WhatsAppMessage.

        Args:
            template: MessageTemplate instance (must be system type with ycloud_template_name)
            client: Client instance
            case: Optional Case instance for variable resolution

        Returns:
            WhatsAppMessage instance or None if sending failed.
        """
        if not template.ycloud_template_name:
            logger.warning(f'System template "{template.name}" has no YCloud template linked')
            return None

        if not client.phone:
            logger.warning(f'Client {client.id} has no phone, skipping auto-send')
            return None

        # Resolve variables
        variables = self.resolve_variables(client, case)

        # Build components
        components = self.build_template_components(template, variables)

        # Fill content for logging — resolve both {var} and {{N}} placeholders
        filled_content = template.content
        # Replace Rivo-style {variable} placeholders
        for var_name, var_value in variables.items():
            filled_content = filled_content.replace('{' + var_name + '}', var_value)
        # Replace YCloud-style {{N}} positional placeholders using variable mapping
        mapping = template.variable_mapping or {}
        for position, var_name in mapping.items():
            value = variables.get(var_name, '')
            filled_content = filled_content.replace('{{' + position + '}}', value or '-')

        # Create message record
        whatsapp_message = WhatsAppMessage.objects.create(
            client=client,
            direction=MessageDirection.OUTBOUND,
            message_type=MessageType.TEMPLATE,
            content=filled_content,
            status=MessageStatus.PENDING,
            from_number=self.ycloud_service.from_number,
            to_number=client.phone,
        )

        # Send via YCloud
        try:
            ycloud_response = self.ycloud_service.send_template_message(
                to_number=client.phone,
                template_name=template.ycloud_template_name,
                components=components,
                use_direct=False,
            )

            whatsapp_message.ycloud_message_id = ycloud_response.get('id', '')
            whatsapp_message.status = MessageStatus.SENT
            whatsapp_message.sent_at = timezone.now()
            whatsapp_message.save()

            logger.info(
                f'Auto-sent system template "{template.name}" to {client.phone} '
                f'(ycloud_id={whatsapp_message.ycloud_message_id})'
            )
            return whatsapp_message

        except YCloudError as e:
            whatsapp_message.status = MessageStatus.FAILED
            whatsapp_message.error_message = e.message
            whatsapp_message.save()

            logger.error(
                f'Failed to auto-send template "{template.name}" to {client.phone}: {e.message}'
            )
            return whatsapp_message

    def trigger_on_case_stage_change(self, case, new_stage):
        """
        Find and send a system template triggered by a case stage change.

        Called from cases/views.py after a successful stage change.
        Fails silently — never blocks the stage change.
        """
        try:
            template = MessageTemplate.objects.filter(
                category='system',
                is_active=True,
                trigger_type='case_stage',
                trigger_value=new_stage,
            ).first()

            if not template:
                return

            if not template.ycloud_template_name:
                logger.info(f'System template "{template.name}" has no YCloud template linked, skipping')
                return

            client = case.client
            self.send_system_template(template, client, case=case)

        except Exception as e:
            logger.error(f'Error in trigger_on_case_stage_change for case {case.id}: {e}')

    def trigger_on_client_status_change(self, client, new_status):
        """
        Find and send a system template triggered by a client status change.

        Called from clients/views.py after a successful status change.
        Fails silently — never blocks the status change.
        """
        try:
            template = MessageTemplate.objects.filter(
                category='system',
                is_active=True,
                trigger_type='client_status',
                trigger_value=new_status,
            ).first()

            if not template:
                return

            if not template.ycloud_template_name:
                logger.info(f'System template "{template.name}" has no YCloud template linked, skipping')
                return

            # Get the most recent case for variable resolution
            case = client.cases.order_by('-created_at').first() if hasattr(client, 'cases') else None
            self.send_system_template(template, client, case=case)

        except Exception as e:
            logger.error(f'Error in trigger_on_client_status_change for client {client.id}: {e}')
