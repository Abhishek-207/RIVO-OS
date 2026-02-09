/**
 * TypeScript types for Mortgage entities: Leads, Clients, and Cases.
 * These types correspond to the backend Django models and API responses.
 */

// Status Enums

export type LeadStatus = 'active' | 'declined'

// Campaign Status (for WhatsApp campaign tracking)
export type CampaignStatus =
  | 'subscriber_pending'
  | 'segment_mortgaged'
  | 'segment_renting'
  | 'segment_other'
  | 'locale_dubai'
  | 'locale_abudhabi'
  | 'locale_other'
  | 'qualified'
  | 'disqualified'
  | 'converted'

// Lead Interaction Types (for journey tracking)
export type LeadInteractionType =
  | 'template_sent'
  | 'button_click'
  | 'text_reply'
  | 'tag_added'
  | 'tag_removed'
  | 'status_change'

// Lead Message Types
export type LeadMessageDirection = 'outbound' | 'inbound'
export type LeadMessageType = 'text' | 'template' | 'button' | 'image' | 'document'
export type LeadMessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

export type ClientStatus = 'active' | 'declined' | 'not_proceeding'

export type CaseStage =
  // Active stages (main flow)
  | 'processing'
  | 'submitted_to_bank'
  | 'under_review'
  | 'submitted_to_credit'
  | 'preapproved'
  | 'valuation_initiated'
  | 'valuation_report_received'
  | 'fol_requested'
  | 'fol_received'
  | 'fol_signed'
  | 'disbursed'
  | 'final_documents'
  | 'mc_received'
  // Query stages (side tracks)
  | 'sales_queries'
  | 'credit_queries'
  | 'disbursal_queries'
  // Hold
  | 'on_hold'
  // Terminal
  | 'property_transferred'
  | 'rejected'
  | 'not_proceeding'

// Reference Types

export type ResidencyType = 'uae_national' | 'uae_resident' | 'non_resident'

export type VisaType = 'employment' | 'investor' | 'golden' | 'retirement' | 'other'

export type ApplicationType = 'single' | 'joint'

export type EmploymentType = 'salaried' | 'self_employed'

export type PropertyType = 'ready' | 'off_plan'

export type TransactionType = 'primary_purchase' | 'resale' | 'buyout_equity' | 'buyout' | 'equity'

export type Timeline = 'immediate' | '1_3_months' | '3_6_months' | 'exploring'

export type RateType = 'fixed' | 'variable'

export type PropertyCategory = 'residential' | 'commercial'

export type CaseTypeValue = 'fully_packaged' | 'assisted'

export type MortgageType = 'conventional' | 'islamic'

export type Emirate = 'dubai' | 'abu_dhabi' | 'sharjah' | 'ajman' | 'ras_al_khaimah' | 'fujairah' | 'umm_al_quwain'

export type FixedPeriod = '1' | '2' | '3' | '4' | '5'

export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed'

// SLA Status Types

export type SLAStatusValue = 'ok' | 'warning' | 'overdue' | 'completed' | 'not_started' | 'no_sla'

export interface SLAStatusData {
  status: SLAStatusValue
  remaining_hours: number | null
  display: string | null
  stage_name?: string | null
}

export interface LtvStatusData {
  ltv: number | null
  limit: number
  within_limit: boolean | null
  display: string
}

// Nested Types for API responses

export interface SourceSummary {
  id: string
  name: string
  channel_name: string
  channel_is_trusted?: boolean
  effective_sla: number | null
}

export interface ClientSummary {
  id: string
  name: string
  phone: string
  email: string | null
}

// Lead Types

export interface LeadListItem {
  id: string
  name: string
  phone: string
  email: string | null
  status: LeadStatus
  source: SourceSummary
  sla_display: string | null
  // Campaign tracking fields
  campaign_status: CampaignStatus
  campaign_status_display: string
  current_tags: string[]
  response_count: number
  first_response_at: string | null
  last_response_at: string | null
  created_at: string
  updated_at: string
}

export interface LeadData {
  id: string
  name: string
  phone: string
  email: string | null
  source: SourceSummary
  intent: string | null
  status: LeadStatus
  converted_client: string | null
  sla_timer: {
    effective_sla_minutes: number | null
    elapsed_minutes: number
    remaining_minutes: number | null
    is_overdue: boolean
    display: string | null
  }
  // Campaign tracking fields
  ycloud_contact_id: string
  campaign_status: CampaignStatus
  campaign_status_display: string
  current_tags: string[]
  response_count: number
  first_response_at: string | null
  last_response_at: string | null
  created_at: string
  updated_at: string
}

