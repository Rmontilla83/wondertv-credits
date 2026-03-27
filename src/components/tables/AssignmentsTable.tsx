'use client'

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { formatUSD, formatBSS, formatDate } from '@/lib/utils'
import { PAYMENT_METHOD_LABELS } from '@/lib/constants'
import type { CreditAssignment } from '@/lib/types'

interface AssignmentsTableProps {
  assignments: CreditAssignment[]
}

export function AssignmentsTable({ assignments }: AssignmentsTableProps) {
  if (assignments.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">No hay asignaciones registradas aún</p>
        <p className="text-sm mt-1">Asigna créditos a tus clientes</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="text-right">Créditos</TableHead>
            <TableHead className="text-right">Monto USD</TableHead>
            <TableHead className="text-right">Monto BSS</TableHead>
            <TableHead>Método</TableHead>
            <TableHead>Referencia</TableHead>
            <TableHead>Asignado por</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignments.map((a) => (
            <TableRow key={a.id}>
              <TableCell>{formatDate(a.created_at)}</TableCell>
              <TableCell className="font-medium">{a.clients?.name ?? '-'}</TableCell>
              <TableCell className="text-right">{a.quantity}</TableCell>
              <TableCell className="text-right">{formatUSD(a.payment_amount_usd)}</TableCell>
              <TableCell className="text-right">
                {a.payment_amount_bss ? formatBSS(a.payment_amount_bss) : '-'}
              </TableCell>
              <TableCell>{a.payment_method ? PAYMENT_METHOD_LABELS[a.payment_method] : '-'}</TableCell>
              <TableCell className="max-w-[120px] truncate">{a.payment_reference || '-'}</TableCell>
              <TableCell>{a.profiles?.full_name || '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
