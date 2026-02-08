"""
Case model for Rivo OS Mortgage Management.

Cases represent active mortgage applications being processed through the bank workflow.
They are created from qualified Clients who pass eligibility checks.
"""

import uuid
from datetime import timedelta
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.utils import timezone

from audit.models import AuditableModel
from clients.models import Client, ApplicationType, PropertyType, TransactionType
from common.sla import format_sla_duration


class CaseStage(models.TextChoices):
    """
    Stage choices for cases.

    Active stages: Processing through the mortgage workflow
    Query stages: Sales Queries, Credit Queries, Disbursal Queries (side tracks)
    Hold: on_hold (SLA timer pauses)
    Terminal: property_transferred, rejected, not_proceeding (no SLA)
    """
    # Active stages (main flow)
    PROCESSING = 'processing', 'Processing'
    SUBMITTED_TO_BANK = 'submitted_to_bank', 'Submitted to Bank'
    UNDER_REVIEW = 'under_review', 'Under Review'
    SUBMITTED_TO_CREDIT = 'submitted_to_credit', 'Submitted to Credit'
    PREAPPROVED = 'preapproved', 'Preapproved'
    VALUATION_INITIATED = 'valuation_initiated', 'Valuation Initiated'
    VALUATION_REPORT_RECEIVED = 'valuation_report_received', 'Valuation Report Received'
    FOL_REQUESTED = 'fol_requested', 'FOL Requested'
    FOL_RECEIVED = 'fol_received', 'FOL Received'
    FOL_SIGNED = 'fol_signed', 'FOL Signed'
    DISBURSED = 'disbursed', 'Disbursed'
    FINAL_DOCUMENTS = 'final_documents', 'Final Documents'
    MC_RECEIVED = 'mc_received', 'MC Received'

    # Query stages (side tracks that return to main flow)
    SALES_QUERIES = 'sales_queries', 'Sales Queries'
    CREDIT_QUERIES = 'credit_queries', 'Credit Queries'
    DISBURSAL_QUERIES = 'disbursal_queries', 'Disbursal Queries'

    # Hold stage (SLA timer pauses)
    ON_HOLD = 'on_hold', 'On Hold'

    # Terminal stages (no SLA)
    PROPERTY_TRANSFERRED = 'property_transferred', 'Property Transferred'
    REJECTED = 'rejected', 'Rejected'
    NOT_PROCEEDING = 'not_proceeding', 'Not Proceeding'


# Terminal stages that cannot be transitioned from
TERMINAL_STAGES = {
    CaseStage.PROPERTY_TRANSFERRED,
    CaseStage.REJECTED,
    CaseStage.NOT_PROCEEDING,
}

# Active stages for filtering (includes query stages)
ACTIVE_STAGES = {
    CaseStage.PROCESSING,
    CaseStage.SUBMITTED_TO_BANK,
    CaseStage.UNDER_REVIEW,
    CaseStage.SUBMITTED_TO_CREDIT,
    CaseStage.PREAPPROVED,
    CaseStage.VALUATION_INITIATED,
    CaseStage.VALUATION_REPORT_RECEIVED,
    CaseStage.FOL_REQUESTED,
    CaseStage.FOL_RECEIVED,
    CaseStage.FOL_SIGNED,
    CaseStage.DISBURSED,
    CaseStage.FINAL_DOCUMENTS,
    CaseStage.MC_RECEIVED,
    CaseStage.SALES_QUERIES,
    CaseStage.CREDIT_QUERIES,
    CaseStage.DISBURSAL_QUERIES,
}

# Query stages (side tracks)
QUERY_STAGES = {
    CaseStage.SALES_QUERIES,
    CaseStage.CREDIT_QUERIES,
    CaseStage.DISBURSAL_QUERIES,
}


class RateType(models.TextChoices):
    """Rate type choices for bank products."""
    FIXED = 'fixed', 'Fixed'
    VARIABLE = 'variable', 'Variable'


