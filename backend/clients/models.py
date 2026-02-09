"""
Client and CoApplicant models for Rivo OS Mortgage Management.

Clients represent qualified prospects with verified identity and calculated eligibility.
They are created either directly from trusted channels or converted from Leads.
"""

import uuid
from datetime import timedelta
from decimal import Decimal
from functools import cached_property
from django.core.exceptions import ValidationError
from django.core.validators import EmailValidator
from django.db import models
from django.utils import timezone

from audit.models import AuditableModel
from acquisition_channels.models import Source
from common.sla import format_sla_duration


class ClientStatus(models.TextChoices):
    """Status choices for clients."""
    ACTIVE = 'active', 'Active'
    DECLINED = 'declined', 'Declined'
    NOT_PROCEEDING = 'not_proceeding', 'Not Proceeding'


class ResidencyType(models.TextChoices):
    """Residency type choices."""
    UAE_NATIONAL = 'uae_national', 'UAE National'
    UAE_RESIDENT = 'uae_resident', 'UAE Resident'
    NON_RESIDENT = 'non_resident', 'Non-Resident'


class VisaType(models.TextChoices):
    """Visa type choices."""
    EMPLOYMENT = 'employment', 'Employment'
    INVESTOR = 'investor', 'Investor'
    GOLDEN = 'golden', 'Golden'
    RETIREMENT = 'retirement', 'Retirement'
    OTHER = 'other', 'Other'


class ApplicationType(models.TextChoices):
    """Application type choices."""
    SINGLE = 'single', 'Single'
    JOINT = 'joint', 'Joint'


class EmploymentType(models.TextChoices):
    """Employment type choices."""
    SALARIED = 'salaried', 'Salaried'
    SELF_EMPLOYED = 'self_employed', 'Self Employed'


class PropertyType(models.TextChoices):
    """Property type choices."""
    READY = 'ready', 'Ready'
    OFF_PLAN = 'off_plan', 'Off-Plan'


class TransactionType(models.TextChoices):
    """Transaction type choices."""
    PRIMARY_PURCHASE = 'primary_purchase', 'Primary Purchase'
    RESALE = 'resale', 'Resale'
    BUYOUT_EQUITY = 'buyout_equity', 'Buyout + Equity'
    BUYOUT = 'buyout', 'Buyout'
    EQUITY = 'equity', 'Equity'


class Timeline(models.TextChoices):
    """Timeline choices for client intent."""
    IMMEDIATE = 'immediate', 'Immediate'
    ONE_THREE_MONTHS = '1_3_months', '1-3 Months'
    THREE_SIX_MONTHS = '3_6_months', '3-6 Months'
    EXPLORING = 'exploring', 'Exploring'


class MaritalStatus(models.TextChoices):
    """Marital status choices."""
    SINGLE = 'single', 'Single'
    MARRIED = 'married', 'Married'
    DIVORCED = 'divorced', 'Divorced'
    WIDOWED = 'widowed', 'Widowed'




class PropertyCategory(models.TextChoices):
    """Property category choices."""
    RESIDENTIAL = 'residential', 'Residential'
    COMMERCIAL = 'commercial', 'Commercial'


class Emirate(models.TextChoices):
    """Emirate choices."""
    DUBAI = 'dubai', 'Dubai'
    ABU_DHABI = 'abu_dhabi', 'Abu Dhabi'
    SHARJAH = 'sharjah', 'Sharjah'
    AJMAN = 'ajman', 'Ajman'
    RAS_AL_KHAIMAH = 'ras_al_khaimah', 'Ras Al Khaimah'
    UMM_AL_QUWAIN = 'umm_al_quwain', 'Umm Al Quwain'
    FUJAIRAH = 'fujairah', 'Fujairah'


