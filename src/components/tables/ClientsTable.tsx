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

export function ClientsTable({ clients }: ClientsTableProps) {
  const router = useRouter()

  if (clients.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">No hay clientes registrados aún</p>
        <p className="text-sm mt-1">Agrega tu primer cliente</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Créditos Asignados</TableHead>
            <TableHead>Última Asignación</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow
              key={client.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => router.push(`/dashboard/clients/${client.id}`)}
            >
              <TableCell className="font-medium">{client.name}</TableCell>
              <TableCell>{client.phone || '-'}</TableCell>
              <TableCell>
                <Badge className={getStatusColor(client.status)} variant="secondary">
                  {getStatusLabel(client.status)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">{client.total_credits ?? 0}</TableCell>
              <TableCell>{client.last_assignment ? formatDate(client.last_assignment) : '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
