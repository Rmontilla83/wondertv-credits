export type UserRole = 'admin' | 'operator' | 'viewer'
export type ClientStatus = 'active' | 'inactive' | 'suspended'
export type PurchasePaymentMethod = 'banesco_bss' | 'paypal' | 'zelle'
export type AssignmentPaymentMethod = 'banesco_bss' | 'paypal' | 'zelle' | 'cash' | 'transfer'

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
  created_at: string
  updated_at: string
}

export interface CreditAssignment {
  id: string
  client_id: string
  assigned_by: string
  quantity: number
  period_start: string
  period_end: string
  payment_amount_usd: number | null
  payment_method: AssignmentPaymentMethod | null
  payment_reference: string | null
  payment_amount_bss: number | null
  exchange_rate: number | null
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

export interface MonthlyProfitability {
  month: string
  total_cost_usd: number
  credits_bought: number
  revenue_usd: number
  credits_sold: number
  profit_usd: number
  margin_pct: number
}