class Client(AuditableModel):
    """
    Client model representing qualified mortgage prospects.

    Contains identity, income, liabilities, and property interest information
    needed to calculate eligibility and create cases.
    """

    # Primary key
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text='Unique identifier for the client'
    )

    # Identity Fields
    name = models.CharField(
        max_length=255,
        help_text='Full name of the client'
    )

    phone = models.CharField(
        max_length=20,
        help_text='Phone number'
    )

    email = models.EmailField(
        max_length=255,
        blank=True,
        default='',
        validators=[EmailValidator(message='Enter a valid email address.')],
        help_text='Email address (optional)'
    )

    date_of_birth = models.DateField(
        null=True,
        blank=True,
        help_text='Date of birth'
    )

    nationality = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text='Nationality'
    )

    emirates_id = models.CharField(
        max_length=20,
        blank=True,
        default='',
        help_text='Emirates ID number (optional)'
    )

    residency = models.CharField(
        max_length=20,
        choices=ResidencyType.choices,
        default=ResidencyType.UAE_RESIDENT,
        help_text='Residency status'
    )

    visa_type = models.CharField(
        max_length=20,
        choices=VisaType.choices,
        blank=True,
        default='',
        help_text='Visa type (optional)'
    )

    # Application Type
    application_type = models.CharField(
        max_length=10,
        choices=ApplicationType.choices,
        default=ApplicationType.SINGLE,
        help_text='Single or joint application'
    )

    # Income Fields
    employment_type = models.CharField(
        max_length=20,
        choices=EmploymentType.choices,
        default=EmploymentType.SALARIED,
        help_text='Employment type'
    )

    monthly_salary = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Monthly salary amount'
    )

    total_addbacks = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Total addbacks (rental income, bonuses, etc.)'
    )

    company_name = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='Employer company name (optional)'
    )

    # Liabilities - Credit Cards
    cc_1_limit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Credit card 1 limit (optional)'
    )

    cc_2_limit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Credit card 2 limit (optional)'
    )

    cc_3_limit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Credit card 3 limit (optional)'
    )

    cc_4_limit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Credit card 4 limit (optional)'
    )

    cc_5_limit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Credit card 5 limit (optional)'
    )

    # Liabilities - Loans
    auto_loan_emi = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Auto loan EMI (optional)'
    )

    personal_loan_emi = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Personal loan EMI (optional)'
    )

    existing_mortgage_emi = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Existing mortgage EMI (optional)'
    )

    # Property Details
    property_category = models.CharField(
        max_length=20,
        choices=PropertyCategory.choices,
        default=PropertyCategory.RESIDENTIAL,
        help_text='Property category (residential/commercial)'
    )

    property_type = models.CharField(
        max_length=20,
        choices=PropertyType.choices,
        default=PropertyType.READY,
        help_text='Property type (ready/off-plan)'
    )

    emirate = models.CharField(
        max_length=20,
        choices=Emirate.choices,
        default=Emirate.DUBAI,
        help_text='Emirate where property is located'
    )

    transaction_type = models.CharField(
        max_length=20,
        choices=TransactionType.choices,
        default=TransactionType.PRIMARY_PURCHASE,
        help_text='Type of transaction'
    )

    property_value = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Property value in AED'
    )

    is_first_property = models.BooleanField(
        default=True,
        help_text='Whether this is the client\'s first property in UAE'
    )

    developer = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='Developer name (for off-plan properties)'
    )

    # Loan Details
    loan_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Requested loan amount in AED'
    )

    tenure_years = models.PositiveIntegerField(
        default=20,
        help_text='Loan tenure in years (1-25)'
    )

    tenure_months = models.PositiveIntegerField(
        default=0,
        help_text='Additional months for loan tenure (0-11)'
    )

    # Intent
    notes = models.TextField(
        blank=True,
        default='',
        help_text='Additional notes about the client'
    )

    timeline = models.CharField(
        max_length=20,
        choices=Timeline.choices,
        blank=True,
        default='',
        help_text='Timeline for property purchase'
    )

    # Status & Source
    status = models.CharField(
        max_length=20,
        choices=ClientStatus.choices,
        default=ClientStatus.ACTIVE,
        help_text='Current status of the client'
    )

    source = models.ForeignKey(
        Source,
        on_delete=models.PROTECT,
        related_name='clients',
        help_text='Source where client originated'
    )

    converted_from_lead = models.ForeignKey(
        'leads.Lead',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='converted_clients',
        help_text='Lead this client was converted from (if any)'
    )

    # Owner assignment for SLA tracking
    assigned_to = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_clients',
        help_text='User assigned to this client'
    )

    # First Contact SLA tracking
    first_contact_completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When First Contact SLA was satisfied (document upload, note, state change, or case created)'
    )

    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text='When the client was created'
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        help_text='When the client was last updated'
    )

    class Meta:
        db_table = 'clients'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status'], name='clients_status_idx'),
            models.Index(fields=['source'], name='clients_source_idx'),
            models.Index(fields=['created_at'], name='clients_created_at_idx'),
            models.Index(fields=['assigned_to'], name='clients_assigned_to_idx'),
            models.Index(fields=['phone'], name='clients_phone_idx'),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.phone})"

    @property
    def effective_sla_minutes(self):
        """Get effective SLA in minutes from the channel cascade."""
        if self.source:
            return self.source.effective_sla_minutes
        return None

    @property
    def sla_deadline(self):
        """Calculate SLA deadline based on created_at and effective SLA."""
        sla_minutes = self.effective_sla_minutes
        if sla_minutes is None:
            return None
        return self.created_at + timedelta(minutes=sla_minutes)

    @property
    def sla_timer(self) -> dict:
        """
        Calculate SLA timer status.

        Returns:
            dict with keys:
                - effective_sla_minutes: The SLA configuration
                - elapsed_minutes: Minutes since creation
                - remaining_minutes: Minutes until deadline (negative if overdue)
                - is_overdue: Boolean indicating if SLA is breached
                - display: Human-readable string
        """
        deadline = self.sla_deadline
        sla_minutes = self.effective_sla_minutes

        if deadline is None:
            return {
                'effective_sla_minutes': None,
                'elapsed_minutes': 0,
                'remaining_minutes': None,
                'is_overdue': False,
                'display': 'No SLA'
            }

        now = timezone.now()
        elapsed = now - self.created_at
        elapsed_minutes = int(elapsed.total_seconds() / 60)

        remaining = deadline - now
        remaining_minutes = int(remaining.total_seconds() / 60)
        is_overdue = remaining_minutes < 0

        if is_overdue:
            display = format_sla_duration(abs(remaining_minutes), 'overdue')
        else:
            display = format_sla_duration(remaining_minutes, 'remaining')

        return {
            'effective_sla_minutes': sla_minutes,
            'elapsed_minutes': elapsed_minutes,
            'remaining_minutes': remaining_minutes,
            'is_overdue': is_overdue,
            'display': display
        }

    @property
    def is_terminal(self) -> bool:
        """Check if client is in a terminal state (declined, not_proceeding)."""
        return self.status in [ClientStatus.DECLINED, ClientStatus.NOT_PROCEEDING]

    @property
    def first_contact_sla_status(self) -> dict | None:
        """
        Calculate First Contact SLA status.

        Only applies to clients converted from leads.
        Clients created directly from trusted channels do not have First Contact SLA.

        Returns:
            dict with keys or None if not applicable:
                - status: 'ok' | 'warning' | 'overdue' | 'completed'
                - remaining_hours: int (negative if overdue)
                - display: Human-readable string (e.g., "12h remaining", "2d overdue")
        """
        # First Contact SLA only applies to clients converted from leads
        if not self.converted_from_lead_id:
            return None

        # If client is terminal, SLA is completed
        if self.is_terminal:
            return {
                'status': 'completed',
                'remaining_hours': 0,
                'display': 'Completed'
            }

        # If first contact is already completed, show completed status
        if self.first_contact_completed_at:
            return {
                'status': 'completed',
                'remaining_hours': 0,
                'display': 'Completed'
            }

        sla_minutes = self.effective_sla_minutes
        if sla_minutes is None:
            return {
                'status': 'ok',
                'remaining_hours': None,
                'display': 'No SLA configured'
            }

        deadline = self.sla_deadline
        now = timezone.now()
        remaining = deadline - now
        remaining_minutes = int(remaining.total_seconds() / 60)
        remaining_hours = remaining_minutes // 60

        # Determine status based on thresholds
        if remaining_minutes < 0:
            status = 'overdue'
            display = format_sla_duration(abs(remaining_minutes), 'overdue')
        elif remaining_minutes < (sla_minutes * 0.5):  # Less than 50% remaining
            status = 'warning'
            display = format_sla_duration(remaining_minutes, 'remaining')
        else:
            status = 'ok'
            display = format_sla_duration(remaining_minutes, 'remaining')

        return {
            'status': status,
            'remaining_hours': remaining_hours,
            'display': display
        }

    @property
    def client_to_case_sla_status(self) -> dict | None:
        """
        Calculate Client-to-Case SLA status.

        Only applies to direct clients (from trusted channels).
        Clients converted from leads use First Contact SLA instead.
        Uses ClientToCaseSLAConfig for SLA hours (default 168h = 7 days).

        Returns:
            dict with keys or None if not applicable:
                - status: 'ok' | 'warning' | 'overdue' | 'completed'
                - remaining_hours: int (negative if overdue)
                - display: Human-readable string
        """
        # Client to Case SLA only applies to direct clients (not converted from leads)
        if self.converted_from_lead_id:
            return None

        # If client is terminal, SLA is completed
        if self.is_terminal:
            return {
                'status': 'completed',
                'remaining_hours': 0,
                'display': 'Completed'
            }

        # Check if a case already exists for this client
        # Use prefetch cache if available to avoid N+1
        if hasattr(self, '_prefetched_objects_cache') and 'cases' in self._prefetched_objects_cache:
            has_cases = bool(self._prefetched_objects_cache['cases'])
        else:
            has_cases = self.cases.exists()

        if has_cases:
            return {
                'status': 'completed',
                'remaining_hours': 0,
                'display': 'Completed'
            }

        # Direct client from trusted channel: SLA starts from creation
        sla_start = self.created_at

        # Get SLA configuration
        from cases.models import ClientToCaseSLAConfig
        config = ClientToCaseSLAConfig.get_config()
        sla_hours = config.sla_hours

        # Calculate deadline from SLA start time
        deadline = sla_start + timedelta(hours=sla_hours)
        now = timezone.now()
        remaining = deadline - now
        remaining_minutes = int(remaining.total_seconds() / 60)
        remaining_hours = remaining_minutes // 60
        sla_minutes = sla_hours * 60

        # Determine status based on thresholds
        if remaining_minutes < 0:
            status = 'overdue'
            display = format_sla_duration(abs(remaining_minutes), 'overdue')
        elif remaining_minutes < (sla_minutes * 0.5):  # Less than 50% remaining
            status = 'warning'
            display = format_sla_duration(remaining_minutes, 'remaining')
        else:
            status = 'ok'
            display = format_sla_duration(remaining_minutes, 'remaining')

        return {
            'status': status,
            'remaining_hours': remaining_hours,
            'display': display
        }

    def clean(self) -> None:
        """Validate model fields."""
        super().clean()

        # Only validate source on creation (not on updates)
        if self._state.adding and self.source_id:
            try:
                source = Source.objects.select_related(
                    'channel'
                ).get(pk=self.source_id)

                if not source.channel.is_trusted and not self.converted_from_lead_id:
                    raise ValidationError({
                        'source': 'Clients can only be created from trusted channels or converted from leads.'
                    })
            except Source.DoesNotExist:
                raise ValidationError({
                    'source': 'Invalid source.'
                })

    def save(self, *args, **kwargs) -> None:
        """Run full clean before saving and set assigned_to default."""
        # Set assigned_to to created_by if not provided (for new records)
        if self._state.adding and not self.assigned_to_id:
            # Try to get created_by from AuditableModel context
            from audit.models import get_audit_user
            user_id = get_audit_user()
            if user_id:
                self.assigned_to_id = user_id

        self.full_clean()
        super().save(*args, **kwargs)

    # Computed Properties

    @property
    def total_cc_liability(self) -> Decimal:
        """Calculate total credit card liability (5% of each limit)."""
        cc_limits = [
            self.cc_1_limit,
            self.cc_2_limit,
            self.cc_3_limit,
            self.cc_4_limit,
            self.cc_5_limit,
        ]
        total = Decimal('0.00')
        for limit in cc_limits:
            if limit:
                total += limit * Decimal('0.05')
        return total

    @property
    def total_loan_emis(self) -> Decimal:
        """Calculate total loan EMIs."""
        emis = [
            self.auto_loan_emi,
            self.personal_loan_emi,
            self.existing_mortgage_emi,
        ]
        total = Decimal('0.00')
        for emi in emis:
            if emi:
                total += emi
        return total

    @property
    def total_monthly_liabilities(self) -> Decimal:
        """Calculate total monthly liabilities."""
        return self.total_cc_liability + self.total_loan_emis

    def _get_combined_salary(self) -> Decimal:
        """Get combined salary for single or joint application."""
        total = self.monthly_salary or Decimal('0.00')
        if self.application_type == ApplicationType.JOINT:
            try:
                co_applicant = self.co_applicant
                if co_applicant and co_applicant.monthly_salary:
                    total += co_applicant.monthly_salary
            except CoApplicant.DoesNotExist:
                pass
        return total

    def _get_total_income(self) -> Decimal:
        """
        Get total income including salary, addbacks, and co-applicant salary.
        Used for DBR and max loan calculations.
        """
        total = self._get_combined_salary()
        if self.total_addbacks:
            total += self.total_addbacks
        return total

    def _get_combined_liabilities(self) -> Decimal:
        """Get combined liabilities for single or joint application."""
        total = self.total_monthly_liabilities
        if self.application_type == ApplicationType.JOINT:
            try:
                co_applicant = self.co_applicant
                if co_applicant:
                    total += co_applicant.total_monthly_liabilities
            except CoApplicant.DoesNotExist:
                pass
        return total

    @property
    def dbr_available(self) -> Decimal:
        """
        Calculate DBR (Debt Burden Ratio) available.
        Formula: (Total Income / 2) - Combined Liabilities
        Total Income = Salary + Addbacks + Co-applicant Salary (if joint)
        """
        total_income = self._get_total_income()
        if not total_income or total_income <= 0:
            return Decimal('0.00')

        combined_liabilities = self._get_combined_liabilities()
        half_income = total_income / Decimal('2')
        return half_income - combined_liabilities

    @property
    def dbr_percentage(self) -> Decimal:
        """
        Calculate DBR (Debt Burden Ratio) as percentage.
        Formula: (Combined Liabilities / Total Income) * 100
        Standard bank metric - capped at 50% typically.
        Example: Income 20,000, Liabilities 6,000 -> DBR = 30%
        """
        total_income = self._get_total_income()
        if not total_income or total_income <= 0:
            return Decimal('0.00')

        combined_liabilities = self._get_combined_liabilities()
        return (combined_liabilities / total_income) * Decimal('100')

    @property
    def max_loan_amount(self) -> Decimal:
        """
        Calculate maximum loan amount.
        Formula: Total Income * 68
        Total Income = Salary + Addbacks + Co-applicant Salary (if joint)
        """
        total_income = self._get_total_income()
        if not total_income:
            return Decimal('0.00')
        return total_income * Decimal('68')

    @property
    def ltv(self) -> Decimal | None:
        """
        Calculate LTV (Loan to Value) ratio.
        Formula: (Loan Amount / Property Value) * 100
        Returns None if property_value or loan_amount is not set.
        """
        if not self.property_value or not self.loan_amount:
            return None
        if self.property_value <= 0:
            return None
        return (self.loan_amount / self.property_value) * Decimal('100')

    @property
    def ltv_limit(self) -> int:
        """
        Get LTV limit based on property type and first property status.
        - Off-plan: 50%
        - Ready, first property: 80%
        - Ready, second+ property: 65%
        """
        if self.property_type == PropertyType.OFF_PLAN:
            return 50
        return 80 if self.is_first_property else 65

    @property
    def ltv_status(self) -> dict:
        """
        Get LTV status with value, limit, and whether it's within limit.
        """
        ltv_value = self.ltv
        ltv_limit = self.ltv_limit

        if ltv_value is None:
            return {
                'ltv': None,
                'limit': ltv_limit,
                'within_limit': None,
                'display': '-'
            }

        within_limit = ltv_value <= ltv_limit
        return {
            'ltv': float(ltv_value),
            'limit': ltv_limit,
            'within_limit': within_limit,
            'display': f"{ltv_value:.1f}%"
        }

    @property
    def can_create_case(self) -> dict:
        """
        Check if client can create a case.
        Checks all required fields are filled.

        Returns:
            dict with 'valid' (bool) and 'reasons' (list of missing fields)
        """
        reasons = []

        # Required client fields
        if not self.name:
            reasons.append('Name is required')
        if not self.phone:
            reasons.append('Phone is required')
        if not self.email:
            reasons.append('Email is required')
        if not self.date_of_birth:
            reasons.append('Date of birth is required')
        if not self.nationality:
            reasons.append('Nationality is required')
        if not self.residency:
            reasons.append('Residency is required')
        if not self.employment_type:
            reasons.append('Employment type is required')
        if not self.monthly_salary or self.monthly_salary <= 0:
            reasons.append('Monthly salary is required')

        # Property and loan details required for case creation
        if self.property_value is None or self.property_value <= Decimal('0'):
            reasons.append('Property value is required')
        if self.loan_amount is None or self.loan_amount <= Decimal('0'):
            reasons.append('Loan amount is required')

        # For joint applications, must have co-applicant with required fields
        if self.application_type == ApplicationType.JOINT:
            try:
                co_applicant = self.co_applicant
                if not co_applicant:
                    reasons.append('Co-applicant is required for joint application')
                else:
                    if not co_applicant.name:
                        reasons.append('Co-applicant name is required')
                    if not co_applicant.phone:
                        reasons.append('Co-applicant phone is required')
                    if not co_applicant.email:
                        reasons.append('Co-applicant email is required')
                    if not co_applicant.monthly_salary or co_applicant.monthly_salary <= 0:
                        reasons.append('Co-applicant monthly salary is required')
            except CoApplicant.DoesNotExist:
                reasons.append('Co-applicant is required for joint application')

        return {
            'valid': len(reasons) == 0,
            'reasons': reasons
        }

    def mark_first_contact_complete(self) -> None:
        """
        Mark first contact as completed if not already set.
        Called by signals when qualifying events occur.
        """
        if not self.first_contact_completed_at:
            self.first_contact_completed_at = timezone.now()
            self.save(update_fields=['first_contact_completed_at', 'updated_at'])