// Lead Interaction (journey event)
export interface LeadInteraction {
  id: string
  interaction_type: LeadInteractionType
  content: string
  tag_value: string
  template_name: string
  original_message_id: string
  metadata: Record<string, unknown>
  created_at: string
}

// Lead Message (WhatsApp message for leads)
export interface LeadMessage {
  id: string
  direction: LeadMessageDirection
  message_type: LeadMessageType
  content: string
  status: LeadMessageStatus
  ycloud_message_id: string
  from_number: string
  to_number: string
  button_payload: string
  template_name: string
  reply_to_message_id: string
  created_at: string
  sent_at: string | null
  delivered_at: string | null
}

// Lead Journey Response
export interface LeadJourneyResponse {
  lead: LeadData
  interactions: LeadInteraction[]
  messages: LeadMessage[]
}

// Campaign Dashboard Response
export interface CampaignDashboardResponse {
  status_distribution: Record<CampaignStatus, number>
  total_leads: number
  total_responses: number
  response_rate: number
  recent_leads: LeadListItem[]
}

export interface CreateLeadData {
  name: string
  phone: string
  email?: string
  source_id: string
  intent?: string
}

export interface UpdateLeadData {
  name?: string
  phone?: string
  email?: string
  intent?: string
}

// Client Types

export interface CoApplicantData {
  id: string
  name: string
  phone: string
  email: string | null
  emirates_id: string | null
  residency: ResidencyType | null
  visa_type: VisaType | null
  employment_type: EmploymentType | null
  monthly_salary: string | null
  company_name: string | null
  cc_1_limit: string | null
  cc_2_limit: string | null
  cc_3_limit: string | null
  cc_4_limit: string | null
  cc_5_limit: string | null
  auto_loan_emi: string | null
  personal_loan_emi: string | null
  existing_mortgage_emi: string | null
  total_cc_liability: string
  total_loan_emis: string
  total_monthly_liabilities: string
}

export interface ClientCaseSummary {
  id: string
  stage: CaseStage
  bank: string
  loan_amount: string
}

export interface ClientListItem {
  id: string
  name: string
  phone: string
  email: string | null
  status: ClientStatus
  application_type: ApplicationType | null
  dbr_percentage: string | null
  property_value: string | null
  loan_amount: string | null
  ltv_status: LtvStatusData | null
  source: SourceSummary
  sla_display: string | null
  active_case_id: ClientCaseSummary[] | null
  created_at: string
  updated_at: string
  // SLA status fields
  first_contact_sla_status?: SLAStatusData | null
  client_to_case_sla_status?: SLAStatusData | null
}

export interface ClientData {
  id: string
  // Identity
  name: string
  phone: string
  email: string | null
  date_of_birth: string | null
  nationality: string | null
  emirates_id: string | null
  residency: ResidencyType | null
  visa_type: VisaType | null
  // Application Type
  application_type: ApplicationType | null
  // Income
  employment_type: EmploymentType | null
  monthly_salary: string | null
  total_addbacks: string | null
  company_name: string | null
  // Liabilities
  cc_1_limit: string | null
  cc_2_limit: string | null
  cc_3_limit: string | null
  cc_4_limit: string | null
  cc_5_limit: string | null
  auto_loan_emi: string | null
  personal_loan_emi: string | null
  existing_mortgage_emi: string | null
  // Property Details
  property_category: PropertyCategory | null
  property_type: PropertyType | null
  emirate: Emirate | null
  transaction_type: TransactionType | null
  property_value: string | null
  is_first_property: boolean
  developer: string | null
  // Loan Details
  loan_amount: string | null
  tenure_years: number
  tenure_months: number
  // Intent
  notes: string | null
  timeline: Timeline | null
  // Status & Source
  status: ClientStatus
  source: SourceSummary
  converted_from_lead: string | null
  // Co-Applicant (for joint applications)
  co_applicant: CoApplicantData | null
  // Extra Details (for bank forms)
  extra_details: ClientExtraDetailsData | null
  // Calculated Fields
  total_cc_liability: string
  total_loan_emis: string
  total_monthly_liabilities: string
  dbr_percentage: string
  max_loan_amount: string
  ltv_status: LtvStatusData
  can_create_case: {
    valid: boolean
    reasons: string[]
  }
  // SLA Status Fields
  first_contact_sla_status?: SLAStatusData | null
  client_to_case_sla_status?: SLAStatusData | null
  first_contact_completed_at?: string | null
  // Owner
  assigned_to?: {
    id: string
    name: string
    email: string
  } | null
  // Phone lock
  phone_locked?: boolean
  // Cases linked to this client
  cases: ClientCaseSummary[] | null
  // Timestamps
  created_at: string
  updated_at: string
}

