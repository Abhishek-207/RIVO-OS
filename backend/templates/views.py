"""
API views for Message Templates.
"""

import logging

from django.db import models
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from users.permissions import IsAuthenticated, CanAccessTemplates
from users.iam import can, Action, Resource
from .models import MessageTemplate, TemplateType
from .serializers import (
    MessageTemplateSerializer,
    MessageTemplateCreateSerializer,
    TemplateCategorySerializer,
    TemplateVariableSerializer,
)

logger = logging.getLogger(__name__)


class MessageTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing message templates.

    Access controlled by IAM matrix (Resource.TEMPLATES).
    """
    queryset = MessageTemplate.objects.all()
    serializer_class = MessageTemplateSerializer

    permission_classes = [IsAuthenticated, CanAccessTemplates]

    def get_serializer_class(self):
        """Use different serializer for create/update."""
        if self.action in ['create', 'update', 'partial_update']:
            return MessageTemplateCreateSerializer
        return MessageTemplateSerializer

    def get_queryset(self):
        """Filter templates by search and category."""
        queryset = MessageTemplate.objects.all()

        # Filter by active status (admin can see inactive templates)
        user = self.request.user
        if not can(user, Action.DELETE, Resource.TEMPLATES):
            queryset = queryset.filter(is_active=True)

        # Filter by category (system / general)
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)

        # Search by name or content
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(name__icontains=search) |
                models.Q(content__icontains=search)
            )

        return queryset.order_by('category', 'name')

    def perform_create(self, serializer):
        """Set created_by to current user."""
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'])
    def categories(self, request):
        """List available template categories (system / general)."""
        categories = [
            {'value': choice[0], 'label': choice[1]}
            for choice in TemplateType.choices
        ]
        serializer = TemplateCategorySerializer(categories, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def variables(self, request):
        """List all available template variables."""
        variables = MessageTemplate.get_available_variables()
        serializer = TemplateVariableSerializer(variables, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def trigger_options(self, request):
        """
        Return available trigger values for system templates.

        GET /message-templates/trigger_options/
        Returns: { case_stage: [...], client_status: [...] }
        """
        from cases.models import CaseStage
        from clients.models import ClientStatus

        return Response({
            'case_stage': [
                {'value': s.value, 'label': s.label}
                for s in CaseStage
            ],
            'client_status': [
                {'value': s.value, 'label': s.label}
                for s in ClientStatus
            ],
        })

    @action(detail=False, methods=['get'])
    def ycloud_templates(self, request):
        """
        Fetch approved WhatsApp templates from YCloud.

        GET /message-templates/ycloud_templates/
        Returns: list of approved YCloud templates for the dropdown.
        """
        from whatsapp.services import YCloudService

        try:
            ycloud_service = YCloudService()
            templates = ycloud_service.list_templates()

            # Only return approved templates
            approved = [
                {
                    'name': t.get('name', ''),
                    'language': t.get('language', 'en'),
                    'category': t.get('category', ''),
                    'status': t.get('status', ''),
                    'components': t.get('components', []),
                }
                for t in templates
                if t.get('status') == 'APPROVED'
            ]

            return Response(approved)

        except Exception as e:
            logger.error(f'Failed to fetch YCloud templates: {e}')
            return Response(
                {'error': 'Failed to fetch templates from YCloud'},
                status=status.HTTP_502_BAD_GATEWAY
            )
