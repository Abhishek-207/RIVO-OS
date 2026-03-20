"""
URL configuration for users app.

This module defines URL patterns for authentication and user management endpoints.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from users.views import (
    UserViewSet,
    change_password_view,
    login_view,
    logout_view,
    me_view,
    set_password_view,
    resend_invite_view,
)

# Router for User CRUD operations
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    # Authentication endpoints
    path('auth/login', login_view, name='auth-login'),
    path('auth/logout', logout_view, name='auth-logout'),
    path('auth/set-password', set_password_view, name='auth-set-password'),
    path('auth/resend-invite', resend_invite_view, name='auth-resend-invite'),
    path('auth/change-password', change_password_view, name='auth-change-password'),
    path('auth/me', me_view, name='auth-me'),

    # User management endpoints (via router)
    path('', include(router.urls)),
]
