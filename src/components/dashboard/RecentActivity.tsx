'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatUSD, formatDateTime } from '@/lib/utils'
import { PAYMENT_METHOD_LABELS } from '@/lib/constants'
import type { CreditAssignment } from '@/lib/types'

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
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {a.clients?.name ?? 'Cliente'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {a.quantity} crédito{a.quantity > 1 ? 's' : ''}
                    </Badge>
                    {a.payment_method && (
                      <span className="text-xs text-muted-foreground">
                        {PAYMENT_METHOD_LABELS[a.payment_method]}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-sm font-medium">{formatUSD(a.payment_amount_usd)}</p>
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
