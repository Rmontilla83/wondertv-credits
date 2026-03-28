'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import { ClientForm } from '@/components/forms/ClientForm'
import { QuickRechargeForm } from '@/components/forms/QuickRechargeForm'
import { CompleteSaleForm } from '@/components/forms/CompleteSaleForm'
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
import { formatUSD, formatDate, getStatusColor, getStatusLabel, formatBSS, daysUntilExpiration } from '@/lib/utils'
import { PAYMENT_METHOD_LABELS } from '@/lib/constants'
import type { Client, CreditAssignment } from '@/lib/types'
import { ArrowLeft, Edit, Zap, Gift, Globe, Calendar, User, Phone, Mail, Tv, Clock, CreditCard, AlertCircle } from 'lucide-react'

export default function ClientDetailPage() {
  const params = useParams()
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [client, setClient] = useState<Client | null>(null)
  const [assignments, setAssignments] = useState<CreditAssignment[]>([])
  const [editing, setEditing] = useState(false)
  const [rechargeOpen, setRechargeOpen] = useState(false)
  const [completeSaleId, setCompleteSaleId] = useState<string | null>(null)
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

  const daysToExpire = daysUntilExpiration(client.flujo_end_date)

  // Expiration urgency
  const expirationClass = daysToExpire === null ? '' :
    daysToExpire <= 0 ? 'bg-red-50 border-red-200 text-red-800' :
    daysToExpire <= 7 ? 'bg-orange-50 border-orange-200 text-orange-800' :
    daysToExpire <= 30 ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
    'bg-green-50 border-green-200 text-green-800'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/clients">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{client.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={getStatusColor(client.status)} variant="secondary">
                {getStatusLabel(client.status)}
              </Badge>
              {client.country && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Globe className="h-3 w-3" />{client.country}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {(profile?.role === 'admin' || profile?.role === 'operator') && (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
              <Dialog open={rechargeOpen} onOpenChange={setRechargeOpen}>
                <DialogTrigger render={<Button className="bg-green-600 hover:bg-green-700" size="sm" />}>
                  <Zap className="mr-1 h-4 w-4" />
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
            </>
          )}
        </div>
      </div>

      {/* Expiration alert */}
      {daysToExpire !== null && (
        <div className={`p-3 rounded-lg border ${expirationClass}`}>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {daysToExpire <= 0 ? (
              <span className="font-medium">Servicio expirado hace {Math.abs(daysToExpire)} días - Requiere recarga inmediata</span>
            ) : (
              <span>
                Servicio vence en <strong>{daysToExpire} días</strong>
                <span className="ml-2 text-sm opacity-75">({formatDate(client.flujo_end_date!)})</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Pending sales for this client */}
      {assignments.filter(a => a.payment_status === 'pending').length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-orange-800">
              <AlertCircle className="h-5 w-5" />
              Ventas pendientes de registrar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {assignments.filter(a => a.payment_status === 'pending').map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-white border border-orange-200">
                <div>
                  <Badge className="bg-orange-100 text-orange-800">+{a.quantity} mes{a.quantity > 1 ? 'es' : ''}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">{a.notes}</p>
                </div>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => setCompleteSaleId(a.id)}
                >
                  Registrar Pago
                </Button>
              </div>
            ))}

            <Dialog open={!!completeSaleId} onOpenChange={(open) => !open && setCompleteSaleId(null)}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Completar Venta</DialogTitle>
                </DialogHeader>
                {completeSaleId && (
                  <CompleteSaleForm
                    assignment={assignments.find(a => a.id === completeSaleId)!}
                    onComplete={() => {
                      setCompleteSaleId(null)
                      fetchData()
                    }}
                  />
                )}
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client info card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Información del Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {client.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Teléfono</p>
                  <p className="text-sm font-medium">{client.phone}</p>
                </div>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Correo</p>
                  <p className="text-sm font-medium">{client.email}</p>
                </div>
              </div>
            )}

            <div className="border-t pt-4 mt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Datos Flujo TV</p>

              {client.flujo_login && (
                <div className="flex items-center gap-3 mb-3">
                  <Tv className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Usuario IPTV</p>
                    <p className="text-sm font-mono font-medium">{client.flujo_login}</p>
                  </div>
                </div>
              )}
              {client.device_info && (
                <div className="flex items-center gap-3 mb-3">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Credenciales</p>
                    <p className="text-sm font-mono">{client.device_info}</p>
                  </div>
                </div>
              )}
              {client.flujo_start_date && (
                <div className="flex items-center gap-3 mb-3">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Inicio del Servicio</p>
                    <p className="text-sm font-medium">{formatDate(client.flujo_start_date)}</p>
                  </div>
                </div>
              )}
              {client.flujo_end_date && (
                <div className="flex items-center gap-3 mb-3">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Vencimiento</p>
                    <p className="text-sm font-medium">{formatDate(client.flujo_end_date)}</p>
                  </div>
                </div>
              )}
              {client.flujo_credits != null && (
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Meses en Flujo TV</p>
                    <p className="text-sm font-bold text-blue-600">{client.flujo_credits} meses</p>
                  </div>
                </div>
              )}
            </div>

            {client.notes && (
              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground">Notas</p>
                <p className="text-sm mt-1 whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats card */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resumen de Cuenta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                <p className="text-2xl font-bold text-blue-700">{client.flujo_credits ?? 0}</p>
                <p className="text-xs text-blue-600">Meses Flujo TV</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                <p className="text-2xl font-bold text-green-700">{formatUSD(totalPaid)}</p>
                <p className="text-xs text-green-600">Total Pagado</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-50 border border-purple-100">
                <p className="text-2xl font-bold text-purple-700">{totalCourtesy}</p>
                <p className="text-xs text-purple-600">Cortesías</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-2xl font-bold">{formatUSD(avgPricePerCredit)}</p>
                <p className="text-xs text-muted-foreground">Prom./Crédito</p>
              </div>
            </div>

            {daysToExpire !== null && (
              <div className="mt-4 p-3 rounded-lg bg-gray-50 border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Días para vencimiento</span>
                  <span className={`text-2xl font-bold ${
                    daysToExpire <= 0 ? 'text-red-600' :
                    daysToExpire <= 7 ? 'text-orange-600' :
                    daysToExpire <= 30 ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {daysToExpire <= 0 ? 'VENCIDO' : daysToExpire}
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      daysToExpire <= 0 ? 'bg-red-500' :
                      daysToExpire <= 7 ? 'bg-orange-500' :
                      daysToExpire <= 30 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, (daysToExpire / 30) * 100))}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* History */}
      <h2 className="text-lg font-semibold">Historial de Recargas</h2>

      {assignments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">
          <p>No hay recargas registradas en Wonder TV</p>
          <p className="text-xs mt-1">Las recargas se registran manualmente cuando el cliente paga</p>
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
