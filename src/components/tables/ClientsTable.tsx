'use client'

import { useRouter } from 'next/navigation'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatDate, getStatusColor, getStatusLabel } from '@/lib/utils'
import type { Client } from '@/lib/types'

interface ClientsTableProps {
  clients: (Client & { total_credits?: number; last_assignment?: string })[]
}

function getPassword(deviceInfo: string | null): string {
  if (!deviceInfo) return '-'
  const parts = deviceInfo.split(' / ')
  return parts.length > 1 ? parts[1] : '-'
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
            <TableHead className="whitespace-nowrap">Nombre de Usuario</TableHead>
            <TableHead className="whitespace-nowrap">Contraseña</TableHead>
            <TableHead className="whitespace-nowrap">Revendedor</TableHead>
            <TableHead className="whitespace-nowrap">Fecha de Inicio</TableHead>
            <TableHead className="whitespace-nowrap">Fecha de Finalización</TableHead>
            <TableHead className="whitespace-nowrap">Total Créditos Contratados</TableHead>
            <TableHead className="whitespace-nowrap">País</TableHead>
            <TableHead className="whitespace-nowrap">Notas</TableHead>
            <TableHead className="whitespace-nowrap">Correo Electrónico</TableHead>
            <TableHead className="whitespace-nowrap">Teléfono</TableHead>
            <TableHead className="whitespace-nowrap">Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow
              key={client.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => router.push(`/dashboard/clients/${client.id}`)}
            >
              <TableCell className="font-mono text-sm font-medium whitespace-nowrap">
                {client.flujo_login || '-'}
              </TableCell>
              <TableCell className="font-mono text-sm whitespace-nowrap">
                {getPassword(client.device_info)}
              </TableCell>
              <TableCell className="text-sm whitespace-nowrap">Wonderclass</TableCell>
              <TableCell className="text-sm whitespace-nowrap">
                {formatDate(client.flujo_start_date)}
              </TableCell>
              <TableCell className="text-sm whitespace-nowrap">
                {formatDate(client.flujo_end_date)}
              </TableCell>
              <TableCell className="text-sm text-center font-medium whitespace-nowrap">
                {client.flujo_credits ?? 0}
              </TableCell>
              <TableCell className="text-sm whitespace-nowrap">
                {client.country || '-'}
              </TableCell>
              <TableCell className="text-sm max-w-[250px] truncate" title={client.notes || ''}>
                {client.notes || '-'}
              </TableCell>
              <TableCell className="text-sm whitespace-nowrap">
                {client.email || '-'}
              </TableCell>
              <TableCell className="text-sm whitespace-nowrap">
                {client.phone || '-'}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <Badge className={getStatusColor(client.status)} variant="secondary">
                  {getStatusLabel(client.status)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
