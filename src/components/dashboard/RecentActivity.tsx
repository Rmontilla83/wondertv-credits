'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatUSD, formatDateTime } from '@/lib/utils'
import { PAYMENT_METHOD_LABELS } from '@/lib/constants'
import type { CreditAssignment } from '@/lib/types'
import { Gift, Clock, CheckCircle } from 'lucide-react'

interface RecentActivityProps {
  assignments: CreditAssignment[]
}

export function RecentActivity({ assignments }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Actividad Reciente</CardTitle>
      </CardHeader>
      <CardContent>
        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No hay asignaciones recientes
          </p>
        ) : (
          <div className="space-y-3">
            {assignments.map((a) => (
              <div key={a.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                a.payment_status === 'pending'
                  ? 'bg-orange-50 border-orange-200'
                  : a.is_courtesy
                  ? 'bg-purple-50 border-purple-200'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {a.clients?.name ?? 'Cliente'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {a.quantity} crédito{a.quantity > 1 ? 's' : ''}
                    </Badge>
                    {a.payment_status === 'pending' ? (
                      <span className="text-xs text-orange-600 flex items-center gap-1">
                        <Clock className="h-3 w-3" />Pago pendiente
                      </span>
                    ) : a.is_courtesy ? (
                      <span className="text-xs text-purple-600 flex items-center gap-1">
                        <Gift className="h-3 w-3" />Cortesía
                      </span>
                    ) : a.payment_method ? (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        {PAYMENT_METHOD_LABELS[a.payment_method]}
                      </span>
                    ) : null}
                    {a.profiles?.full_name && (
                      <span className="text-xs text-muted-foreground">por {a.profiles.full_name}</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  {a.payment_status === 'pending' ? (
                    <Badge className="bg-orange-100 text-orange-700">Pendiente</Badge>
                  ) : (
                    <p className="text-sm font-medium">{formatUSD(a.payment_amount_usd)}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{formatDateTime(a.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
