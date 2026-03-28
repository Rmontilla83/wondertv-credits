export type UserRole = 'admin' | 'operator' | 'viewer'
export type ClientStatus = 'active' | 'inactive' | 'suspended'
export type PurchasePaymentMethod = 'banesco_bss' | 'paypal' | 'zelle'
export type AssignmentPaymentMethod = 'banesco_bss' | 'paypal' | 'zelle'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  phone: string | null
  created_at: string
  updated_at: string
}

export interface CreditPurchase {
  id: string
  purchased_by: string
  quantity: number
  total_cost_usd: number
  cost_per_credit: number
  payment_method: PurchasePaymentMethod
  payment_reference: string | null
  notes: string | null
  purchased_at: string
  created_at: string
  profiles?: Profile
}

export interface Client {
  id: string
  name: string
  phone: string | null
  email: string | null
  device_info: string | null
  status: ClientStatus
  notes: string | null
  created_by: string | null
  flujo_cust_id: string | null
  flujo_login: string | null
  country: string | null
  flujo_end_date: string | null
  flujo_start_date: string | null
  flujo_credits: number | null
  created_at: string
  updated_at: string
}

export type PaymentStatus = 'pending' | 'completed'

export interface CreditAssignment {
  id: string
  client_id: string
  assigned_by: string
  quantity: number
  period_start: string
  period_end: string
  is_courtesy: boolean
  courtesy_reason: string | null
  payment_amount_usd: number | null
  payment_method: AssignmentPaymentMethod | null
  payment_reference: string | null
  payment_amount_bss: number | null
  exchange_rate: number | null
  payment_status: PaymentStatus
  notes: string | null
  created_at: string
  clients?: Client
  profiles?: Profile
}

export interface ExchangeRate {
  id: string
  rate_bss_usd: number
  source: string
  recorded_at: string
}

export interface CreditBalance {
  total_purchased: number
  total_assigned: number
  available_credits: number
}

export interface MonthlyFinancialSummary {
  month: string
  total_assignments: number
  credits_assigned: number
  revenue_usd: number
  unique_clients: number
  avg_ticket_usd: number
  avg_credits_per_assignment: number
}

export type CampaignType = 'expiring' | 'reactivation' | 'promotion' | 'welcome'
export type CampaignStatus = 'draft' | 'sending' | 'sent' | 'failed'
export type CampaignSegment = 'expiring_7d' | 'expiring_14d' | 'expiring_30d' | 'inactive' | 'active' | 'all' | 'custom'

export interface Campaign {
  id: string
  name: string
  type: CampaignType
  status: CampaignStatus
  subject: string
  html_content: string
  segment: CampaignSegment
  custom_client_ids: string[] | null
  total_recipients: number
  sent_count: number
  failed_count: number
  sent_at: string | null
  created_by: string | null
  created_at: string
  profiles?: Profile
}

export interface CampaignEmail {
  id: string
  campaign_id: string
  client_id: string
  email: string
  status: 'pending' | 'sent' | 'failed'
  resend_id: string | null
  error_message: string | null
  sent_at: string
}

export interface MonthlyProfitability {
  month: string
  total_cost_usd: number
  credits_bought: number
  revenue_usd: number
  credits_sold: number
  profit_usd: number
  margin_pct: number
}
