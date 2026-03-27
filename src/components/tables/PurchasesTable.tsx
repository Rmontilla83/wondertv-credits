'use client'

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { formatUSD, formatDate } from '@/lib/utils'
import { PAYMENT_METHOD_LABELS } from '@/lib/constants'
import type { CreditPurchase } from '@/lib/types'

interface PurchasesTableProps {
  purchases: CreditPurchase[]
}

export function PurchasesTable({ purchases }: PurchasesTableProps) {
  if (purchases.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">No hay compras registradas aún</p>
        <p className="text-sm mt-1">Registra tu primera compra de créditos</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead className="text-right">Cantidad</TableHead>
            <TableHead className="text-right">Costo Total</TableHead>
            <TableHead className="text-right">Costo/Crédito</TableHead>
            <TableHead>Método</TableHead>
            <TableHead>Referencia</TableHead>
            <TableHead>Comprado por</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {purchases.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{formatDate(p.purchased_at)}</TableCell>
              <TableCell className="text-right font-medium">{p.quantity}</TableCell>
              <TableCell className="text-right">{formatUSD(p.total_cost_usd)}</TableCell>
              <TableCell className="text-right">{formatUSD(p.cost_per_credit)}</TableCell>
              <TableCell>{PAYMENT_METHOD_LABELS[p.payment_method]}</TableCell>
              <TableCell className="max-w-[150px] truncate">{p.payment_reference || '-'}</TableCell>
              <TableCell>{p.profiles?.full_name || '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
