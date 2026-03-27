'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import type { MonthlyProfitability } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface RevenueChartProps {
  data: MonthlyProfitability[]
}

export function RevenueChart({ data }: RevenueChartProps) {
  const chartData = [...data].reverse().map((item) => ({
    month: format(parseISO(item.month), 'MMM yy', { locale: es }),
    Compras: item.credits_bought,
    Asignados: item.credits_sold,
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Créditos: Compras vs Asignaciones</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Legend />
              <Bar dataKey="Compras" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Asignados" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
