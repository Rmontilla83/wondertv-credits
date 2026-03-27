'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import { ClientForm } from '@/components/forms/ClientForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { formatUSD, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils'
import { PAYMENT_METHOD_LABELS } from '@/lib/constants'
import type { Client, CreditAssignment } from '@/lib/types'
import { ArrowLeft, Edit, Send } from 'lucide-react'

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [client, setClient] = useState<Client | null>(null)
  const [assignments, setAssignments] = useState<CreditAssignment[]>([])
  const [editing, setEditing] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  const clientId = params.id as string

  useEffect(() => {
    async function fetchData() {
      try {
        const [clientRes, assignmentsRes] = await Promise.all([
          supabase.from('clients').select('*').eq('id', clientId).single(),
          supabase
            .from('credit_assignments')
            .select('*, profiles(full_name)')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false }),
        ])

        if (clientRes.data) setClient(clientRes.data)
        if (assignmentsRes.data) setAssignments(assignmentsRes.data)
      } catch (error) {
        console.error('Error fetching client detail data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, clientId])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">Cliente no encontrado</p>
      </div>
    )
  }

  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setEditing(false)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Editar Cliente</h1>
        </div>
        <ClientForm client={client} />
      </div>
    )
  }

  const totalCredits = assignments.reduce((sum, a) => sum + a.quantity, 0)
  const totalPaid = assignments.reduce((sum, a) => sum + (a.payment_amount_usd ?? 0), 0)
  const avgPricePerCredit = totalCredits > 0 ? totalPaid / totalCredits : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/clients">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{client.name}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Información del Cliente</CardTitle>
            {(profile?.role === 'admin' || profile?.role === 'operator') && (
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Estado</p>
              <Badge className={getStatusColor(client.status)} variant="secondary">
                {getStatusLabel(client.status)}
              </Badge>
            </div>
            {client.phone && (
              <div>
                <p className="text-sm text-muted-foreground">Teléfono</p>
                <p className="text-sm font-medium">{client.phone}</p>
              </div>
            )}
            {client.email && (
              <div>
                <p className="text-sm text-muted-foreground">Correo</p>
                <p className="text-sm font-medium">{client.email}</p>
              </div>
            )}
            {client.device_info && (
              <div>
                <p className="text-sm text-muted-foreground">Dispositivo</p>
                <p className="text-sm font-medium">{client.device_info}</p>
              </div>
            )}
            {client.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Notas</p>
                <p className="text-sm">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{totalCredits}</p>
                <p className="text-sm text-muted-foreground">Total Créditos</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{formatUSD(totalPaid)}</p>
                <p className="text-sm text-muted-foreground">Total Pagado</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{formatUSD(avgPricePerCredit)}</p>
                <p className="text-sm text-muted-foreground">Precio Prom./Crédito</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Historial de Créditos</h2>
        <Link href={`/dashboard/assignments/new?client=${client.id}`}>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
            <Send className="mr-2 h-4 w-4" />
            Asignar Créditos
          </Button>
        </Link>
      </div>

      {assignments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">
          <p>No hay créditos asignados aún</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Créditos</TableHead>
                <TableHead>Período</TableHead>
                <TableHead className="text-right">Monto USD</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead>Asignado por</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{formatDate(a.created_at)}</TableCell>
                  <TableCell className="text-right font-medium">{a.quantity}</TableCell>
                  <TableCell>{formatDate(a.period_start)} - {formatDate(a.period_end)}</TableCell>
                  <TableCell className="text-right">{formatUSD(a.payment_amount_usd)}</TableCell>
                  <TableCell>{a.payment_method ? PAYMENT_METHOD_LABELS[a.payment_method] : '-'}</TableCell>
                  <TableCell className="max-w-[120px] truncate">{a.payment_reference || '-'}</TableCell>
                  <TableCell>{a.profiles?.full_name || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
