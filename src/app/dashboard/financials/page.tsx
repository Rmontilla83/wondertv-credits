'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { KPICard } from '@/components/dashboard/KPICard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { formatUSD } from '@/lib/utils'
import { PAYMENT_METHOD_LABELS } from '@/lib/constants'
import type { MonthlyProfitability, CreditBalance } from '@/lib/types'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { format, parseISO, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  DollarSign, TrendingUp, TrendingDown, Percent, CircleDollarSign, Receipt,
} from 'lucide-react'

export default function FinancialsPage() {
  const [loading, setLoading] = useState(true)
  const [profitability, setProfitability] = useState<MonthlyProfitability[]>([])
  const [balance, setBalance] = useState<CreditBalance | null>(null)
  const [paymentBreakdown, setPaymentBreakdown] = useState<{ method: string; total: number }[]>([])
  const [totalInvestment, setTotalInvestment] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalCreditsAssigned, setTotalCreditsAssigned] = useState(0)
  const [avgCostPerCredit, setAvgCostPerCredit] = useState(0)
  const [burnRateDays, setBurnRateDays] = useState<number | null>(null)
  const [reorderDate, setReorderDate] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      const [profitRes, balanceRes, purchasesRes, assignmentsRes] = await Promise.all([
        supabase.from('monthly_profitability').select('*').limit(24),
        supabase.from('credit_balance').select('*').single(),
        supabase.from('credit_purchases').select('quantity, total_cost_usd'),
        supabase.from('credit_assignments').select('quantity, payment_amount_usd, payment_method, created_at'),
      ])

      if (profitRes.data) setProfitability(profitRes.data)
      if (balanceRes.data) setBalance(balanceRes.data)

      // Calculate totals
      const investment = purchasesRes.data?.reduce((s, p) => s + p.total_cost_usd, 0) ?? 0
      const totalPurchased = purchasesRes.data?.reduce((s, p) => s + p.quantity, 0) ?? 0
      setTotalInvestment(investment)
      setAvgCostPerCredit(totalPurchased > 0 ? investment / totalPurchased : 0)

      const revenue = assignmentsRes.data?.reduce((s, a) => s + (a.payment_amount_usd ?? 0), 0) ?? 0
      const creditsAssigned = assignmentsRes.data?.reduce((s, a) => s + a.quantity, 0) ?? 0
      setTotalRevenue(revenue)
      setTotalCreditsAssigned(creditsAssigned)

      // Payment method breakdown
      const methodMap: Record<string, number> = {}
      assignmentsRes.data?.forEach((a) => {
        if (a.payment_method && a.payment_amount_usd) {
          methodMap[a.payment_method] = (methodMap[a.payment_method] || 0) + a.payment_amount_usd
        }
      })
      setPaymentBreakdown(Object.entries(methodMap).map(([method, total]) => ({ method, total })))

      // Burn rate calculation
      if (assignmentsRes.data && assignmentsRes.data.length > 1 && balanceRes.data) {
        const sorted = [...assignmentsRes.data].sort((a, b) => a.created_at.localeCompare(b.created_at))
        const firstDate = new Date(sorted[0].created_at)
        const lastDate = new Date(sorted[sorted.length - 1].created_at)
        const daySpan = differenceInDays(lastDate, firstDate) || 1
        const dailyRate = creditsAssigned / daySpan
        if (dailyRate > 0 && balanceRes.data.available_credits > 0) {
          const daysLeft = Math.round(balanceRes.data.available_credits / dailyRate)
          setBurnRateDays(daysLeft)
          const reorder = new Date()
          reorder.setDate(reorder.getDate() + Math.max(0, daysLeft - 7))
          setReorderDate(format(reorder, 'dd/MM/yyyy'))
        }
      }

      setLoading(false)
    }

    fetchData()
  }, [supabase])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    )
  }

  const profit = totalRevenue - totalInvestment
  const margin = totalInvestment > 0 ? ((profit / totalInvestment) * 100) : 0
  const avgSalePrice = totalCreditsAssigned > 0 ? totalRevenue / totalCreditsAssigned : 0

  // Chart data
  const monthlyChartData = [...profitability].reverse().map((item) => ({
    month: format(parseISO(item.month), 'MMM yy', { locale: es }),
    Costo: item.total_cost_usd,
    Ingreso: item.revenue_usd,
    Ganancia: item.profit_usd,
  }))

  // Cumulative profit
  let cumulative = 0
  const cumulativeData = [...profitability].reverse().map((item) => {
    cumulative += item.profit_usd
    return {
      month: format(parseISO(item.month), 'MMM yy', { locale: es }),
      'Ganancia Acumulada': cumulative,
    }
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Finanzas</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          title="Inversión Total"
          value={formatUSD(totalInvestment)}
          icon={TrendingDown}
          iconColor="text-red-600 bg-red-100"
        />
        <KPICard
          title="Ingresos Totales"
          value={formatUSD(totalRevenue)}
          icon={DollarSign}
          iconColor="text-green-600 bg-green-100"
        />
        <KPICard
          title="Ganancia Total"
          value={formatUSD(profit)}
          icon={TrendingUp}
          iconColor={profit >= 0 ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'}
        />
        <KPICard
          title="Margen General"
          value={`${margin.toFixed(1)}%`}
          icon={Percent}
          iconColor="text-blue-600 bg-blue-100"
        />
        <KPICard
          title="Costo Prom./Crédito"
          value={formatUSD(avgCostPerCredit)}
          icon={CircleDollarSign}
          iconColor="text-orange-600 bg-orange-100"
        />
        <KPICard
          title="Venta Prom./Crédito"
          value={formatUSD(avgSalePrice)}
          icon={Receipt}
          iconColor="text-purple-600 bg-purple-100"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">P&L Mensual (USD)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(value) => formatUSD(Number(value))} />
                  <Legend />
                  <Bar dataKey="Costo" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Ingreso" fill="#22C55E" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Ganancia" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ganancia Acumulada (USD)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cumulativeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(value) => formatUSD(Number(value))} />
                  <Line
                    type="monotone"
                    dataKey="Ganancia Acumulada"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Burn Rate Analysis */}
      {burnRateDays !== null && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Análisis de Consumo de Créditos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-2xl font-bold text-blue-800">{burnRateDays} días</p>
                <p className="text-sm text-blue-600">Créditos restantes al ritmo actual</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                <p className="text-2xl font-bold text-yellow-800">{balance?.available_credits}</p>
                <p className="text-sm text-yellow-600">Créditos disponibles</p>
              </div>
              {reorderDate && (
                <div className="text-center p-4 rounded-lg bg-orange-50 border border-orange-200">
                  <p className="text-lg font-bold text-orange-800">{reorderDate}</p>
                  <p className="text-sm text-orange-600">Fecha sugerida de reabastecimiento</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Breakdown Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Desglose Mensual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mes</TableHead>
                  <TableHead className="text-right">Créditos Comprados</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                  <TableHead className="text-right">Créditos Vendidos</TableHead>
                  <TableHead className="text-right">Ingreso</TableHead>
                  <TableHead className="text-right">Ganancia</TableHead>
                  <TableHead className="text-right">Margen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profitability.map((p) => (
                  <TableRow key={p.month}>
                    <TableCell>
                      {format(parseISO(p.month), 'MMMM yyyy', { locale: es })}
                    </TableCell>
                    <TableCell className="text-right">{p.credits_bought}</TableCell>
                    <TableCell className="text-right">{formatUSD(p.total_cost_usd)}</TableCell>
                    <TableCell className="text-right">{p.credits_sold}</TableCell>
                    <TableCell className="text-right">{formatUSD(p.revenue_usd)}</TableCell>
                    <TableCell className={`text-right font-medium ${p.profit_usd >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatUSD(p.profit_usd)}
                    </TableCell>
                    <TableCell className="text-right">{p.margin_pct}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Breakdown */}
      {paymentBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Desglose por Método de Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Método</TableHead>
                    <TableHead className="text-right">Total USD</TableHead>
                    <TableHead className="text-right">% del Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentBreakdown
                    .sort((a, b) => b.total - a.total)
                    .map((p) => (
                      <TableRow key={p.method}>
                        <TableCell>{PAYMENT_METHOD_LABELS[p.method] || p.method}</TableCell>
                        <TableCell className="text-right">{formatUSD(p.total)}</TableCell>
                        <TableCell className="text-right">
                          {totalRevenue > 0 ? ((p.total / totalRevenue) * 100).toFixed(1) : 0}%
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