class CoApplicant(AuditableModel):
    """
    Co-applicant model for joint mortgage applications.

    Contains identity, income, and liability information for the
    co-applicant. Each client can have at most one co-applicant.
    """

    # Primary key
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text='Unique identifier for the co-applicant'
    )

    # Link to client (OneToOne ensures only one co-applicant per client)
    client = models.OneToOneField(
        Client,
        on_delete=models.CASCADE,
        related_name='co_applicant',
        help_text='The primary client this co-applicant is associated with'
    )

    # Identity Fields
    name = models.CharField(
        max_length=255,
        help_text='Full name of the co-applicant'
    )

    phone = models.CharField(
        max_length=20,
        blank=True,
        default='',
        help_text='Phone number'
    )

    email = models.EmailField(
        max_length=255,
        blank=True,
        default='',
        validators=[EmailValidator(message='Enter a valid email address.')],
        help_text='Email address (optional)'
    )

    emirates_id = models.CharField(
        max_length=20,
        blank=True,
        default='',
        help_text='Emirates ID number (optional)'
    )

    residency = models.CharField(
        max_length=20,
        choices=ResidencyType.choices,
        default=ResidencyType.UAE_RESIDENT,
        help_text='Residency status'
    )

    visa_type = models.CharField(
        max_length=20,
        choices=VisaType.choices,
        blank=True,
        default='',
        help_text='Visa type (optional)'
    )

    # Income Fields
    employment_type = models.CharField(
        max_length=20,
        choices=EmploymentType.choices,
        default=EmploymentType.SALARIED,
        help_text='Employment type'
    )

    monthly_salary = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Monthly salary amount'
    )

    company_name = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='Employer company name (optional)'
    )

    # Liabilities - Credit Cards
    cc_1_limit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Credit card 1 limit (optional)'
    )

    cc_2_limit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Credit card 2 limit (optional)'
    )

    cc_3_limit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Credit card 3 limit (optional)'
    )

    cc_4_limit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Credit card 4 limit (optional)'
    )

    cc_5_limit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Credit card 5 limit (optional)'
    )

    # Liabilities - Loans
    auto_loan_emi = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Auto loan EMI (optional)'
    )

    personal_loan_emi = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Personal loan EMI (optional)'
    )

    existing_mortgage_emi = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Existing mortgage EMI (optional)'
    )

    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text='When the co-applicant was created'
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        help_text='When the co-applicant was last updated'
    )

    class Meta:
        db_table = 'co_applicants'
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"Co-applicant: {self.name} (for {self.client.name})"

    # Computed Properties

    @property
    def total_cc_liability(self) -> Decimal:
        """Calculate total credit card liability (5% of each limit)."""
        cc_limits = [
            self.cc_1_limit,
            self.cc_2_limit,
            self.cc_3_limit,
            self.cc_4_limit,
            self.cc_5_limit,
        ]
        total = Decimal('0.00')
        for limit in cc_limits:
            if limit:
                total += limit * Decimal('0.05')
        return total

    @property
    def total_loan_emis(self) -> Decimal:
        """Calculate total loan EMIs."""
        emis = [
            self.auto_loan_emi,
            self.personal_loan_emi,
            self.existing_mortgage_emi,
        ]
        total = Decimal('0.00')
        for emi in emis:
            if emi:
                total += emi
        return total

    @property
    def total_monthly_liabilities(self) -> Decimal:
        """Calculate total monthly liabilities."""
        return self.total_cc_liability + self.total_loan_emis