class MortgageType(models.TextChoices):
    """Mortgage type choices."""
    CONVENTIONAL = 'conventional', 'Conventional'
    ISLAMIC = 'islamic', 'Islamic'


class PropertyCategory(models.TextChoices):
    """Property category choices."""
    RESIDENTIAL = 'residential', 'Residential'
    COMMERCIAL = 'commercial', 'Commercial'


class CaseType(models.TextChoices):
    """Case type choices - Fully Packaged vs Assisted."""
    FULLY_PACKAGED = 'fully_packaged', 'Fully Packaged'
    ASSISTED = 'assisted', 'Assisted'


class Emirate(models.TextChoices):
    """UAE Emirates choices."""
    DUBAI = 'dubai', 'Dubai'
    ABU_DHABI = 'abu_dhabi', 'Abu Dhabi'
    SHARJAH = 'sharjah', 'Sharjah'
    AJMAN = 'ajman', 'Ajman'
    RAS_AL_KHAIMAH = 'ras_al_khaimah', 'Ras Al Khaimah'
    FUJAIRAH = 'fujairah', 'Fujairah'
    UMM_AL_QUWAIN = 'umm_al_quwain', 'Umm Al Quwain'


class FixedPeriod(models.TextChoices):
    """Fixed rate period choices."""
    ONE_YEAR = '1', '1 Year'
    TWO_YEARS = '2', '2 Years'
    THREE_YEARS = '3', '3 Years'
    FOUR_YEARS = '4', '4 Years'
    FIVE_YEARS = '5', '5 Years'


class InsurancePaymentPeriod(models.TextChoices):
    """Insurance payment period choices."""
    MONTHLY = 'monthly', 'Monthly'
    ANNUALLY = 'annually', 'Annually'


