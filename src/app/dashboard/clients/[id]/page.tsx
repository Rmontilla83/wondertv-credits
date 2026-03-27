'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import { ClientForm } from '@/components/forms/ClientForm'
import { QuickRechargeForm } from '@/components/forms/QuickRechargeForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { formatUSD, formatDate, getStatusColor, getStatusLabel, formatBSS } from '@/lib/utils'
import { PAYMENT_METHOD_LABELS } from '@/lib/constants'
import type { Client, CreditAssignment } from '@/lib/types'
import { ArrowLeft, Edit, Zap, Gift, Globe, Calendar } from 'lucide-react'

export default function ClientDetailPage() {
  const params = useParams()
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [client, setClient] = useState<Client | null>(null)
  const [assignments, setAssignments] = useState<CreditAssignment[]>([])
  const [editing, setEditing] = useState(false)
  const [rechargeOpen, setRechargeOpen] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  const clientId = params.id as string

  const fetchData = async () => {
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

  useEffect(() => {
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
  const totalCourtesy = assignments.filter(a => a.is_courtesy).reduce((sum, a) => sum + a.quantity, 0)
  const avgPricePerCredit = (totalCredits - totalCourtesy) > 0 ? totalPaid / (totalCredits - totalCourtesy) : 0

  // Days until expiration
  const daysToExpire = client.flujo_end_date
    ? Math.ceil((new Date(client.flujo_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/clients">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{client.name}</h1>
        </div>

        {/* Quick Recharge Button */}
        {(profile?.role === 'admin' || profile?.role === 'operator') && (
          <Dialog open={rechargeOpen} onOpenChange={setRechargeOpen}>
            <DialogTrigger render={<Button className="bg-green-600 hover:bg-green-700" />}>
              <Zap className="mr-2 h-4 w-4" />
              Reportar Recarga
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Reportar Recarga</DialogTitle>
              </DialogHeader>
              <QuickRechargeForm
                client={client}
                onComplete={() => {
                  setRechargeOpen(false)
                  fetchData()
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client info card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Información</CardTitle>
            {(profile?.role === 'admin' || profile?.role === 'operator') && (
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(client.status)} variant="secondary">
                {getStatusLabel(client.status)}
              </Badge>
              {client.country && (
                <Badge variant="secondary" className="gap-1">
                  <Globe className="h-3 w-3" />{client.country}
                </Badge>
              )}
            </div>

            {/* Flujo TV expiration */}
            {daysToExpire !== null && (
              <div className={`p-2 rounded-lg border text-sm ${
                daysToExpire <= 0 ? 'bg-red-50 border-red-200 text-red-800' :
                daysToExpire <= 7 ? 'bg-orange-50 border-orange-200 text-orange-800' :
                daysToExpire <= 30 ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                'bg-green-50 border-green-200 text-green-800'
              }`}>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {daysToExpire <= 0 ? (
                    <span className="font-medium">Expirado hace {Math.abs(daysToExpire)} días</span>
                  ) : (
                    <span>Vence en <strong>{daysToExpire} días</strong> ({formatDate(client.flujo_end_date!)})</span>
                  )}
                </div>
              </div>
            )}

            {client.phone && (
              <div>
                <p className="text-xs text-muted-foreground">Teléfono</p>
                <p className="text-sm font-medium">{client.phone}</p>
              </div>
            )}
            {client.email && (
              <div>
                <p className="text-xs text-muted-foreground">Correo</p>
                <p className="text-sm font-medium">{client.email}</p>
              </div>
            )}
            {client.flujo_login && (
              <div>
                <p className="text-xs text-muted-foreground">Usuario IPTV</p>
                <p className="text-sm font-medium">{client.device_info}</p>
              </div>
            )}
            {client.flujo_credits && (
              <div>
                <p className="text-xs text-muted-foreground">Créditos Flujo TV</p>
                <p className="text-sm font-medium">{client.flujo_credits} meses</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats card */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{totalCredits}</p>
                <p className="text-xs text-muted-foreground">Total Créditos</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{formatUSD(totalPaid)}</p>
                <p className="text-xs text-muted-foreground">Total Pagado</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{totalCourtesy}</p>
                <p className="text-xs text-muted-foreground">Cortesías</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{formatUSD(avgPricePerCredit)}</p>
                <p className="text-xs text-muted-foreground">Prom./Crédito</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History */}
      <h2 className="text-lg font-semibold">Historial de Recargas</h2>

      {assignments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">
          <p>No hay recargas registradas aún</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Meses</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead>Operador</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{formatDate(a.created_at)}</TableCell>
                  <TableCell>
                    {a.is_courtesy ? (
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800 gap-1">
                        <Gift className="h-3 w-3" />Cortesía
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Venta
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">{a.quantity}</TableCell>
                  <TableCell className="text-right">
                    {a.is_courtesy ? (
                      <span className="text-muted-foreground text-xs">{a.courtesy_reason}</span>
                    ) : (
                      <>
                        {formatUSD(a.payment_amount_usd)}
                        {a.payment_amount_bss && (
                          <span className="block text-xs text-muted-foreground">
                            {formatBSS(a.payment_amount_bss)} @ {a.exchange_rate}
                          </span>
                        )}
                      </>
                    )}
                  </TableCell>
                  <TableCell>{a.is_courtesy ? '-' : (a.payment_method ? PAYMENT_METHOD_LABELS[a.payment_method] : '-')}</TableCell>
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
