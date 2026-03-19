"""
Serializers for Client and CoApplicant models.

This module provides serializers for client CRUD operations,
co-applicant management, and eligibility calculations.
"""

from rest_framework import serializers

from clients.models import (
    Client,
    ClientStatus,
    CoApplicant,
    ClientExtraDetails,
    ApplicationType,
    ResidencyType,
    VisaType,
    EmploymentType,
    Timeline,
    PropertyCategory,
    PropertyType,
    Emirate,
    TransactionType,
    MaritalStatus,
)
from acquisition_channels.models import Source
from common.phone import validate_phone, normalize_phone


class SourceNestedSerializer(serializers.ModelSerializer):
    """Nested serializer for source in client responses."""
    channel_name = serializers.CharField(source='channel.name', read_only=True)
    channel_is_trusted = serializers.BooleanField(
        source='channel.is_trusted', read_only=True
    )
    effective_sla = serializers.IntegerField(source='effective_sla_minutes', read_only=True)

    class Meta:
        model = Source
        fields = [
            'id', 'name', 'channel_name', 'channel_is_trusted', 'effective_sla'
        ]


class AssignedUserSerializer(serializers.Serializer):
    """Serializer for assigned user in client/case responses."""
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)


class CoApplicantSerializer(serializers.ModelSerializer):
    """
    Serializer for co-applicant details.

    Returns identity, income, liability fields, and computed properties.
    """
    total_cc_liability = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    total_loan_emis = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    total_monthly_liabilities = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = CoApplicant
        fields = [
            # Identity
            'id', 'name', 'phone', 'email', 'emirates_id',
            'residency', 'visa_type',
            # Income
            'employment_type', 'monthly_salary', 'company_name',
            # Liabilities - Credit Cards
            'cc_1_limit', 'cc_2_limit', 'cc_3_limit', 'cc_4_limit', 'cc_5_limit',
            # Liabilities - Loans
            'auto_loan_emi', 'personal_loan_emi', 'existing_mortgage_emi',
            # Computed
            'total_cc_liability', 'total_loan_emis', 'total_monthly_liabilities',
            # Timestamps
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at',
            'total_cc_liability', 'total_loan_emis', 'total_monthly_liabilities',
        ]


class CoApplicantCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating co-applicant."""

    class Meta:
        model = CoApplicant
        fields = [
            # Identity
            'name', 'phone', 'email', 'emirates_id',
            'residency', 'visa_type',
            # Income
            'employment_type', 'monthly_salary', 'company_name',
            # Liabilities - Credit Cards
            'cc_1_limit', 'cc_2_limit', 'cc_3_limit', 'cc_4_limit', 'cc_5_limit',
            # Liabilities - Loans
            'auto_loan_emi', 'personal_loan_emi', 'existing_mortgage_emi',
        ]


class ClientListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing clients.

    Returns summary fields for table display.
    """
    source = SourceNestedSerializer(read_only=True)
    dbr_percentage = serializers.DecimalField(
        max_digits=5, decimal_places=2, read_only=True
    )
    sla_display = serializers.SerializerMethodField()
    active_case_id = serializers.SerializerMethodField()
    first_contact_sla_status = serializers.SerializerMethodField()
    client_to_case_sla_status = serializers.SerializerMethodField()
    ltv_status = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = [
            'id', 'name', 'phone', 'email', 'status',
            'application_type', 'dbr_percentage',
            'property_value', 'loan_amount', 'ltv_status',
            'source', 'sla_display', 'active_case_id',
            'first_contact_sla_status', 'client_to_case_sla_status',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'dbr_percentage']

    def get_ltv_status(self, obj: Client) -> dict:
        """Get LTV status for display."""
        return obj.ltv_status

    def get_sla_display(self, obj: Client) -> str:
        """Get human-readable SLA timer display."""
        return obj.sla_timer.get('display', 'No SLA')

    def get_first_contact_sla_status(self, obj: Client) -> dict | None:
        """Get First Contact SLA status for list view."""
        return obj.first_contact_sla_status

    def get_client_to_case_sla_status(self, obj: Client) -> dict | None:
        """Get Client-to-Case SLA status for list view."""
        return obj.client_to_case_sla_status

    def get_active_case_id(self, obj: Client) -> list[dict] | None:
        """Get list of active cases for this client (uses prefetched data)."""
        from cases.models import CaseStage
        terminal_stages = {CaseStage.REJECTED, CaseStage.NOT_PROCEEDING}

        # Use prefetched cases instead of making a new query
        # Filter in Python to avoid N+1
        active_cases = [
            case for case in obj.cases.all()
            if case.stage not in terminal_stages
        ]
        # Sort by created_at descending and limit to 5
        active_cases = sorted(active_cases, key=lambda c: c.created_at, reverse=True)[:5]

        if not active_cases:
            return None

        return [
            {
                'id': str(case.id),
                'stage': case.stage,
                'bank': str(case.bank) if case.bank else 'No bank',
                'loan_amount': str(case.loan_amount),
            }
            for case in active_cases
        ]


class ClientDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for client detail view.

    Returns all fields plus computed DBR, max_loan, LTV, can_create_case,
    and SLA status fields for countdown display.
    """
    source = SourceNestedSerializer(read_only=True)
    co_applicant = CoApplicantSerializer(read_only=True)
    extra_details = serializers.SerializerMethodField()

    # Computed fields
    total_cc_liability = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    total_loan_emis = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    total_monthly_liabilities = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    dbr_percentage = serializers.DecimalField(
        max_digits=5, decimal_places=2, read_only=True
    )
    max_loan_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    ltv_status = serializers.SerializerMethodField()
    can_create_case = serializers.SerializerMethodField()

    # SLA status fields
    first_contact_sla_status = serializers.SerializerMethodField()
    client_to_case_sla_status = serializers.SerializerMethodField()
    assigned_to = serializers.SerializerMethodField()

    # Phone lock status
    phone_locked = serializers.SerializerMethodField()

    # Cases linked to this client
    cases = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = [
            # Identity
            'id', 'name', 'phone', 'email', 'date_of_birth', 'nationality',
            'emirates_id', 'residency', 'visa_type',
            # Application
            'application_type',
            # Income
            'employment_type', 'monthly_salary', 'total_addbacks', 'company_name',
            # Liabilities - Credit Cards
            'cc_1_limit', 'cc_2_limit', 'cc_3_limit', 'cc_4_limit', 'cc_5_limit',
            # Liabilities - Loans
            'auto_loan_emi', 'personal_loan_emi', 'existing_mortgage_emi',
            # Property Details
            'property_category', 'property_type', 'emirate', 'transaction_type',
            'property_value', 'is_first_property', 'developer',
            # Loan Details
            'loan_amount', 'tenure_years', 'tenure_months',
            # Intent
            'notes', 'timeline',
            # Status & Source
            'status', 'source', 'converted_from_lead',
            # Co-applicant
            'co_applicant',
            # Extra Details
            'extra_details',
            # Computed
            'total_cc_liability', 'total_loan_emis', 'total_monthly_liabilities',
            'dbr_percentage', 'max_loan_amount', 'ltv_status', 'can_create_case',
            # SLA Status
            'first_contact_sla_status', 'client_to_case_sla_status',
            'first_contact_completed_at', 'assigned_to',
            # Phone lock
            'phone_locked',
            # Cases
            'cases',
            # Timestamps
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'converted_from_lead',
            'total_cc_liability', 'total_loan_emis', 'total_monthly_liabilities',
            'dbr_percentage', 'max_loan_amount', 'first_contact_completed_at',
        ]

    def get_ltv_status(self, obj: Client) -> dict:
        """Get LTV status with value, limit, and within_limit."""
        return obj.ltv_status

    def get_can_create_case(self, obj):
        """Return can_create_case validation result."""
        return obj.can_create_case

    def get_first_contact_sla_status(self, obj: Client) -> dict:
        """
        Get First Contact SLA status.

        Returns dict with status, remaining_hours, display.
        """
        return obj.first_contact_sla_status

    def get_client_to_case_sla_status(self, obj: Client) -> dict:
        """
        Get Client-to-Case SLA status.

        Returns dict with status, remaining_hours, display.
        Only computed if first_contact_completed_at is set.
        """
        return obj.client_to_case_sla_status

    def get_assigned_to(self, obj: Client) -> dict | None:
        """Get assigned user info."""
        if not obj.assigned_to:
            return None
        return {
            'id': str(obj.assigned_to.id),
            'name': obj.assigned_to.name,
            'email': obj.assigned_to.email,
        }

    def get_extra_details(self, obj: Client) -> dict | None:
        """Get extra details if they exist."""
        try:
            extra = obj.extra_details
            return ClientExtraDetailsSerializer(extra).data
        except ClientExtraDetails.DoesNotExist:
            return None

    def get_phone_locked(self, obj) -> bool:
        """Phone is locked once WhatsApp messaging has started (uses annotation)."""
        if hasattr(obj, '_has_whatsapp'):
            return obj._has_whatsapp
        from whatsapp.models import WhatsAppMessage
        return WhatsAppMessage.objects.filter(client=obj).exists()

    def get_cases(self, obj: Client) -> list[dict] | None:
        """Get list of cases linked to this client (uses prefetched data)."""
        from cases.models import CaseStage
        excluded = {CaseStage.REJECTED, CaseStage.NOT_PROCEEDING}
        cases = [
            c for c in obj.cases.all()
            if c.stage not in excluded
        ]
        cases.sort(key=lambda c: c.created_at, reverse=True)

        if not cases:
            return None

        return [
            {
                'id': str(case.id),
                'stage': case.stage,
                'bank': case.bank or 'No bank',
                'loan_amount': str(case.loan_amount),
            }
            for case in cases
        ]


class ClientCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating clients.

    Accepts all writable fields. Validates trusted channel or lead conversion.
    """
    source_id = serializers.UUIDField(write_only=True)
    lead_id = serializers.UUIDField(
        write_only=True, required=False, allow_null=True,
        help_text='Lead ID for conversion (allows untrusted channel)'
    )

    class Meta:
        model = Client
        fields = [
            # Identity
            'name', 'phone', 'email', 'date_of_birth', 'nationality',
            'emirates_id', 'residency', 'visa_type',
            # Application
            'application_type',
            # Income
            'employment_type', 'monthly_salary', 'total_addbacks', 'company_name',
            # Liabilities - Credit Cards
            'cc_1_limit', 'cc_2_limit', 'cc_3_limit', 'cc_4_limit', 'cc_5_limit',
            # Liabilities - Loans
            'auto_loan_emi', 'personal_loan_emi', 'existing_mortgage_emi',
            # Property Details
            'property_category', 'property_type', 'emirate', 'transaction_type',
            'property_value', 'is_first_property', 'developer',
            # Loan Details
            'loan_amount', 'tenure_years', 'tenure_months',
            # Intent
            'notes', 'timeline',
            # Source
            'source_id', 'lead_id',
        ]

    def validate_phone(self, value):
        """Validate phone number format per country code."""
        error = validate_phone(value)
        if error:
            raise serializers.ValidationError(error)
        return normalize_phone(value)

    def validate(self, attrs):
        """Validate source belongs to trusted channel or lead is provided."""
        source_id = attrs.get('source_id')
        lead_id = attrs.get('lead_id')

        try:
            source = Source.objects.select_related(
                'channel'
            ).get(pk=source_id)
        except Source.DoesNotExist:
            raise serializers.ValidationError({
                'source_id': 'Invalid source_id.'
            })

        if not source.channel.is_trusted and not lead_id:
            raise serializers.ValidationError({
                'source_id': 'Clients can only be created from trusted channels. '
                             'Provide lead_id for conversion from untrusted channel.'
            })

        attrs['source'] = source
        return attrs

    def create(self, validated_data):
        """Create client with source and optional lead conversion."""
        source = validated_data.pop('source')
        lead_id = validated_data.pop('lead_id', None)

        converted_from_lead = None
        if lead_id:
            from leads.models import Lead
            try:
                lead = Lead.objects.get(pk=lead_id)
                converted_from_lead = lead
            except Lead.DoesNotExist:
                raise serializers.ValidationError({
                    'lead_id': 'Lead not found.'
                })

        validated_data.pop('source_id', None)

        client = Client(
            source=source,
            converted_from_lead=converted_from_lead,
            **validated_data
        )
        client.save()
        return client


class ClientUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating clients.

    Allows partial updates to any writable field.
    Phone number is locked once a WhatsApp message has been sent.
    """

    class Meta:
        model = Client
        fields = [
            # Identity
            'name', 'phone', 'email', 'date_of_birth', 'nationality',
            'emirates_id', 'residency', 'visa_type',
            # Application
            'application_type',
            # Income
            'employment_type', 'monthly_salary', 'total_addbacks', 'company_name',
            # Liabilities - Credit Cards
            'cc_1_limit', 'cc_2_limit', 'cc_3_limit', 'cc_4_limit', 'cc_5_limit',
            # Liabilities - Loans
            'auto_loan_emi', 'personal_loan_emi', 'existing_mortgage_emi',
            # Property Details
            'property_category', 'property_type', 'emirate', 'transaction_type',
            'property_value', 'is_first_property', 'developer',
            # Loan Details
            'loan_amount', 'tenure_years', 'tenure_months',
            # Intent
            'notes', 'timeline',
        ]

    def validate_phone(self, value):
        """Validate format and prevent phone changes once WhatsApp messaging has started."""
        error = validate_phone(value)
        if error:
            raise serializers.ValidationError(error)
        value = normalize_phone(value)

        client = self.instance
        if client and value != client.phone:
            from whatsapp.models import WhatsAppMessage
            if WhatsAppMessage.objects.filter(client=client).exists():
                raise serializers.ValidationError(
                    'Phone number cannot be changed after WhatsApp messaging has started.'
                )
        return value


class ClientChangeStatusSerializer(serializers.Serializer):
    """Serializer for changing client status."""
    status = serializers.ChoiceField(choices=ClientStatus.choices)

    def validate_status(self, value):
        """Validate status transition."""
        client = self.context.get('client')
        if client:
            current_status = client.status

            # Define allowed transitions
            allowed_transitions = {
                ClientStatus.ACTIVE: [
                    ClientStatus.DECLINED,
                    ClientStatus.NOT_PROCEEDING,
                ],
                ClientStatus.DECLINED: [ClientStatus.ACTIVE],  # Can reactivate
                ClientStatus.NOT_PROCEEDING: [ClientStatus.ACTIVE],  # Can reactivate
            }

            if value not in allowed_transitions.get(current_status, []):
                raise serializers.ValidationError(
                    f'Cannot transition from {current_status} to {value}.'
                )

        return value


class ClientReassignSerializer(serializers.Serializer):
    """Serializer for reassigning client owner."""
    assigned_to = serializers.UUIDField(
        help_text='User ID to assign the client to'
    )

    def validate_assigned_to(self, value):
        """Validate user exists and is active."""
        from users.models import User

        try:
            user = User.objects.get(id=value)
        except User.DoesNotExist:
            raise serializers.ValidationError('User not found.')

        if not user.is_active:
            raise serializers.ValidationError('User is not active.')

        return value


class ClientExtraDetailsSerializer(serializers.ModelSerializer):
    """
    Serializer for client extra details.

    Returns all extra details fields for bank form information.
    """

    class Meta:
        model = ClientExtraDetails
        fields = [
            'id',
            # Personal Information
            'marital_status', 'spouse_name', 'spouse_contact',
            'dependents', 'children_count', 'children_in_school',
            'qualification', 'mailing_address', 'mother_maiden_name',
            # Work Details
            'job_title', 'company_industry',
            'years_in_occupation', 'years_in_current_company', 'years_in_business',
            'company_employee_count', 'office_address', 'office_po_box', 'office_landline',
            'work_email', 'company_hr_email',
            # References
            'ref_1_name', 'ref_1_relationship', 'ref_1_mobile',
            'ref_2_name', 'ref_2_relationship', 'ref_2_mobile',
            # Timestamps
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ClientExtraDetailsCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating/updating client extra details.
    """

    class Meta:
        model = ClientExtraDetails
        fields = [
            # Personal Information
            'marital_status', 'spouse_name', 'spouse_contact',
            'dependents', 'children_count', 'children_in_school',
            'qualification', 'mailing_address', 'mother_maiden_name',
            # Work Details
            'job_title', 'company_industry',
            'years_in_occupation', 'years_in_current_company', 'years_in_business',
            'company_employee_count', 'office_address', 'office_po_box', 'office_landline',
            'work_email', 'company_hr_email',
            # References
            'ref_1_name', 'ref_1_relationship', 'ref_1_mobile',
            'ref_2_name', 'ref_2_relationship', 'ref_2_mobile',
        ]
