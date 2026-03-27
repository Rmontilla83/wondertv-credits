'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CreditGaugeProps {
  available: number
  total: number
  assigned: number
}

export function CreditGauge({ available, total, assigned }: CreditGaugeProps) {
  const percentage = total > 0 ? Math.round((available / total) * 100) : 0
  const usedPercentage = total > 0 ? Math.round((assigned / total) * 100) : 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Inventario de Créditos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center">
          <div className="relative w-40 h-40">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="10" />
              <circle
                cx="60" cy="60" r="50" fill="none"
                stroke="#3B82F6" strokeWidth="10"
                strokeDasharray={`${percentage * 3.14} ${314 - percentage * 3.14}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold">{available}</span>
              <span className="text-xs text-muted-foreground">disponibles</span>
            </div>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total comprados</span>
            <span className="font-medium">{total}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Asignados</span>
            <span className="font-medium">{assigned}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Uso</span>
            <span className="font-medium">{usedPercentage}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
