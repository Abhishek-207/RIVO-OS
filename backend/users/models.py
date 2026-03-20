"""
User model for Rivo OS Identity & Access Management.

This module defines the User model with role-based access control.
Supports secure email-based invitation and password setup flow.
"""

import uuid
import secrets
import hashlib
import bcrypt
from django.core.exceptions import ValidationError
from django.core.validators import EmailValidator
from django.db import models
from django.utils import timezone
from datetime import timedelta


class UserRole(models.TextChoices):
    """
    Allowed user roles for Rivo OS.

    ADMIN: System configuration. Manages users, channels, bank products, templates.
    CHANNEL_OWNER: Owns channels, creates teams, assigns members.
    TEAM_LEADER: Leads a team. Full operational access to leads/clients/cases.
    MS: Mortgage Specialist. Works leads to clients to cases.
    PO: Process Owner. Works clients and cases to disbursement.
    """
    ADMIN = 'admin', 'Admin'
    CHANNEL_OWNER = 'channel_owner', 'Channel Owner'
    TEAM_LEADER = 'team_leader', 'Team Leader'
    MS = 'mortgage_specialist', 'Mortgage Specialist'
    PO = 'process_owner', 'Process Owner'


class User(models.Model):
    """
    User model for Rivo OS.

    Users are created by admins with email invitations.
    Each user must set their own password via a secure token link.
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
        help_text='Username for login (auto-generated from name)'
    )

    email = models.EmailField(
        unique=True,
        max_length=255,
        validators=[EmailValidator(message='Enter a valid email address.')],
        help_text='User email address (unique, required)'
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
        max_length=128,
        blank=True,
        default='',
        help_text='Bcrypt hash of password'
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

    is_verified = models.BooleanField(
        default=False,
        help_text='Whether the user has set their password via email invite'
    )

    invite_token_hash = models.CharField(
        max_length=64,
        blank=True,
        default='',
        help_text='SHA256 hash of invite token for password setup'
    )

    invite_token_expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Expiry timestamp for the invite token (24 hours from creation)'
    )

    invite_sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Timestamp when the invite email was last sent'
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
        """Hash and set the password using bcrypt."""
        password_bytes = password.encode('utf-8')
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password_bytes, salt).decode('utf-8')

    def check_password(self, password: str) -> bool:
        """Verify password against stored bcrypt hash."""
        if not self.password_hash:
            return False
        try:
            return bcrypt.checkpw(
                password.encode('utf-8'),
                self.password_hash.encode('utf-8')
            )
        except (ValueError, TypeError):
            return False

    def generate_invite_token(self) -> str:
        """Generate a secure invite token and store its hash. Returns the raw token."""
        raw_token = secrets.token_urlsafe(48)
        self.invite_token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        self.invite_token_expires_at = timezone.now() + timedelta(hours=24)
        self.invite_sent_at = timezone.now()
        return raw_token

    def verify_invite_token(self, raw_token: str) -> bool:
        """Verify that a raw token matches the stored hash and hasn't expired."""
        if not self.invite_token_hash or not self.invite_token_expires_at:
            return False
        if timezone.now() > self.invite_token_expires_at:
            return False
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        return secrets.compare_digest(self.invite_token_hash, token_hash)

    def invalidate_invite_token(self) -> None:
        """Invalidate the current invite token after use."""
        self.invite_token_hash = ''
        self.invite_token_expires_at = None

    @staticmethod
    def generate_unique_username(full_name: str) -> str:
        """Generate a unique username from full name.

        Takes first word, lowercases, removes special chars.
        Appends number if not unique (abhishek, abhishek1, abhishek2...).
        """
        import re
        base = full_name.split()[0].lower() if full_name.strip() else 'user'
        base = re.sub(r'[^a-z0-9]', '', base)
        if not base:
            base = 'user'

        username = base
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f'{base}{counter}'
            counter += 1
        return username
