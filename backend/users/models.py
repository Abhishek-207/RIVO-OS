"""
User model for Rivo OS Identity & Access Management.

This module defines the User model with role-based access control.
Supports both Supabase Auth and local SQLite authentication.
"""

import uuid
import hashlib
from django.core.exceptions import ValidationError
from django.core.validators import EmailValidator
from django.db import models


class UserRole(models.TextChoices):
    """
    Allowed user roles for Rivo OS.

    ADMIN: System configuration. Manages users, channels, bank products, templates.
    CHANNEL_OWNER: Owns channels, creates teams, assigns members.
    TEAM_LEADER: Leads a team. Full operational access to leads/clients/cases.
    MS: Mortgage Specialist. Works leads to clients to cases.
    PO: Process Executive. Works clients and cases to disbursement.
    """
    ADMIN = 'admin', 'Admin'
    CHANNEL_OWNER = 'channel_owner', 'Channel Owner'
    TEAM_LEADER = 'team_leader', 'Team Leader'
    MS = 'mortgage_specialist', 'Mortgage Specialist'
    PO = 'process_officer', 'Process Executive'


class User(models.Model):
    """
    User model for Rivo OS.

    Users authenticate via Supabase Auth using email and password.
    The supabase_auth_id links to the Supabase Auth user record.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text='Unique identifier for the user'
    )

    supabase_auth_id = models.UUIDField(
        unique=True,
        null=True,
        blank=True,
        help_text='Supabase Auth user ID for authentication integration'
    )

    username = models.CharField(
        unique=True,
        max_length=50,
        help_text='Username for login'
    )

    email = models.EmailField(
        unique=True,
        max_length=255,
        validators=[EmailValidator(message='Enter a valid email address.')],
        help_text='User email address'
    )

    phone = models.CharField(
        max_length=20,
        blank=True,
        default='',
        help_text='Phone number for WhatsApp notifications (e.g. +971501234567)'
    )

    name = models.CharField(
        max_length=255,
        help_text='Full name of the user for display'
    )

    password_hash = models.CharField(
        max_length=64,
        blank=True,
        default='',
        help_text='SHA256 hash of password for local auth'
    )

    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        help_text='User role determining access permissions'
    )

    is_active = models.BooleanField(
        default=True,
        help_text='Whether the user can log in (soft delete mechanism)'
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text='Timestamp when user was created'
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        help_text='Timestamp when user was last updated'
    )

    class Meta:
        db_table = 'users'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['role'], name='users_role_idx'),
            models.Index(fields=['is_active'], name='users_is_active_idx'),
        ]

    def __str__(self) -> str:
        return self.email

    def clean(self) -> None:
        """Validate model fields."""
        super().clean()

        if self.role and self.role not in UserRole.values:
            raise ValidationError({
                'role': f'Invalid role. Must be one of: {", ".join(UserRole.values)}'
            })

    def save(self, *args, **kwargs) -> None:
        """Run full clean before saving."""
        # Normalize username to lowercase for consistent lookups
        if self.username:
            self.username = self.username.lower().strip()
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def is_admin(self) -> bool:
        """Check if user has admin role."""
        return self.role == UserRole.ADMIN

    @property
    def is_channel_owner(self) -> bool:
        """Check if user has channel owner role."""
        return self.role == UserRole.CHANNEL_OWNER

    @property
    def is_team_leader(self) -> bool:
        """Check if user has team leader role."""
        return self.role == UserRole.TEAM_LEADER

    def set_password(self, password: str) -> None:
        """Hash and set the password."""
        self.password_hash = hashlib.sha256(password.encode()).hexdigest()

    def check_password(self, password: str) -> bool:
        """Verify password against stored hash."""
        return self.password_hash == hashlib.sha256(password.encode()).hexdigest()
