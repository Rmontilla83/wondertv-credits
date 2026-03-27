'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { KPICard } from '@/components/dashboard/KPICard'
import { CreditGauge } from '@/components/dashboard/CreditGauge'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { ProfitabilityChart } from '@/components/dashboard/ProfitabilityChart'
import { PaymentMethodPie } from '@/components/dashboard/PaymentMethodPie'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { Skeleton } from '@/components/ui/skeleton'
import { formatUSD } from '@/lib/utils'
import type { CreditBalance, MonthlyProfitability, MonthlyFinancialSummary, CreditAssignment } from '@/lib/types'
import {
  CircleDollarSign,
  Package,
  Send,
  DollarSign,
  Receipt,
  TrendingUp,
} from 'lucide-react'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState<CreditBalance | null>(null)
  const [profitability, setProfitability] = useState<MonthlyProfitability[]>([])
  const [monthlySummary, setMonthlySummary] = useState<MonthlyFinancialSummary[]>([])
  const [recentAssignments, setRecentAssignments] = useState<CreditAssignment[]>([])
  const [paymentMethods, setPaymentMethods] = useState<{ method: string; total: number }[]>([])

  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      const [balanceRes, profitRes, summaryRes, assignmentsRes] = await Promise.all([
        supabase.from('credit_balance').select('*').single(),
        supabase.from('monthly_profitability').select('*').limit(12),
        supabase.from('monthly_financial_summary').select('*').limit(12),
        supabase
          .from('credit_assignments')
          .select('*, clients(name), profiles(full_name)')
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      if (balanceRes.data) setBalance(balanceRes.data)
      if (profitRes.data) setProfitability(profitRes.data)
      if (summaryRes.data) setMonthlySummary(summaryRes.data)
      if (assignmentsRes.data) setRecentAssignments(assignmentsRes.data)

      // Calculate payment methods from assignments
      if (assignmentsRes.data) {
        const methodMap: Record<string, number> = {}
        assignmentsRes.data.forEach((a: CreditAssignment) => {
          if (a.payment_method && a.payment_amount_usd) {
            methodMap[a.payment_method] = (methodMap[a.payment_method] || 0) + a.payment_amount_usd
          }
        })
        setPaymentMethods(Object.entries(methodMap).map(([method, total]) => ({ method, total })))
      }

      setLoading(false)
    }

    fetchData()
  }, [supabase])

  const currentMonth = monthlySummary[0]

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-80" />
          <Skeleton className="h-80 lg:col-span-2" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          title="Créditos Disponibles"
          value={String(balance?.available_credits ?? 0)}
          icon={CircleDollarSign}
          iconColor="text-green-600 bg-green-100"
        />
        <KPICard
          title="Total Comprados"
          value={String(balance?.total_purchased ?? 0)}
          icon={Package}
          iconColor="text-blue-600 bg-blue-100"
        />
        <KPICard
          title="Asignados Este Mes"
          value={String(currentMonth?.credits_assigned ?? 0)}
          icon={Send}
          iconColor="text-purple-600 bg-purple-100"
        />
        <KPICard
          title="Ingresos del Mes"
          value={formatUSD(currentMonth?.revenue_usd ?? 0)}
          icon={DollarSign}
          iconColor="text-green-600 bg-green-100"
        />
        <KPICard
          title="Ticket Promedio"
          value={formatUSD(currentMonth?.avg_ticket_usd ?? 0)}
          icon={Receipt}
          iconColor="text-yellow-600 bg-yellow-100"
        />
        <KPICard
          title="Margen Mensual"
          value={`${profitability[0]?.margin_pct ?? 0}%`}
          icon={TrendingUp}
          iconColor="text-blue-600 bg-blue-100"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <CreditGauge
          available={balance?.available_credits ?? 0}
          total={balance?.total_purchased ?? 0}
          assigned={balance?.total_assigned ?? 0}
        />
        <div className="lg:col-span-2">
          <RevenueChart data={profitability} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ProfitabilityChart data={profitability} />
        <PaymentMethodPie data={paymentMethods} />
      </div>

      <RecentActivity assignments={recentAssignments} />
    </div>
  )
}