class ClientExtraDetails(AuditableModel):
    """
    Extra details for client - supplementary information for bank forms.

    Contains personal, work, address, and reference information that
    varies based on residency and employment type. Stored separately
    to keep the Client model clean.
    """

    # Primary key
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text='Unique identifier'
    )

    # Link to client (OneToOne ensures only one extra details per client)
    client = models.OneToOneField(
        Client,
        on_delete=models.CASCADE,
        related_name='extra_details',
        help_text='The client this extra details belongs to'
    )

    # Personal Information
    marital_status = models.CharField(
        max_length=20,
        choices=MaritalStatus.choices,
        blank=True,
        default='',
        help_text='Marital status'
    )

    spouse_name = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='Spouse name (if married)'
    )

    spouse_contact = models.CharField(
        max_length=50,
        blank=True,
        default='',
        help_text='Spouse contact number'
    )

    dependents = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Number of dependents'
    )

    children_count = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Number of children'
    )

    children_in_school = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Number of children in school'
    )

    qualification = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text='Education qualification'
    )

    mailing_address = models.TextField(
        blank=True,
        default='',
        help_text='Mailing/correspondence address'
    )

    mother_maiden_name = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text='Mother\'s maiden name (for bank security)'
    )

    # Work Details
    job_title = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text='Job title (salaried)'
    )

    company_industry = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text='Company industry/sector'
    )

    years_in_occupation = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Years in current occupation (salaried)'
    )

    years_in_current_company = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Years in current company (salaried)'
    )

    years_in_business = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Years in business (self-employed)'
    )

    company_employee_count = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Number of employees in organization'
    )

    office_address = models.TextField(
        blank=True,
        default='',
        help_text='Office address'
    )

    office_po_box = models.CharField(
        max_length=20,
        blank=True,
        default='',
        help_text='Office PO Box'
    )

    office_landline = models.CharField(
        max_length=20,
        blank=True,
        default='',
        help_text='Office landline number'
    )

    work_email = models.EmailField(
        max_length=255,
        blank=True,
        default='',
        help_text='Work email address (salaried)'
    )

    company_hr_email = models.EmailField(
        max_length=255,
        blank=True,
        default='',
        help_text='Company HR email for verification (salaried)'
    )

    # References (2 people)
    ref_1_name = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='Reference 1 name'
    )

    ref_1_relationship = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text='Reference 1 relationship'
    )

    ref_1_mobile = models.CharField(
        max_length=20,
        blank=True,
        default='',
        help_text='Reference 1 mobile'
    )

    ref_2_name = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='Reference 2 name'
    )

    ref_2_relationship = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text='Reference 2 relationship'
    )

    ref_2_mobile = models.CharField(
        max_length=20,
        blank=True,
        default='',
        help_text='Reference 2 mobile'
    )

    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text='When the extra details were created'
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        help_text='When the extra details were last updated'
    )

    class Meta:
        db_table = 'client_extra_details'
        verbose_name = 'Client Extra Details'
        verbose_name_plural = 'Client Extra Details'

    def __str__(self) -> str:
        return f"Extra Details for {self.client.name}"
