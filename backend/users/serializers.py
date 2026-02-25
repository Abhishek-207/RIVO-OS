"""
Serializers for User model.

This module provides serializers for user CRUD operations
and authentication flows.
"""

from rest_framework import serializers

from users.models import User, UserRole


class UserListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing users.

    Returns: id, username, email, name, role, is_active
    """

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'name', 'phone', 'role', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating users.

    Accepts: username, email, name, role, password, phone
    Password is stored as hash for local auth or used to create Supabase Auth user.
    """
    username = serializers.CharField(
        max_length=50,
        required=False,
        help_text='Username for login (auto-generated from email if not provided)'
    )
    password = serializers.CharField(
        write_only=True,
        min_length=6,
        help_text='Initial password for the user (min 6 characters)'
    )

    class Meta:
        model = User
        fields = ['username', 'email', 'name', 'phone', 'role', 'password']

    def validate_username(self, value: str) -> str:
        """Validate username uniqueness."""
        if value and User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('A user with this username already exists.')
        return value.lower() if value else value

    def validate_email(self, value: str) -> str:
        """Validate email uniqueness."""
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value.lower()

    def validate_role(self, value: str) -> str:
        """Validate role is one of allowed values."""
        if value not in UserRole.values:
            raise serializers.ValidationError(
                f'Invalid role. Must be one of: {", ".join(UserRole.values)}'
            )
        return value


class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating users.

    Only name and role can be updated. Email is read-only after creation.
    """

    class Meta:
        model = User
        fields = ['name', 'phone', 'role']

    def validate_role(self, value: str) -> str:
        """Validate role is one of allowed values."""
        if value not in UserRole.values:
            raise serializers.ValidationError(
                f'Invalid role. Must be one of: {", ".join(UserRole.values)}'
            )
        return value


class UserDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for user detail view.

    Returns all user fields except supabase_auth_id and password_hash.
    """

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'name', 'phone', 'role', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'username', 'email', 'created_at', 'updated_at']


class LoginSerializer(serializers.Serializer):
    """Serializer for login requests."""
    username = serializers.CharField(max_length=50, help_text='Username for login')
    password = serializers.CharField(max_length=255)


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for password change requests."""
    current_password = serializers.CharField(
        max_length=255,
        write_only=True,
        help_text='Current password for verification'
    )
    new_password = serializers.CharField(
        max_length=255,
        min_length=6,
        write_only=True,
        help_text='New password (min 6 characters)'
    )