export interface CreateClientData {
  // Identity
  name: string
  phone: string
  email?: string
  date_of_birth?: string
  nationality?: string
  emirates_id?: string
  residency?: ResidencyType
  visa_type?: VisaType
  // Application Type
  application_type?: ApplicationType
  // Income
  employment_type?: EmploymentType
  monthly_salary?: string
  total_addbacks?: string
  company_name?: string
  // Liabilities
  cc_1_limit?: string
  cc_2_limit?: string
  cc_3_limit?: string
  cc_4_limit?: string
  cc_5_limit?: string
  auto_loan_emi?: string
  personal_loan_emi?: string
  existing_mortgage_emi?: string
  // Property Details
  property_category?: PropertyCategory
  property_type?: PropertyType
  emirate?: Emirate
  transaction_type?: TransactionType
  property_value?: string
  is_first_property?: boolean
  developer?: string
  // Loan Details
  loan_amount?: string
  tenure_years?: number
  tenure_months?: number
  // Intent
  notes?: string
  timeline?: Timeline
  // Source
  source_id: string
  // Or converted from lead
  converted_from_lead_id?: string
}

export interface UpdateClientData {
  // Identity
  name?: string
  phone?: string
  email?: string
  date_of_birth?: string
  nationality?: string
  emirates_id?: string
  residency?: ResidencyType
  visa_type?: VisaType
  // Application Type
  application_type?: ApplicationType
  // Income
  employment_type?: EmploymentType
  monthly_salary?: string
  total_addbacks?: string
  company_name?: string
  // Liabilities
  cc_1_limit?: string
  cc_2_limit?: string
  cc_3_limit?: string
  cc_4_limit?: string
  cc_5_limit?: string
  auto_loan_emi?: string
  personal_loan_emi?: string
  existing_mortgage_emi?: string
  // Property Details
  property_category?: PropertyCategory
  property_type?: PropertyType
  emirate?: Emirate
  transaction_type?: TransactionType
  property_value?: string
  is_first_property?: boolean
  developer?: string
  // Loan Details
  loan_amount?: string
  tenure_years?: number
  tenure_months?: number
  // Intent
  notes?: string
  timeline?: Timeline
}

export interface UpdateCoApplicantData {
  name: string
  phone: string
  email?: string
  emirates_id?: string
  residency?: ResidencyType
  visa_type?: VisaType
  employment_type?: EmploymentType
  monthly_salary?: string
  company_name?: string
  cc_1_limit?: string
  cc_2_limit?: string
  cc_3_limit?: string
  cc_4_limit?: string
  cc_5_limit?: string
  auto_loan_emi?: string
  personal_loan_emi?: string
  existing_mortgage_emi?: string
}

// Client Extra Details Types

export interface ClientExtraDetailsData {
  id: string
  // Personal Information
  marital_status: MaritalStatus | ''
  spouse_name: string
  spouse_contact: string
  dependents: number | null
  children_count: number | null
  children_in_school: number | null
  qualification: string
  mailing_address: string
  mother_maiden_name: string
  // Work Details
  job_title: string
  company_industry: string
  years_in_occupation: number | null
  years_in_current_company: number | null
  years_in_business: number | null
  company_employee_count: number | null
  office_address: string
  office_po_box: string
  office_landline: string
  work_email: string
  company_hr_email: string
  // References
  ref_1_name: string
  ref_1_relationship: string
  ref_1_mobile: string
  ref_2_name: string
  ref_2_relationship: string
  ref_2_mobile: string
  // Timestamps
  created_at: string
  updated_at: string
}

export interface UpdateClientExtraDetailsData {
  // Personal Information
  marital_status?: MaritalStatus | ''
  spouse_name?: string
  spouse_contact?: string
  dependents?: number | null
  children_count?: number | null
  children_in_school?: number | null
  qualification?: string
  mailing_address?: string
  mother_maiden_name?: string
  // Work Details
  job_title?: string
  company_industry?: string
  years_in_occupation?: number | null
  years_in_current_company?: number | null
  years_in_business?: number | null
  company_employee_count?: number | null
  office_address?: string
  office_po_box?: string
  office_landline?: string
  work_email?: string
  company_hr_email?: string
  // References
  ref_1_name?: string
  ref_1_relationship?: string
  ref_1_mobile?: string
  ref_2_name?: string
  ref_2_relationship?: string
  ref_2_mobile?: string
}

