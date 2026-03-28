'use client'

import { useRouter } from 'next/navigation'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { getStatusColor, getStatusLabel, formatDate } from '@/lib/utils'
import type { Client } from '@/lib/types'
import { Globe, AlertTriangle } from 'lucide-react'

interface ClientsTableProps {
  clients: (Client & { total_credits?: number; last_assignment?: string })[]
}

function DaysLeftBadge({ endDate }: { endDate: string | null }) {
  if (!endDate) return <span className="text-muted-foreground text-xs">-</span>
  const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  if (days <= 0) {
    return (
      <Badge variant="secondary" className="bg-red-100 text-red-700 gap-1 text-xs">
        <AlertTriangle className="h-3 w-3" />Vencido
      </Badge>
    )
  }
  if (days <= 7) {
    return <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-xs">{days}d</Badge>
  }
  if (days <= 30) {
    return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 text-xs">{days}d</Badge>
  }
  return <span className="text-sm text-green-600 font-medium">{days}d</span>
}

export function ClientsTable({ clients }: ClientsTableProps) {
  const router = useRouter()

  if (clients.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">No hay clientes registrados</p>
        <p className="text-sm mt-1">Sincroniza desde Flujo TV o agrega manualmente</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead className="hidden sm:table-cell">Usuario IPTV</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="hidden md:table-cell">País</TableHead>
            <TableHead className="text-center">Meses</TableHead>
            <TableHead className="text-center">Vence</TableHead>
            <TableHead className="hidden lg:table-cell">Vencimiento</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow
              key={client.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => router.push(`/dashboard/clients/${client.id}`)}
            >
              <TableCell>
                <div>
                  <p className="font-medium text-sm">{client.name}</p>
                  {client.phone && (
                    <p className="text-xs text-muted-foreground">{client.phone}</p>
                  )}
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <span className="font-mono text-xs text-muted-foreground">
                  {client.flujo_login || '-'}
                </span>
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(client.status)} variant="secondary">
                  {getStatusLabel(client.status)}
                </Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {client.country ? (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Globe className="h-3 w-3" />{client.country}
                  </Badge>
                ) : '-'}
              </TableCell>
              <TableCell className="text-center font-medium">
                {client.flujo_credits ?? 0}
              </TableCell>
              <TableCell className="text-center">
                <DaysLeftBadge endDate={client.flujo_end_date} />
              </TableCell>
              <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                {formatDate(client.flujo_end_date)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
