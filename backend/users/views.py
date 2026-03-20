"""
API views for user management and authentication.

Implements secure email-based invitation flow:
- Admin creates user with name, email, role
- System generates username, sends invite email
- User sets password via secure token link
- Login supports email OR username
"""

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
    ResendInviteSerializer,
    SetPasswordSerializer,
    UserCreateSerializer,
    UserDetailSerializer,
    UserListSerializer,
    UserUpdateSerializer,
)
from users.utils import can_deactivate_user
from users.iam import get_user_permissions
from users.email_service import send_invite_email

logger = logging.getLogger(__name__)


def generate_jwt_token(user: User) -> str:
    """Generate JWT token for authentication."""
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


# ─── Authentication Views ────────────────────────────────────────────────────


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request: Request) -> Response:
    """
    Authenticate user with email/username and password.

    POST /auth/login
    Body: { identifier, password }
    Returns: { access_token, user: { id, email, name, role, username } }
    """
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    identifier = serializer.validated_data['identifier'].strip().lower()
    password = serializer.validated_data['password']

    if not identifier or not password:
        return Response(
            {'error': 'Email/username and password are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Find user by email or username
        try:
            user = User.objects.get(Q(email__iexact=identifier) | Q(username__iexact=identifier))
        except User.DoesNotExist:
            logger.warning(f"Login failed: user not found identifier={identifier}")
            return Response(
                {'error': 'Invalid email/username or password.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            logger.warning(f"Login failed: deactivated user={user.username} id={user.id}")
            return Response(
                {'error': 'User account is deactivated.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Check if user has set their password
        if not user.password_hash:
            logger.warning(f"Login failed: password not set user={user.username} id={user.id}")
            return Response(
                {'error': 'Please set your password via the email invite link before logging in.', 'code': 'PASSWORD_NOT_SET'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Verify password
        if not user.check_password(password):
            logger.warning(f"Login failed: bad password user={user.username} id={user.id}")
            return Response(
                {'error': 'Invalid email/username or password.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        token = generate_jwt_token(user)
        permissions = get_user_permissions(user)
        logger.info(f"Login successful: user={user.username} id={user.id} role={user.role}")
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

    except Exception as e:
        logger.error(f'Login failed: {str(e)}')
        return Response(
            {'error': 'Invalid email/username or password.'},
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
    user = getattr(request, 'user', None)
    if user and hasattr(user, 'username'):
        logger.info(f"Logout: user={user.username} id={user.id}")
    return Response({'message': 'Logged out successfully.'})


@api_view(['POST'])
@permission_classes([AllowAny])
def set_password_view(request: Request) -> Response:
    """
    Set password for a new user via invite token.

    POST /auth/set-password
    Body: { token, password, confirm_password }
    """
    serializer = SetPasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    raw_token = serializer.validated_data['token']
    password = serializer.validated_data['password']

    # Find user by token hash
    import hashlib
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

    try:
        user = User.objects.get(invite_token_hash=token_hash)
    except User.DoesNotExist:
        return Response(
            {'error': 'Invalid or expired token. Please request a new invite from your admin.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Verify token is still valid (not expired)
    if not user.verify_invite_token(raw_token):
        return Response(
            {'error': 'Token has expired. Please request a new invite from your admin.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Set password and mark verified
    user.set_password(password)
    user.is_verified = True
    user.invalidate_invite_token()
    user.save()

    logger.info(f"Password set via invite: user={user.username} id={user.id}")
    return Response({'message': 'Password set successfully. You can now log in.'})


@api_view(['POST'])
@permission_classes([AllowAny])
def resend_invite_view(request: Request) -> Response:
    """
    Resend invite email to a user who hasn't set their password yet.

    POST /auth/resend-invite
    Body: { email }
    """
    serializer = ResendInviteSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    email = serializer.validated_data['email'].lower()

    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        # Don't reveal whether the email exists
        return Response({'message': 'If this email is registered, a new invite will be sent.'})

    if user.is_verified and user.password_hash:
        return Response(
            {'error': 'This account already has a password set. Please log in instead.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not user.is_active:
        return Response(
            {'error': 'This account is deactivated. Please contact your admin.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Generate new token and send email
    raw_token = user.generate_invite_token()
    user.save()

    send_invite_email(
        user_email=user.email,
        user_name=user.name,
        role=user.role,
        token=raw_token,
    )

    logger.info(f"Invite resent: user={user.username} id={user.id}")
    return Response({'message': 'If this email is registered, a new invite will be sent.'})


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

    user = request.user
    if not user.check_password(current_password):
        return Response(
            {'error': 'Current password is incorrect.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user.set_password(new_password)
    user.save()

    logger.info(f"Password changed: user={user.username} id={user.id}")
    return Response({'message': 'Password updated successfully.'})


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
        'username': user.username,
        'is_active': user.is_active,
        'permissions': permissions['permissions'],
    })


# ─── User Management ViewSet ─────────────────────────────────────────────────


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for user management (Admin/Channel Owner only).

    - POST /users — Create user + send invite email
    - GET /users — List all users
    - PATCH /users/{id} — Update user
    - POST /users/{id}/deactivate — Deactivate user
    - POST /users/{id}/reactivate — Reactivate user
    - POST /users/{id}/resend_invite — Resend invite for a specific user
    - DELETE /users/{id} — Permanently delete user
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

        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(email__icontains=search) | Q(username__icontains=search)
            )

        status_filter = self.request.query_params.get('status', 'all')
        if status_filter == 'active':
            queryset = queryset.filter(is_active=True)
        elif status_filter == 'inactive':
            queryset = queryset.filter(is_active=False)

        return queryset

    def list(self, request: Request) -> Response:
        """List all users with pagination, search, and status filter."""
        queryset = self.filter_queryset(self.get_queryset())

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request: Request) -> Response:
        """
        Create a new user and send invite email.

        POST /users
        Body: { name, email, role }

        Auto-generates username from name.
        Sends invite email with set-password link.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        name = serializer.validated_data['name']
        role = serializer.validated_data['role']

        # Generate unique username from name
        username = User.generate_unique_username(name)

        try:
            user = User(
                username=username,
                email=email,
                name=name,
                role=role,
                is_verified=False,
            )

            # Generate invite token
            raw_token = user.generate_invite_token()
            user.save()

            # Send invite email
            email_sent = send_invite_email(
                user_email=user.email,
                user_name=user.name,
                role=user.role,
                token=raw_token,
            )

            logger.info(f"User created: username={username} email={email} role={role} by={request.user.username} email_sent={email_sent}")

            response_data = UserDetailSerializer(user).data
            response_data['invite_sent'] = email_sent
            return Response(response_data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f'User creation failed: {str(e)}')
            return Response(
                {'error': f'Failed to create user: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def retrieve(self, request: Request, pk=None) -> Response:
        """Get a single user's details."""
        user = self.get_object()
        serializer = self.get_serializer(user)
        return Response(serializer.data)

    def partial_update(self, request: Request, pk=None) -> Response:
        """Update a user's name, phone, and/or role."""
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
        """Deactivate a user. Prevents deactivating the last admin."""
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
        """Reactivate a user."""
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
    def resend_invite(self, request: Request, pk=None) -> Response:
        """Resend invite email for a specific user (Admin action)."""
        user = self.get_object()

        if user.is_verified and user.password_hash:
            return Response(
                {'error': 'User has already set their password.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        raw_token = user.generate_invite_token()
        user.save()

        email_sent = send_invite_email(
            user_email=user.email,
            user_name=user.name,
            role=user.role,
            token=raw_token,
        )

        logger.info(f"Invite resent by admin: user={user.username} id={user.id} by={request.user.username}")
        return Response({
            'message': 'Invite email sent.' if email_sent else 'Invite generated but email sending failed. Check email configuration.',
            'invite_sent': email_sent,
        })

    def destroy(self, request: Request, pk=None) -> Response:
        """Permanently delete a user. Prevents deleting the last admin."""
        user = self.get_object()

        can_delete, reason = can_deactivate_user(user)
        if not can_delete:
            return Response(
                {'error': reason},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        except Exception as e:
            logger.error(f'User deletion failed: {str(e)}')
            return Response(
                {'error': f'Failed to delete user: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
