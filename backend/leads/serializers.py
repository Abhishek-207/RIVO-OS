"""
Serializers for Lead model.

This module provides serializers for lead CRUD operations
and status management.
"""

from rest_framework import serializers

from acquisition_channels.models import Source
from leads.models import Lead, LeadStatus, CampaignStatus, LeadInteraction, LeadMessage


class SourceNestedSerializer(serializers.ModelSerializer):
    """Nested serializer for source in lead responses."""
    channel_name = serializers.CharField(source='channel.name', read_only=True)
    effective_sla = serializers.IntegerField(source='effective_sla_minutes', read_only=True)

    class Meta:
        model = Source
        fields = ['id', 'name', 'channel_name', 'effective_sla']


class LeadListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing leads.

    Returns: id, name, phone, email, status, source (nested), sla_display,
             campaign_status, campaign_status_display, current_tags, response_count,
             first_response_at, last_response_at, created_at, updated_at
    """
    source = SourceNestedSerializer(read_only=True)
    sla_display = serializers.SerializerMethodField()
    campaign_status_display = serializers.CharField(source='get_campaign_status_display', read_only=True)

    class Meta:
        model = Lead
        fields = [
            'id', 'name', 'phone', 'email', 'status', 'pipeline_status',
            'source', 'mortgage_amount', 'sla_display',
            # Campaign tracking fields
            'campaign_status', 'campaign_status_display', 'current_tags',
            'response_count', 'first_response_at', 'last_response_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_sla_display(self, obj: Lead) -> str:
        """Get human-readable SLA timer display."""
        return obj.sla_timer.get('display', 'No SLA')


class LeadDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for lead detail view.

    Returns all lead fields plus computed sla_timer and campaign tracking.
    """
    source = SourceNestedSerializer(read_only=True)
    sla_timer = serializers.SerializerMethodField()
    is_terminal = serializers.BooleanField(read_only=True)
    campaign_status_display = serializers.CharField(source='get_campaign_status_display', read_only=True)

    class Meta:
        model = Lead
        fields = [
            'id', 'name', 'phone', 'email', 'intent', 'status', 'pipeline_status',
            'source', 'mortgage_amount', 'converted_client_id', 'sla_timer', 'is_terminal',
            # Campaign tracking fields
            'ycloud_contact_id', 'campaign_status', 'campaign_status_display',
            'current_tags', 'response_count', 'first_response_at', 'last_response_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'converted_client_id', 'created_at', 'updated_at']

    def get_sla_timer(self, obj: Lead) -> dict:
        """Get full SLA timer information."""
        return obj.sla_timer


class LeadUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating leads.

    Only allows updating: name, phone, email, intent
    Status changes are handled via the change_status action.
    """

    class Meta:
        model = Lead
        fields = ['name', 'phone', 'email', 'intent']

    def validate(self, attrs):
        """Prevent updates to terminal leads."""
        if self.instance and self.instance.is_terminal:
            raise serializers.ValidationError(
                'Cannot update a lead in terminal status.'
            )
        return attrs


class LeadChangeStatusSerializer(serializers.Serializer):
    """Serializer for changing lead status."""
    status = serializers.ChoiceField(choices=LeadStatus.choices)

    def validate_status(self, value):
        """Validate status transition."""
        lead = self.context.get('lead')
        if not lead:
            return value

        # Cannot change status of terminal leads (except for internal conversion)
        if lead.is_terminal:
            raise serializers.ValidationError(
                'Cannot change status of a lead in terminal status.'
            )

        # Active leads can transition to any status
        if lead.status == LeadStatus.ACTIVE:
            return value

        raise serializers.ValidationError(
            f'Cannot transition from {lead.status} to {value}.'
        )


class LeadInteractionSerializer(serializers.ModelSerializer):
    """Serializer for lead interactions (campaign journey events)."""

    class Meta:
        model = LeadInteraction
        fields = [
            'id', 'interaction_type', 'content', 'tag_value',
            'template_name', 'original_message_id', 'metadata', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class LeadMessageSerializer(serializers.ModelSerializer):
    """Serializer for lead WhatsApp messages."""

    class Meta:
        model = LeadMessage
        fields = [
            'id', 'direction', 'message_type', 'content', 'status',
            'ycloud_message_id', 'from_number', 'to_number',
            'button_payload', 'template_name', 'reply_to_message_id',
            'created_at', 'sent_at', 'delivered_at'
        ]
        read_only_fields = ['id', 'created_at']
