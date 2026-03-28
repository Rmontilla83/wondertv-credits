'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, daysUntilExpiration } from '@/lib/utils'
import type { Client } from '@/lib/types'
import { AlertTriangle, Clock, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface ExpiringClientsProps {
  clients: Client[]
}

export function ExpiringClients({ clients }: ExpiringClientsProps) {
  const withDays = clients
    .filter(c => c.flujo_end_date && c.status === 'active')
    .map(c => ({
      ...c,
      daysLeft: daysUntilExpiration(c.flujo_end_date) ?? 0,
    }))
    .filter(c => c.daysLeft <= 30)
    .sort((a, b) => a.daysLeft - b.daysLeft)

  const expired = withDays.filter(c => c.daysLeft <= 0)
  const critical = withDays.filter(c => c.daysLeft > 0 && c.daysLeft <= 7)
  const warning = withDays.filter(c => c.daysLeft > 7 && c.daysLeft <= 14)
  const upcoming = withDays.filter(c => c.daysLeft > 14 && c.daysLeft <= 30)

  if (withDays.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Alertas de Vencimiento
        </CardTitle>
        <Link href="/dashboard/expiring">
          <Button variant="ghost" size="sm" className="text-xs">
            Ver todos <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {/* Summary badges */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {expired.length > 0 && (
            <Badge className="bg-red-100 text-red-800">{expired.length} expirados</Badge>
          )}
          {critical.length > 0 && (
            <Badge className="bg-orange-100 text-orange-800">{critical.length} en 7 días</Badge>
          )}
          {warning.length > 0 && (
            <Badge className="bg-yellow-100 text-yellow-800">{warning.length} en 14 días</Badge>
          )}
          {upcoming.length > 0 && (
            <Badge className="bg-blue-100 text-blue-800">{upcoming.length} en 30 días</Badge>
          )}
        </div>

        {/* Client list (show top 8) */}
        <div className="space-y-2">
          {withDays.slice(0, 8).map(c => (
            <Link
              key={c.id}
              href={`/dashboard/clients/${c.id}`}
              className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.flujo_login} {c.country && `· ${c.country}`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <Clock className={`h-3.5 w-3.5 ${
                  c.daysLeft <= 0 ? 'text-red-500' :
                  c.daysLeft <= 7 ? 'text-orange-500' :
                  c.daysLeft <= 14 ? 'text-yellow-500' :
                  'text-blue-500'
                }`} />
                <span className={`text-xs font-medium ${
                  c.daysLeft <= 0 ? 'text-red-600' :
                  c.daysLeft <= 7 ? 'text-orange-600' :
                  c.daysLeft <= 14 ? 'text-yellow-600' :
                  'text-blue-600'
                }`}>
                  {c.daysLeft <= 0 ? `Expirado` : `${c.daysLeft}d`}
                </span>
                <span className="text-xs text-muted-foreground">{formatDate(c.flujo_end_date!)}</span>
              </div>
            </Link>
          ))}
        </div>

        {withDays.length > 8 && (
          <Link href="/dashboard/expiring">
            <p className="text-xs text-center text-blue-600 mt-3 hover:underline">
              +{withDays.length - 8} más
            </p>
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