class Bank(models.Model):
    """
    Bank model representing a financial institution offering mortgage products.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text='Unique identifier for the bank'
    )

    external_id = models.UUIDField(
        unique=True,
        null=True,
        blank=True,
        help_text='External ID for reference'
    )

    name = models.CharField(
        max_length=255,
        help_text='Bank name/title'
    )

    logo = models.URLField(
        max_length=500,
        blank=True,
        default='',
        help_text='Bank logo URL'
    )

    icon = models.URLField(
        max_length=500,
        blank=True,
        default='',
        help_text='Bank icon URL'
    )

    minimum_loan_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Minimum loan amount in AED'
    )

    maximum_loan_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Maximum loan amount in AED'
    )

    minimum_account_opening_duration_days = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Minimum days for account opening'
    )

    disbursal_turn_around_days = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Days for loan disbursal'
    )

    fol_turn_around_time_days = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Days for FOL turnaround'
    )

    valuation_turn_around_time_days = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Days for property valuation'
    )

    transfer_turn_around_time_days = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Days for property transfer'
    )

    total_expected_turn_around_time_days = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Total expected turnaround time in days'
    )

    has_early_settlement_fee = models.BooleanField(
        default=False,
        help_text='Whether early settlement fee applies'
    )

    early_settlement_fee_percentage = models.CharField(
        max_length=20,
        blank=True,
        default='',
        help_text='Early settlement fee percentage'
    )

    has_partial_settlement_fee = models.BooleanField(
        default=False,
        help_text='Whether partial settlement fee applies'
    )

    partial_settlement_fee_percentage = models.CharField(
        max_length=20,
        blank=True,
        default='',
        help_text='Partial settlement fee percentage'
    )

    life_insurance_payment_period = models.CharField(
        max_length=20,
        choices=InsurancePaymentPeriod.choices,
        blank=True,
        default='',
        help_text='Life insurance payment period'
    )

    property_insurance_payment_period = models.CharField(
        max_length=20,
        choices=InsurancePaymentPeriod.choices,
        blank=True,
        default='',
        help_text='Property insurance payment period'
    )

    supported_mortgage_types = models.JSONField(
        default=list,
        blank=True,
        help_text='List of supported mortgage types'
    )

    is_active = models.BooleanField(
        default=True,
        help_text='Whether the bank is active'
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text='When the bank was created'
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        help_text='When the bank was last updated'
    )

    class Meta:
        db_table = 'banks'
        ordering = ['name']

    def __str__(self) -> str:
        return self.name


class Case(AuditableModel):
    """
    Case model representing a mortgage application in progress.

    Contains property details, loan information, bank product selection,
    and stage tracking for the application workflow.
    """

    # Primary key
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text='Unique identifier for the case'
    )

    # Deal Information
    client = models.ForeignKey(
        Client,
        on_delete=models.PROTECT,
        related_name='cases',
        help_text='Client associated with this case'
    )

    application_type = models.CharField(
        max_length=10,
        choices=ApplicationType.choices,
        help_text='Single or joint application (copied from client)'
    )

    # Case Type
    case_type = models.CharField(
        max_length=20,
        choices=CaseType.choices,
        default=CaseType.FULLY_PACKAGED,
        help_text='Case type (Fully Packaged or Assisted)'
    )

    # Property Information
    property_category = models.CharField(
        max_length=20,
        choices=PropertyCategory.choices,
        default=PropertyCategory.RESIDENTIAL,
        help_text='Property category (Residential or Commercial)'
    )

    property_type = models.CharField(
        max_length=20,
        choices=PropertyType.choices,
        help_text='Property type (Ready or Off-Plan)'
    )

    emirate = models.CharField(
        max_length=20,
        choices=Emirate.choices,
        default=Emirate.DUBAI,
        help_text='UAE Emirate where property is located'
    )

    transaction_type = models.CharField(
        max_length=20,
        choices=TransactionType.choices,
        help_text='Transaction type (Purchase, Refinance, Equity Release)'
    )

    property_value = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text='Property value amount'
    )

    developer = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='Developer name (for off-plan properties)'
    )

    project_name = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='Project name (optional)'
    )

    location = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='Property location (optional)'
    )

    is_first_property = models.BooleanField(
        default=True,
        help_text='Whether this is the first property for LTV calculation'
    )

    # Loan Information
    loan_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text='Loan amount requested'
    )

    tenure_years = models.PositiveIntegerField(
        validators=[
            MinValueValidator(1),
            MaxValueValidator(25),
        ],
        help_text='Loan tenure in years (1-25)'
    )

    tenure_months = models.PositiveIntegerField(
        default=0,
        validators=[
            MinValueValidator(0),
            MaxValueValidator(11),
        ],
        help_text='Additional tenure in months (0-11)'
    )

    # Bank Product Information
    bank = models.CharField(
        max_length=100,
        help_text='Bank name'
    )

    mortgage_type = models.CharField(
        max_length=20,
        choices=MortgageType.choices,
        default=MortgageType.CONVENTIONAL,
        help_text='Mortgage type (Conventional or Islamic)'
    )

    rate_type = models.CharField(
        max_length=10,
        choices=RateType.choices,
        help_text='Rate type (Fixed or Variable)'
    )

    rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text='Interest rate percentage'
    )

    fixed_period = models.CharField(
        max_length=5,
        choices=FixedPeriod.choices,
        blank=True,
        default='',
        help_text='Fixed rate period in years (if rate type is fixed)'
    )

    # Stage & Status
    stage = models.CharField(
        max_length=30,
        choices=CaseStage.choices,
        default=CaseStage.PROCESSING,
        help_text='Current stage of the case'
    )

    stage_changed_at = models.DateTimeField(
        default=timezone.now,
        help_text='When the stage was last changed'
    )

    # Owner assignment for SLA tracking
    assigned_to = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_cases',
        help_text='User assigned to this case'
    )

    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text='When the case was created'
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        help_text='When the case was last updated'
    )

    class Meta:
        db_table = 'cases'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['stage'], name='cases_stage_idx'),
            models.Index(fields=['client'], name='cases_client_idx'),
            models.Index(fields=['created_at'], name='cases_created_at_idx'),
            models.Index(fields=['assigned_to'], name='cases_assigned_to_idx'),
        ]
        verbose_name_plural = 'cases'

    def __str__(self) -> str:
        return f"Case {self.id} - {self.client.name}"

    def clean(self) -> None:
        """Validate model fields."""
        super().clean()

        # Validate tenure years range
        if self.tenure_years is not None:
            if self.tenure_years < 1 or self.tenure_years > 25:
                raise ValidationError({
                    'tenure_years': 'Tenure must be between 1 and 25 years.'
                })

        # Validate tenure months range
        if self.tenure_months is not None:
            if self.tenure_months < 0 or self.tenure_months > 11:
                raise ValidationError({
                    'tenure_months': 'Tenure months must be between 0 and 11.'
                })

        # Validate property value and loan amount are positive
        if self.property_value is not None and self.property_value <= 0:
            raise ValidationError({
                'property_value': 'Property value must be positive.'
            })

        if self.loan_amount is not None and self.loan_amount <= 0:
            raise ValidationError({
                'loan_amount': 'Loan amount must be positive.'
            })

    def save(self, *args, **kwargs) -> None:
        """Run validation before saving and set assigned_to default."""
        # Set assigned_to to created_by if not provided (for new records)
        if self._state.adding and not self.assigned_to_id:
            # Try to get created_by from AuditableModel context
            from audit.models import get_audit_user
            user_id = get_audit_user()
            if user_id:
                self.assigned_to_id = user_id

        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def ltv_percentage(self) -> Decimal:
        """
        Calculate LTV (Loan to Value) percentage.
        Formula: (Loan Amount / Property Value) * 100
        """
        if not self.property_value or self.property_value == 0:
            return Decimal('0.00')
        return (self.loan_amount / self.property_value) * Decimal('100')

    @property
    def ltv_limit(self) -> Decimal:
        """
        Calculate LTV limit based on residency, is_first_property, and property_type.

        Limits per spec:
        | Profile                        | Ready  | Off-Plan |
        |--------------------------------|--------|----------|
        | UAE Resident - First Property  | 80%    | 50%      |
        | UAE Resident - Second Property | 65%    | 50%      |
        | Non-Resident                   | 60%    | 50%      |

        Joint: Use more restrictive limit if one is Non-Resident
        """
        from clients.models import ResidencyType

        # Off-Plan always caps at 50%
        if self.property_type == PropertyType.OFF_PLAN:
            return Decimal('50.00')

        # Get residency from client
        residency = self.client.residency

        # For joint applications, check co-applicant residency too
        if self.application_type == ApplicationType.JOINT and self.client.co_applicant:
            co_residency = self.client.co_applicant.residency
            # Use more restrictive: if either is Non-Resident, use Non-Resident limits
            if (residency == ResidencyType.NON_RESIDENT or
                co_residency == ResidencyType.NON_RESIDENT):
                return Decimal('60.00')

        # Non-Resident: 60%
        if residency == ResidencyType.NON_RESIDENT:
            return Decimal('60.00')

        # UAE National or UAE Resident
        if self.is_first_property:
            return Decimal('80.00')
        else:
            return Decimal('65.00')

    @property
    def is_terminal(self) -> bool:
        """Check if the case is in a terminal stage."""
        return self.stage in TERMINAL_STAGES

    @property
    def is_active(self) -> bool:
        """Check if the case is in an active stage."""
        return self.stage in ACTIVE_STAGES

    @property
    def is_on_hold(self) -> bool:
        """Check if the case is on hold."""
        return self.stage == CaseStage.ON_HOLD

    @property
    def stage_sla_status(self) -> dict:
        """
        Calculate Stage SLA status for the current stage.

        Uses StageSLAConfig for the current stage transition.
        Calculates from stage_changed_at timestamp.

        Returns:
            dict with keys:
                - status: 'ok' | 'warning' | 'overdue' | 'no_sla' | 'completed'
                - remaining_hours: int (negative if overdue), None if no SLA
                - display: Human-readable string
                - stage: Current stage display name
        """
        # Terminal stages show as completed
        if self.is_terminal:
            return {
                'status': 'completed',
                'remaining_hours': None,
                'display': 'Completed',
                'stage': self.get_stage_display()
            }

        # On hold has no SLA
        if self.is_on_hold:
            return {
                'status': 'no_sla',
                'remaining_hours': None,
                'display': 'On Hold',
                'stage': self.get_stage_display()
            }

        # Get SLA config for current stage
        sla_hours = StageSLAConfig.get_sla_for_stage(self.stage)

        if sla_hours is None:
            return {
                'status': 'no_sla',
                'remaining_hours': None,
                'display': 'No SLA configured',
                'stage': self.get_stage_display()
            }

        # Calculate deadline from stage_changed_at
        deadline = self.stage_changed_at + timedelta(hours=sla_hours)
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
            'display': display,
            'stage': self.get_stage_display()
        }

    def can_transition_to(self, new_stage: str) -> tuple[bool, str]:
        """
        Check if the case can transition to a new stage.

        Args:
            new_stage: The stage to transition to

        Returns:
            Tuple of (can_transition, reason)
        """
        # Cannot transition from terminal stages
        if self.is_terminal:
            return False, f"Cannot transition from terminal stage '{self.get_stage_display()}'."

        # Validate new stage is a valid choice
        if new_stage not in CaseStage.values:
            return False, f"Invalid stage: '{new_stage}'."

        return True, ""

    def change_stage(self, new_stage: str) -> None:
        """
        Change the case stage with validation.

        Args:
            new_stage: The new stage to set

        Raises:
            ValidationError: If the transition is not allowed
        """
        can_transition, reason = self.can_transition_to(new_stage)
        if not can_transition:
            raise ValidationError({'stage': reason})

        self.stage = new_stage
        self.stage_changed_at = timezone.now()
        self.save()


class StageSLAConfig(models.Model):
    """
    Configuration for SLA (Service Level Agreement) time per stage.

    Defines how long a case can stay in a stage before it's considered overdue.
    Admin can configure these values. SLA is defined as time to move FROM this stage.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    from_stage = models.CharField(
        max_length=50,
        choices=CaseStage.choices,
        help_text='The stage this SLA applies to'
    )

    to_stage = models.CharField(
        max_length=50,
        choices=CaseStage.choices,
        help_text='The expected next stage'
    )

    sla_hours = models.PositiveIntegerField(
        help_text='SLA time in hours for this stage transition'
    )

    breach_percent = models.PositiveIntegerField(
        default=120,
        help_text='Percentage of SLA time at which to flag as breached (e.g., 120 = breach at 120% of SLA)'
    )

    is_active = models.BooleanField(
        default=True,
        help_text='Whether this SLA config is active'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'stage_sla_configs'
        verbose_name = 'Stage SLA Configuration'
        verbose_name_plural = 'Stage SLA Configurations'
        unique_together = ['from_stage', 'to_stage']
        ordering = ['from_stage', 'to_stage']

    def __str__(self):
        return f"{self.get_from_stage_display()} -> {self.get_to_stage_display()}: {self.sla_hours}h"

    # Class-level cache for all SLA configs
    _sla_cache = None

    @classmethod
    def get_sla_for_stage(cls, stage: str) -> int | None:
        """
        Get the SLA hours for a given stage (cached).
        Returns the first active SLA config for this stage.
        """
        if cls._sla_cache is None:
            # Load all active configs into cache
            cls._sla_cache = {
                config.from_stage: config.sla_hours
                for config in cls.objects.filter(is_active=True)
            }
        return cls._sla_cache.get(stage)

    @classmethod
    def clear_cache(cls):
        """Clear the cached SLA configs (call after updates)."""
        cls._sla_cache = None

    @classmethod
    def seed_defaults(cls):
        """
        Seed default SLA configurations.
        Called during migrations or admin setup.
        """
        defaults = [
            # Main flow
            ('processing', 'submitted_to_bank', 24),  # 24 hours = 1 day
            ('submitted_to_bank', 'under_review', 24),  # 1 day
            ('under_review', 'submitted_to_credit', 72),  # 3 days
            ('submitted_to_credit', 'valuation_initiated', 120),  # 5 days
            ('valuation_initiated', 'valuation_report_received', 120),  # 5 days
            ('valuation_report_received', 'fol_requested', 48),  # 2 days
            ('fol_requested', 'fol_received', 120),  # 5 days
            ('fol_received', 'fol_signed', 72),  # 3 days
            ('fol_signed', 'disbursed', 120),  # 5 days
            ('disbursed', 'final_documents', 168),  # 7 days
            ('final_documents', 'mc_received', 336),  # 14 days
            ('mc_received', 'property_transferred', 720),  # 30 days

            # Query stages (side tracks back to main flow)
            ('sales_queries', 'submitted_to_credit', 48),  # 2 days
            ('credit_queries', 'valuation_initiated', 48),  # 2 days
            ('disbursal_queries', 'disbursed', 48),  # 2 days
        ]

        for from_stage, to_stage, hours in defaults:
            cls.objects.update_or_create(
                from_stage=from_stage,
                to_stage=to_stage,
                defaults={'sla_hours': hours, 'is_active': True}
            )


class ClientToCaseSLAConfig(models.Model):
    """
    SLA configuration for Client to Case conversion.

    Tracks the time allowed from client creation to first case creation.
    Default is 7 days. If breached, flags for escalation.
    """

    SLA_TYPES = [
        ('client_to_case', 'Client to Case'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    sla_type = models.CharField(
        max_length=50,
        choices=SLA_TYPES,
        unique=True,
        help_text='Type of global SLA'
    )

    sla_hours = models.PositiveIntegerField(
        help_text='SLA time in hours'
    )

    breach_percent = models.PositiveIntegerField(
        default=120,
        help_text='Percentage of SLA time at which to flag as breached'
    )

    description = models.TextField(
        blank=True,
        help_text='Description of what this SLA measures'
    )

    is_active = models.BooleanField(
        default=True,
        help_text='Whether this SLA config is active'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'client_to_case_sla_config'
        verbose_name = 'Client to Case SLA Configuration'
        verbose_name_plural = 'Client to Case SLA Configurations'

    def __str__(self):
        return f"{self.get_sla_type_display()}: {self.sla_hours}h"

    @classmethod
    def seed_defaults(cls):
        """Seed default Client to Case SLA configuration."""
        cls.objects.update_or_create(
            sla_type='client_to_case',
            defaults={
                'sla_hours': 168,  # 7 days
                'breach_percent': 120,
                'description': 'Time allowed from client creation to first case creation',
                'is_active': True
            }
        )

    # Class-level cache for SLA config
    _config_cache = None

    @classmethod
    def get_config(cls):
        """Get or create the Client to Case SLA config (cached)."""
        if cls._config_cache is None:
            cls._config_cache, _ = cls.objects.get_or_create(
                sla_type='client_to_case',
                defaults={
                    'sla_hours': 168,
                    'breach_percent': 120,
                    'description': 'Time allowed from client creation to first case creation',
                }
            )
        return cls._config_cache

    @classmethod
    def clear_cache(cls):
        """Clear the cached config (call after updates)."""
        cls._config_cache = None
