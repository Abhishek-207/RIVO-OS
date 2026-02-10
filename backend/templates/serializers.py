"""
Serializers for Message Templates API.
"""

from rest_framework import serializers
from .models import MessageTemplate, TemplateType, TriggerType


class MessageTemplateSerializer(serializers.ModelSerializer):
    """Serializer for MessageTemplate model."""

    category_display = serializers.CharField(
        source='get_category_display',
        read_only=True
    )
    trigger_type_display = serializers.CharField(
        source='get_trigger_type_display',
        read_only=True,
        allow_null=True
    )
    created_by_name = serializers.CharField(
        source='created_by.name',
        read_only=True,
        allow_null=True
    )

    class Meta:
        model = MessageTemplate
        fields = [
            'id',
            'name',
            'category',
            'category_display',
            'content',
            'is_active',
            'trigger_type',
            'trigger_type_display',
            'trigger_value',
            'ycloud_template_name',
            'variable_mapping',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class MessageTemplateCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating a MessageTemplate."""

    class Meta:
        model = MessageTemplate
        fields = [
            'name', 'category', 'content', 'is_active',
            'trigger_type', 'trigger_value',
            'ycloud_template_name', 'variable_mapping',
        ]

    def validate_name(self, value):
        """Ensure template name is not empty."""
        if not value.strip():
            raise serializers.ValidationError('Template name cannot be empty')
        return value.strip()

    def validate_content(self, value):
        """Ensure template content is not empty for general templates."""
        return value.strip() if value else ''

    def validate(self, data):
        category = data.get('category', 'general')

        if category == 'system':
            if not data.get('trigger_type'):
                raise serializers.ValidationError(
                    {'trigger_type': 'Trigger type is required for system templates.'}
                )
            if not data.get('trigger_value'):
                raise serializers.ValidationError(
                    {'trigger_value': 'Trigger value is required for system templates.'}
                )
            if not data.get('ycloud_template_name'):
                raise serializers.ValidationError(
                    {'ycloud_template_name': 'YCloud template is required for system templates.'}
                )
        elif category == 'general':
            if not data.get('content', '').strip():
                raise serializers.ValidationError(
                    {'content': 'Content is required for general templates.'}
                )
            # Clear system-only fields
            data['trigger_type'] = None
            data['trigger_value'] = ''
            data['ycloud_template_name'] = ''
            data['variable_mapping'] = {}

        return data


class TemplateCategorySerializer(serializers.Serializer):
    """Serializer for template category choices."""

    value = serializers.CharField()
    label = serializers.CharField()


class TemplateVariableSerializer(serializers.Serializer):
    """Serializer for available template variables."""

    name = serializers.CharField()
    description = serializers.CharField()