// Case Types

export interface CaseListItem {
  id: string
  client: ClientSummary
  stage: CaseStage
  property_value: string
  loan_amount: string
  bank: string | null
  created_at: string
  // SLA status fields
  stage_sla_status?: SLAStatusData | null
}

export interface CaseData {
  id: string
  // Client
  client: ClientSummary
  application_type: ApplicationType
  // Case Type
  case_type: CaseTypeValue
  // Property
  property_category: PropertyCategory
  property_type: PropertyType
  emirate: Emirate
  transaction_type: TransactionType
  property_value: string
  developer: string | null
  project_name: string | null
  location: string | null
  is_first_property: boolean
  // Loan
  loan_amount: string
  tenure_years: number
  tenure_months: number
  // Bank Product
  bank: string | null
  mortgage_type: MortgageType
  rate_type: RateType | null
  rate: string | null
  fixed_period: FixedPeriod | null
  // Stage
  stage: CaseStage
  stage_changed_at: string | null
  // Calculated
  ltv_percentage: string
  ltv_limit: string
  // SLA Status Fields
  stage_sla_status?: SLAStatusData | null
  // Owner
  assigned_to?: {
    id: string
    name: string
    email: string
  } | null
  // Timestamps
  created_at: string
  updated_at: string
}

export interface CreateCaseData {
  client_id: string
  // Case Type
  case_type?: CaseTypeValue
  // Property
  property_category?: PropertyCategory
  property_type: PropertyType
  emirate?: Emirate
  transaction_type: TransactionType
  property_value: string
  developer?: string
  project_name?: string
  location?: string
  is_first_property?: boolean
  // Loan
  loan_amount: string
  tenure_years: number
  tenure_months?: number
  // Bank Product
  bank?: string
  mortgage_type?: MortgageType
  rate_type?: RateType
  rate?: string
  fixed_period?: FixedPeriod
}

export interface UpdateCaseData {
  // Case Type
  case_type?: CaseTypeValue
  // Property
  property_category?: PropertyCategory
  property_type?: PropertyType
  emirate?: Emirate
  transaction_type?: TransactionType
  property_value?: string
  developer?: string
  project_name?: string
  location?: string
  is_first_property?: boolean
  // Loan
  loan_amount?: string
  tenure_years?: number
  tenure_months?: number
  // Bank Product
  bank?: string
  mortgage_type?: MortgageType
  rate_type?: RateType
  rate?: string
  fixed_period?: FixedPeriod
}

// Paginated Response Type (reusable)

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// Query Params Types

export interface LeadsQueryParams {
  page?: number
  page_size?: number
  search?: string
  status?: LeadStatus | 'all'
  source_id?: string
  channel_id?: string
  campaign_status?: CampaignStatus | 'all'
}

export interface ClientsQueryParams {
  page?: number
  page_size?: number
  search?: string
  status?: ClientStatus | 'all'
  application_type?: ApplicationType | 'all'
  source_id?: string
  channel_id?: string
  sla_status?: string
  start_date?: string
  end_date?: string
}

export interface CasesQueryParams {
  page?: number
  page_size?: number
  search?: string
  stage?: CaseStage | 'all'
  bank?: string
  sla_status?: string
  channel?: string
  source?: string
  start_date?: string
  end_date?: string
}

// Stage Category Helpers

export const ACTIVE_STAGES: CaseStage[] = [
  'processing',
  'submitted_to_bank',
  'under_review',
  'submitted_to_credit',
  'preapproved',
  'valuation_initiated',
  'valuation_report_received',
  'fol_requested',
  'fol_received',
  'fol_signed',
  'disbursed',
  'final_documents',
  'mc_received',
]

export const QUERY_STAGES: CaseStage[] = [
  'sales_queries',
  'credit_queries',
  'disbursal_queries',
]

export const HOLD_STAGES: CaseStage[] = ['on_hold']

export const TERMINAL_STAGES: CaseStage[] = [
  'property_transferred',
  'rejected',
  'not_proceeding',
]

