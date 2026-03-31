'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { KPICard } from '@/components/dashboard/KPICard'
import { CreditGauge } from '@/components/dashboard/CreditGauge'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { ProfitabilityChart } from '@/components/dashboard/ProfitabilityChart'
import { PaymentMethodPie } from '@/components/dashboard/PaymentMethodPie'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { ExpiringClients } from '@/components/dashboard/ExpiringClients'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatUSD, formatBSS } from '@/lib/utils'
import type { CreditBalance, MonthlyProfitability, MonthlyFinancialSummary, CreditAssignment, Client } from '@/lib/types'
import { CompleteSaleForm } from '@/components/forms/CompleteSaleForm'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  CircleDollarSign,
  Package,
  Send,
  DollarSign,
  Gift,
  TrendingUp,
  Landmark,
  CreditCard,
  AlertCircle,
} from 'lucide-react'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState<CreditBalance | null>(null)
  const [profitability, setProfitability] = useState<MonthlyProfitability[]>([])
  const [monthlySummary, setMonthlySummary] = useState<MonthlyFinancialSummary[]>([])
  const [recentAssignments, setRecentAssignments] = useState<CreditAssignment[]>([])
  const [paymentMethods, setPaymentMethods] = useState<{ method: string; total: number }[]>([])
  const [pendingAssignments, setPendingAssignments] = useState<CreditAssignment[]>([])
  const [completeSaleId, setCompleteSaleId] = useState<string | null>(null)
  const [allClients, setAllClients] = useState<Client[]>([])
  const [allAssignments, setAllAssignments] = useState<{
    payment_method: string | null
    payment_amount_usd: number | null
    payment_amount_bss: number | null
    is_courtesy: boolean
    quantity: number
    created_at: string
  }[]>([])

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function fetchData() {
      try {
        const [balanceRes, profitRes, summaryRes, recentRes, allRes, clientsRes, pendingRes] = await Promise.all([
          supabase.from('credit_balance').select('*').maybeSingle(),
          supabase.from('monthly_profitability').select('*').limit(12),
          supabase.from('monthly_financial_summary').select('*').limit(12),
          supabase
            .from('credit_assignments')
            .select('*, clients(name), profiles(full_name)')
            .order('created_at', { ascending: false })
            .limit(10),
          supabase
            .from('credit_assignments')
            .select('payment_method, payment_amount_usd, payment_amount_bss, is_courtesy, quantity, created_at'),
          supabase
            .from('clients')
            .select('id, name, status, flujo_login, flujo_end_date, country'),
          supabase
            .from('credit_assignments')
            .select('*, clients(name)')
            .eq('payment_status', 'pending')
            .order('created_at', { ascending: false }),
        ])

        if (balanceRes.data) setBalance(balanceRes.data)
        if (profitRes.data) setProfitability(profitRes.data)
        if (summaryRes.data) setMonthlySummary(summaryRes.data)
        if (recentRes.data) setRecentAssignments(recentRes.data)
        if (allRes.data) setAllAssignments(allRes.data)
        if (clientsRes.data) setAllClients(clientsRes.data as Client[])
        if (pendingRes.data) setPendingAssignments(pendingRes.data)

        // Payment method totals
        if (allRes.data) {
          const methodMap: Record<string, number> = {}
          allRes.data.forEach((a) => {
            if (a.payment_method && a.payment_amount_usd && !a.is_courtesy) {
              methodMap[a.payment_method] = (methodMap[a.payment_method] || 0) + a.payment_amount_usd
            }
          })
          setPaymentMethods(Object.entries(methodMap).map(([method, total]) => ({ method, total })))
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  // Calculate live payment method totals
  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const thisMonthAssignments = allAssignments.filter(a => a.created_at >= currentMonthStart)

  const zelleTotal = thisMonthAssignments
    .filter(a => a.payment_method === 'zelle' && !a.is_courtesy)
    .reduce((s, a) => s + (a.payment_amount_usd ?? 0), 0)

  const paypalTotal = thisMonthAssignments
    .filter(a => a.payment_method === 'paypal' && !a.is_courtesy)
    .reduce((s, a) => s + (a.payment_amount_usd ?? 0), 0)

  const banescoUsd = thisMonthAssignments
    .filter(a => a.payment_method === 'banesco_bss' && !a.is_courtesy)
    .reduce((s, a) => s + (a.payment_amount_usd ?? 0), 0)

  const banescoBss = thisMonthAssignments
    .filter(a => a.payment_method === 'banesco_bss' && !a.is_courtesy)
    .reduce((s, a) => s + (a.payment_amount_bss ?? 0), 0)

  const courtesyCount = thisMonthAssignments
    .filter(a => a.is_courtesy)
    .reduce((s, a) => s + a.quantity, 0)

  const totalRevenueMonth = zelleTotal + paypalTotal + banescoUsd
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
        <Skeleton className="h-40" />
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

      {/* KPI Row */}
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
          value={formatUSD(totalRevenueMonth)}
          icon={DollarSign}
          iconColor="text-green-600 bg-green-100"
        />
        <KPICard
          title="Cortesías del Mes"
          value={`${courtesyCount} créditos`}
          icon={Gift}
          iconColor="text-purple-600 bg-purple-100"
        />
        <KPICard
          title="Margen Mensual"
          value={`${profitability[0]?.margin_pct ?? 0}%`}
          icon={TrendingUp}
          iconColor="text-blue-600 bg-blue-100"
        />
      </div>

      {/* Pending sales alert */}
      {pendingAssignments.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-orange-800">
              <AlertCircle className="h-5 w-5" />
              {pendingAssignments.length} venta{pendingAssignments.length > 1 ? 's' : ''} pendiente{pendingAssignments.length > 1 ? 's' : ''} de registrar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingAssignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-white border border-orange-200">
                  <div>
                    <p className="text-sm font-medium">{a.clients?.name}</p>
                    <p className="text-xs text-muted-foreground">{a.notes}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-orange-100 text-orange-800">+{a.quantity} mes{a.quantity > 1 ? 'es' : ''}</Badge>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => setCompleteSaleId(a.id)}
                    >
                      Registrar Pago
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Dialog open={!!completeSaleId} onOpenChange={(open) => !open && setCompleteSaleId(null)}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Completar Venta</DialogTitle>
                </DialogHeader>
                {completeSaleId && (
                  <CompleteSaleForm
                    assignment={pendingAssignments.find(a => a.id === completeSaleId)!}
                    onComplete={async () => {
                      setCompleteSaleId(null)
                      setPendingAssignments(prev => prev.filter(a => a.id !== completeSaleId))
                      // Refresh dashboard data
                      const [balanceRes, allRes, summaryRes, profitRes, recentRes] = await Promise.all([
                        supabase.from('credit_balance').select('*').maybeSingle(),
                        supabase.from('credit_assignments').select('payment_method, payment_amount_usd, payment_amount_bss, is_courtesy, quantity, created_at'),
                        supabase.from('monthly_financial_summary').select('*').limit(12),
                        supabase.from('monthly_profitability').select('*').limit(12),
                        supabase.from('credit_assignments').select('*, clients(name), profiles(full_name)').order('created_at', { ascending: false }).limit(10),
                      ])
                      if (balanceRes.data) setBalance(balanceRes.data)
                      if (allRes.data) {
                        setAllAssignments(allRes.data)
                        const methodMap: Record<string, number> = {}
                        allRes.data.forEach((a) => {
                          if (a.payment_method && a.payment_amount_usd && !a.is_courtesy) {
                            methodMap[a.payment_method] = (methodMap[a.payment_method] || 0) + a.payment_amount_usd
                          }
                        })
                        setPaymentMethods(Object.entries(methodMap).map(([method, total]) => ({ method, total })))
                      }
                      if (summaryRes.data) setMonthlySummary(summaryRes.data)
                      if (profitRes.data) setProfitability(profitRes.data)
                      if (recentRes.data) setRecentAssignments(recentRes.data)
                    }}
                  />
                )}
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}

      {/* Live payment method breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ingresos del Mes por Método de Pago</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
                <Landmark className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-blue-600 font-medium">Banesco BSS</p>
                <p className="text-lg font-bold text-blue-800">{formatBSS(banescoBss)}</p>
                <p className="text-xs text-blue-600">≈ {formatUSD(banescoUsd)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-green-600 font-medium">Zelle (BoA)</p>
                <p className="text-lg font-bold text-green-800">{formatUSD(zelleTotal)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg bg-indigo-50 border border-indigo-200">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100">
                <CreditCard className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-indigo-600 font-medium">PayPal</p>
                <p className="text-lg font-bold text-indigo-800">{formatUSD(paypalTotal)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts row */}
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

      <ExpiringClients clients={allClients} />

      <RecentActivity assignments={recentAssignments} />
    </div>
  )
}
