"""
API views for user management.

This module provides ViewSets and views for user CRUD operations
and authentication endpoints.

Supports both Supabase Auth and local SQLite authentication.
Set USE_LOCAL_AUTH=true in environment for local mode.
"""

import os
import logging
import jwt
from datetime import datetime, timedelta

from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response

from users.models import User, UserRole
from users.permissions import IsAdminRole, IsAuthenticated, IsChannelOwnerOrAdmin
from users.serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    UserCreateSerializer,
    UserDetailSerializer,
    UserListSerializer,
    UserUpdateSerializer,
)
from users.utils import can_deactivate_user
from users.iam import get_user_permissions

# Check if using local auth (default: True for development)
USE_LOCAL_AUTH = os.environ.get('USE_LOCAL_AUTH', 'true').lower() == 'true'

def get_supabase_client():
    """Get Supabase client (only when not using local auth)."""
    if USE_LOCAL_AUTH:
        return None
    from users.authentication import get_supabase_client as _get_client
    return _get_client()

def get_supabase_admin_client():
    """Get Supabase admin client (only when not using local auth)."""
    if USE_LOCAL_AUTH:
        return None
    from users.authentication import get_supabase_admin_client as _get_admin_client
    return _get_admin_client()

def generate_jwt_token(user: User) -> str:
    """Generate JWT token for local authentication."""
    payload = {
        'user_id': str(user.id),
        'username': user.username,
        'exp': datetime.utcnow() + timedelta(days=7),
        'iat': datetime.utcnow(),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')


class UserPagination(PageNumberPagination):
    """Custom pagination for users with configurable page size."""
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'items': data,
            'total': self.page.paginator.count,
            'page': self.page.number,
            'page_size': self.get_page_size(self.request),
            'total_pages': self.page.paginator.num_pages,
        })

logger = logging.getLogger(__name__)


