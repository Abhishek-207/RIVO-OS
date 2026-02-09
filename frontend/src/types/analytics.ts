export interface AnalyticsOverall {
  total_disbursed: string
  revenue: string
  total_leads: number
  total_clients: number
  total_cases: number
  loans_count: number
  sla_breaches: number
}

export interface AnalyticsBreakdownRow {
  id: string
  name: string
  monthly_spend?: string | null
  leads_count: number
  clients_count: number
  cases_count: number
  loans_count?: number
  total_disbursed: string
  sla_breaches: number
  // Channel Owner source rows
  converted_pct?: number
  declined_pct?: number
  avg_response_minutes?: number | null
}

export interface StageFunnelItem {
  stage: string
  stage_key: string
  count: number
}

export interface PipelineSnapshot {
  active_leads: number
  active_clients: number
  active_cases: number
}

export interface AnalyticsDashboardData {
  overall: AnalyticsOverall
  breakdown: AnalyticsBreakdownRow[]
  breakdown_type: 'channel' | 'source'
  date_range: {
    start_date: string
    end_date: string
  }
  // Admin and Channel Owner
  stage_funnel?: StageFunnelItem[]
  // Channel Owner only
  pipeline?: PipelineSnapshot
}
