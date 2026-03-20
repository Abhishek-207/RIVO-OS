"""
Serializers for User model.

This module provides serializers for user CRUD operations
and authentication flows.
"""

from rest_framework import serializers

from users.models import User, UserRole


class UserListSerializer(serializers.ModelSerializer):
    """Serializer for listing users."""

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'name', 'phone', 'role', 'is_active', 'is_verified', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserCreateSerializer(serializers.Serializer):
    """Serializer for creating users via admin invite flow.

    Accepts: name, email, role
    Username is auto-generated from name. No password required.
    """
    name = serializers.CharField(max_length=255)
    email = serializers.EmailField(max_length=255)
    role = serializers.ChoiceField(choices=UserRole.choices)

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
    """Serializer for updating users. Only name, phone, and role can be updated."""

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
    """Serializer for user detail view."""

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'name', 'phone', 'role', 'is_active', 'is_verified', 'created_at', 'updated_at']
        read_only_fields = ['id', 'username', 'email', 'created_at', 'updated_at']


class LoginSerializer(serializers.Serializer):
    """Serializer for login requests. Accepts email or username."""
    identifier = serializers.CharField(
        max_length=255,
        help_text='Email or username for login'
    )
    password = serializers.CharField(max_length=255)


class SetPasswordSerializer(serializers.Serializer):
    """Serializer for setting password via invite token."""
    token = serializers.CharField(max_length=200)
    password = serializers.CharField(min_length=8, max_length=255)
    confirm_password = serializers.CharField(min_length=8, max_length=255)

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return attrs


class ResendInviteSerializer(serializers.Serializer):
    """Serializer for resending invite email."""
    email = serializers.EmailField(max_length=255)


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for password change requests."""
    current_password = serializers.CharField(
        max_length=255,
        write_only=True,
        help_text='Current password for verification'
    )
    new_password = serializers.CharField(
        max_length=255,
        min_length=8,
        write_only=True,
        help_text='New password (min 8 characters)'
    )
