"""
URL configuration for leads app.

This module defines URL patterns for lead management endpoints.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from leads.views import LeadViewSet, lead_ingest, lead_status

# Router for Lead CRUD operations
router = DefaultRouter()
router.register(r'leads', LeadViewSet, basename='lead')

urlpatterns = [
    path('leads/ingest/', lead_ingest, name='lead-ingest'),
    path('leads/status/<uuid:lead_id>/', lead_status, name='lead-status'),
    path('', include(router.urls)),
]
