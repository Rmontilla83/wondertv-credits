'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import type { MonthlyProfitability } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatUSD } from '@/lib/utils'

interface ProfitabilityChartProps {
  data: MonthlyProfitability[]
}

export function ProfitabilityChart({ data }: ProfitabilityChartProps) {
  const chartData = [...data].reverse().map((item) => ({
    month: format(parseISO(item.month), 'MMM yy', { locale: es }),
    Costo: item.total_cost_usd,
    Ingreso: item.revenue_usd,
    Ganancia: item.profit_usd,
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Rentabilidad Mensual (USD)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" tickFormatter={(v) => formatUSD(v)} />
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
  )
}