// Display Labels

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  active: 'Active',
  declined: 'Declined',
}

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  subscriber_pending: 'Subscriber Pending',
  segment_mortgaged: 'Mortgaged',
  segment_renting: 'Renting',
  segment_other: 'Other Segment',
  locale_dubai: 'Dubai',
  locale_abudhabi: 'Abu Dhabi',
  locale_other: 'Other Locale',
  qualified: 'Qualified',
  disqualified: 'Disqualified',
  converted: 'Converted',
}

export const LEAD_INTERACTION_TYPE_LABELS: Record<LeadInteractionType, string> = {
  template_sent: 'Template Sent',
  button_click: 'Button Click',
  text_reply: 'Text Reply',
  tag_added: 'Tag Added',
  tag_removed: 'Tag Removed',
  status_change: 'Status Change',
}

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  active: 'Active',
  declined: 'Declined',
  not_proceeding: 'Not Proceeding',
}

export const CASE_STAGE_LABELS: Record<CaseStage, string> = {
  processing: 'Processing',
  submitted_to_bank: 'Submitted to Bank',
  under_review: 'Under Review',
  submitted_to_credit: 'Submitted to Credit',
  preapproved: 'Preapproved',
  valuation_initiated: 'Valuation Initiated',
  valuation_report_received: 'Valuation Report Received',
  fol_requested: 'FOL Requested',
  fol_received: 'FOL Received',
  fol_signed: 'FOL Signed',
  disbursed: 'Disbursed',
  final_documents: 'Final Documents',
  mc_received: 'MC Received',
  sales_queries: 'Sales Queries',
  credit_queries: 'Credit Queries',
  disbursal_queries: 'Disbursal Queries',
  on_hold: 'On Hold',
  property_transferred: 'Property Transferred',
  rejected: 'Rejected',
  not_proceeding: 'Not Proceeding',
}

export const RESIDENCY_LABELS: Record<ResidencyType, string> = {
  uae_national: 'UAE National',
  uae_resident: 'UAE Resident',
  non_resident: 'Non-Resident',
}

export const VISA_TYPE_LABELS: Record<VisaType, string> = {
  employment: 'Employment',
  investor: 'Investor',
  golden: 'Golden',
  retirement: 'Retirement',
  other: 'Other',
}

export const APPLICATION_TYPE_LABELS: Record<ApplicationType, string> = {
  single: 'Individual',
  joint: 'Co-borrower',
}

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  salaried: 'Salaried',
  self_employed: 'Self Employed',
}

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  ready: 'Ready',
  off_plan: 'Off-Plan',
}

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  primary_purchase: 'Primary Purchase',
  resale: 'Resale',
  buyout_equity: 'Buyout + Equity',
  buyout: 'Buyout',
  equity: 'Equity',
}

export const TIMELINE_LABELS: Record<Timeline, string> = {
  immediate: 'Immediate',
  '1_3_months': '1-3 Months',
  '3_6_months': '3-6 Months',
  exploring: 'Exploring',
}

export const RATE_TYPE_LABELS: Record<RateType, string> = {
  fixed: 'Fixed',
  variable: 'Variable',
}

export const PROPERTY_CATEGORY_LABELS: Record<PropertyCategory, string> = {
  residential: 'Residential',
  commercial: 'Commercial',
}

export const CASE_TYPE_LABELS: Record<CaseTypeValue, string> = {
  fully_packaged: 'Fully Packaged',
  assisted: 'Assisted',
}

export const MORTGAGE_TYPE_LABELS: Record<MortgageType, string> = {
  conventional: 'Conventional',
  islamic: 'Islamic',
}

export const EMIRATE_LABELS: Record<Emirate, string> = {
  dubai: 'Dubai',
  abu_dhabi: 'Abu Dhabi',
  sharjah: 'Sharjah',
  ajman: 'Ajman',
  ras_al_khaimah: 'Ras Al Khaimah',
  fujairah: 'Fujairah',
  umm_al_quwain: 'Umm Al Quwain',
}

export const FIXED_PERIOD_LABELS: Record<FixedPeriod, string> = {
  '1': '1 Year',
  '2': '2 Years',
  '3': '3 Years',
  '4': '4 Years',
  '5': '5 Years',
}

// SLA Status Labels
export const SLA_STATUS_LABELS: Record<SLAStatusValue, string> = {
  ok: 'On Track',
  warning: 'At Risk',
  overdue: 'Overdue',
  completed: 'Completed',
  not_started: 'Not Started',
  no_sla: 'No SLA',
}

export const MARITAL_STATUS_LABELS: Record<MaritalStatus, string> = {
  single: 'Single',
  married: 'Married',
  divorced: 'Divorced',
  widowed: 'Widowed',
}