# Authentication Views

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request: Request) -> Response:
    """
    Authenticate user with username and password.

    POST /auth/login
    Body: { username, password }
    Returns: { access_token, user: { id, email, name, role, username } }
    """
    username = request.data.get('username', '').lower().strip()
    password = request.data.get('password', '')

    if not username or not password:
        return Response(
            {'error': 'Username and password are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Find user by username (username is stored lowercase)
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response(
                {'error': 'Invalid username or password.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            return Response(
                {'error': 'User account is deactivated.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Local auth: check password hash
        if USE_LOCAL_AUTH:
            if not user.check_password(password):
                return Response(
                    {'error': 'Invalid username or password.'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            token = generate_jwt_token(user)
            permissions = get_user_permissions(user)
            return Response({
                'access_token': token,
                'user': {
                    'id': str(user.id),
                    'username': user.username,
                    'email': user.email,
                    'name': user.name,
                    'role': user.role,
                },
                'permissions': permissions['permissions'],
            })

        # Supabase auth
        supabase = get_supabase_client()
        auth_response = supabase.auth.sign_in_with_password({
            'email': user.email,
            'password': password,
        })

        if not auth_response.user:
            return Response(
                {'error': 'Invalid username or password.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        permissions = get_user_permissions(user)
        return Response({
            'access_token': auth_response.session.access_token,
            'refresh_token': auth_response.session.refresh_token,
            'user': {
                'id': str(user.id),
                'username': user.username,
                'email': user.email,
                'name': user.name,
                'role': user.role,
            },
            'permissions': permissions['permissions'],
        })

    except Exception as e:
        logger.error(f'Login failed: {str(e)}')
        return Response(
            {'error': 'Invalid username or password.'},
            status=status.HTTP_401_UNAUTHORIZED
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def logout_view(request: Request) -> Response:
    """
    Log out the current user.

    POST /auth/logout
    JWT is stateless so just return success. Client clears the token.
    """
    return Response({'message': 'Logged out successfully.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request: Request) -> Response:
    """
    Change the current user's password.

    POST /auth/change-password
    Body: { current_password, new_password }
    """
    serializer = ChangePasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    current_password = serializer.validated_data['current_password']
    new_password = serializer.validated_data['new_password']

    try:
        supabase = get_supabase_client()

        # Verify current password by attempting to sign in
        auth_response = supabase.auth.sign_in_with_password({
            'email': request.user.email,
            'password': current_password,
        })

        if not auth_response.user:
            return Response(
                {'error': 'Current password is incorrect.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update password
        supabase.auth.update_user({'password': new_password})

        return Response({'message': 'Password updated successfully.'})

    except Exception as e:
        logger.error(f'Password change failed: {str(e)}')
        return Response(
            {'error': 'Current password is incorrect.'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([IsAdminRole])
def reset_all_passwords_view(request: Request) -> Response:
    """
    Reset password for all users (Admin only).

    POST /auth/reset-all-passwords
    Body: { new_password }
    """
    new_password = request.data.get('new_password')

    if not new_password:
        return Response(
            {'error': 'New password is required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if len(new_password) < 6:
        return Response(
            {'error': 'Password must be at least 6 characters.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        users = User.objects.all()
        for user in users:
            user.set_password(new_password)
            user.save()

        return Response({
            'message': f'Password reset for {users.count()} users.',
            'count': users.count()
        })

    except Exception as e:
        logger.error(f'Reset all passwords failed: {str(e)}')
        return Response(
            {'error': 'Failed to reset passwords.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request: Request) -> Response:
    """
    Get current user's profile with permissions.

    GET /auth/me
    Returns: { id, email, name, role, is_active, permissions }
    """
    user = request.user
    permissions = get_user_permissions(user)
    return Response({
        'id': str(user.id),
        'email': user.email,
        'name': user.name,
        'role': user.role,
        'is_active': user.is_active,
        'permissions': permissions['permissions'],
    })


# User Management ViewSet

class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for user management.

    Provides CRUD operations for users:
    - GET /users - List all users (Admin only)
    - POST /users - Create user (Admin only)
    - GET /users/{id} - Get user details (Admin only)
    - PATCH /users/{id} - Update user (Admin only)
    - POST /users/{id}/deactivate - Deactivate user (Admin only)
    - POST /users/{id}/reactivate - Reactivate user (Admin only)
    - DELETE /users/{id} - Permanently delete user (Admin only)
    """

    queryset = User.objects.all().order_by('-created_at')
    pagination_class = UserPagination

    def get_permissions(self):
        """Admin and Channel Owner have full user management access."""
        return [IsChannelOwnerOrAdmin()]

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return UserListSerializer
        elif self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserDetailSerializer

    def get_queryset(self):
        """Filter queryset based on search and status query params."""
        queryset = super().get_queryset()

        # Search filter (name or email)
        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(email__icontains=search)
            )

        # Status filter (active/inactive/all)
        status_filter = self.request.query_params.get('status', 'all')
        if status_filter == 'active':
            queryset = queryset.filter(is_active=True)
        elif status_filter == 'inactive':
            queryset = queryset.filter(is_active=False)

        return queryset

    def list(self, request: Request) -> Response:
        """
        List all users with pagination, search, and status filter.

        GET /users?page=1&page_size=10&search=john&status=active
        Returns: { items: [...], total, page, page_size, total_pages }
        """
        queryset = self.filter_queryset(self.get_queryset())

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request: Request) -> Response:
        """
        Create a new user.

        POST /users
        Body: { username, email, name, role, password }

        For local mode: stores password hash in SQLite.
        For Supabase mode: creates Supabase Auth user.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        username = serializer.validated_data.get('username', '')
        email = serializer.validated_data['email']
        name = serializer.validated_data['name']
        role = serializer.validated_data['role']
        password = serializer.validated_data['password']

        # Generate username from email if not provided
        if not username:
            username = email.split('@')[0].lower()

        try:
            if USE_LOCAL_AUTH:
                # Local mode: create user with system password
                user = User(
                    username=username,
                    email=email,
                    name=name,
                    role=role,
                )
                # Use system password (copy from existing user) or set provided password
                if password == 'system_default':
                    existing_user = User.objects.filter(is_active=True).first()
                    if existing_user and existing_user.password_hash:
                        user.password_hash = existing_user.password_hash
                    else:
                        user.set_password('rivo123')  # Fallback default
                else:
                    user.set_password(password)
                user.save()

                return Response(
                    UserDetailSerializer(user).data,
                    status=status.HTTP_201_CREATED
                )

            # Supabase mode: create Supabase Auth user
            supabase = get_supabase_admin_client()
            auth_response = supabase.auth.admin.create_user({
                'email': email,
                'password': password,
                'email_confirm': True,
            })

            if not auth_response.user:
                return Response(
                    {'error': 'Failed to create authentication user.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # Create local user record
            user = User.objects.create(
                username=username,
                email=email,
                name=name,
                role=role,
                supabase_auth_id=auth_response.user.id,
            )

            return Response(
                UserDetailSerializer(user).data,
                status=status.HTTP_201_CREATED
            )

        except Exception as e:
            logger.error(f'User creation failed: {str(e)}')
            return Response(
                {'error': f'Failed to create user: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def retrieve(self, request: Request, pk=None) -> Response:
        """
        Get a single user's details.

        GET /users/{id}
        """
        user = self.get_object()
        serializer = self.get_serializer(user)
        return Response(serializer.data)

    def partial_update(self, request: Request, pk=None) -> Response:
        """
        Update a user's name and/or role.

        PATCH /users/{id}
        Body: { name?, role? }

        Email cannot be changed after creation.
        """
        user = self.get_object()
        serializer = self.get_serializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        try:
            serializer.save()
            return Response(UserDetailSerializer(user).data)
        except DjangoValidationError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def deactivate(self, request: Request, pk=None) -> Response:
        """
        Deactivate a user.

        POST /users/{id}/deactivate

        Sets is_active=False. Prevents deactivating the last admin.
        """
        user = self.get_object()

        can_deactivate, reason = can_deactivate_user(user)
        if not can_deactivate:
            return Response(
                {'error': reason},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.is_active = False
        user.save()

        return Response(UserDetailSerializer(user).data)

    @action(detail=True, methods=['post'])
    def reactivate(self, request: Request, pk=None) -> Response:
        """
        Reactivate a user.

        POST /users/{id}/reactivate

        Sets is_active=True.
        """
        user = self.get_object()

        if user.is_active:
            return Response(
                {'error': 'User is already active.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.is_active = True
        user.save()

        return Response(UserDetailSerializer(user).data)

    @action(detail=True, methods=['post'])
    def reset_password(self, request: Request, pk=None) -> Response:
        """
        Reset a user's password (Admin only).

        POST /users/{id}/reset_password
        Body: { new_password }

        Updates the user's password in Supabase Auth.
        """
        user = self.get_object()
        new_password = request.data.get('new_password')

        if not new_password:
            return Response(
                {'error': 'New password is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(new_password) < 6:
            return Response(
                {'error': 'Password must be at least 6 characters.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            if user.supabase_auth_id:
                supabase = get_supabase_admin_client()
                supabase.auth.admin.update_user_by_id(
                    str(user.supabase_auth_id),
                    {'password': new_password}
                )

            return Response({'message': 'Password reset successfully.'})

        except Exception as e:
            logger.error(f'Password reset failed: {str(e)}')
            return Response(
                {'error': f'Failed to reset password: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def destroy(self, request: Request, pk=None) -> Response:
        """
        Permanently delete a user.

        DELETE /users/{id}

        Removes both the local user record and the Supabase Auth user.
        Prevents deleting the last admin.
        """
        user = self.get_object()

        can_delete, reason = can_deactivate_user(user)
        if not can_delete:
            return Response(
                {'error': reason},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Delete from Supabase Auth if exists
            if user.supabase_auth_id:
                supabase = get_supabase_admin_client()
                supabase.auth.admin.delete_user(str(user.supabase_auth_id))

            # Delete local record
            user.delete()

            return Response(status=status.HTTP_204_NO_CONTENT)

        except Exception as e:
            logger.error(f'User deletion failed: {str(e)}')
            return Response(
                {'error': f'Failed to delete user: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
