'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ASSIGNMENT_PAYMENT_METHODS } from '@/lib/constants'
import { formatUSD, formatBSS, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { Loader2, AlertTriangle, Gift, DollarSign } from 'lucide-react'
import type { Client, CreditBalance } from '@/lib/types'
import { addMonths, format } from 'date-fns'

export function AssignmentForm() {
  const searchParams = useSearchParams()
  const preselectedClient = searchParams.get('client')

  const [clientId, setClientId] = useState(preselectedClient ?? '')
  const [clients, setClients] = useState<Client[]>([])
  const [quantity, setQuantity] = useState('1')
  const [periodStart, setPeriodStart] = useState(new Date().toISOString().split('T')[0])

  // Payment type
  const [isCourtesy, setIsCourtesy] = useState(false)
  const [courtesyReason, setCourtesyReason] = useState('')

  // Payment fields
  const [paymentAmountUsd, setPaymentAmountUsd] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentReference, setPaymentReference] = useState('')
  const [paymentAmountBss, setPaymentAmountBss] = useState('')
  const [exchangeRate, setExchangeRate] = useState('')

  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [balance, setBalance] = useState<CreditBalance | null>(null)
  const [clientSearch, setClientSearch] = useState('')

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { user, profile } = useAuth()

  useEffect(() => {
    async function fetchData() {
      const [clientsRes, balanceRes, rateRes] = await Promise.all([
        supabase.from('clients').select('*').eq('status', 'active').order('name'),
        supabase.from('credit_balance').select('*').maybeSingle(),
        supabase.from('exchange_rates').select('*').order('recorded_at', { ascending: false }).limit(1),
      ])

      if (clientsRes.data) setClients(clientsRes.data)
      if (balanceRes.data) setBalance(balanceRes.data)
      if (rateRes.data?.[0]) setExchangeRate(String(rateRes.data[0].rate_bss_usd))
    }

    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  const periodEnd = quantity && periodStart
    ? format(addMonths(new Date(periodStart), Number(quantity)), 'yyyy-MM-dd')
    : ''

  const wouldExceed = balance && Number(quantity) > (balance.available_credits ?? 0)
  const selectedClient = clients.find((c) => c.id === clientId)

  // Auto-calculate USD from BSS when method is Banesco
  useEffect(() => {
    if (paymentMethod === 'banesco_bss' && paymentAmountBss && exchangeRate) {
      const usd = Number(paymentAmountBss) / Number(exchangeRate)
      setPaymentAmountUsd(usd.toFixed(2))
    }
  }, [paymentAmountBss, exchangeRate, paymentMethod])

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  )

  const handleSubmit = async () => {
    if (!clientId || !quantity || !periodStart) {
      toast.error('Completa los campos requeridos')
      return
    }

    if (!isCourtesy && !paymentMethod) {
      toast.error('Selecciona un método de pago')
      return
    }

    if (isCourtesy && !courtesyReason.trim()) {
      toast.error('Indica el motivo de la cortesía')
      return
    }

    if (wouldExceed && profile?.role !== 'admin') {
      toast.error('No hay suficientes créditos disponibles')
      return
    }

    setLoading(true)

    const { error } = await supabase.from('credit_assignments').insert({
      client_id: clientId,
      assigned_by: user?.id,
      quantity: Number(quantity),
      period_start: periodStart,
      period_end: periodEnd,
      is_courtesy: isCourtesy,
      courtesy_reason: isCourtesy ? courtesyReason : null,
      payment_amount_usd: isCourtesy ? 0 : (paymentAmountUsd ? Number(paymentAmountUsd) : null),
      payment_method: isCourtesy ? null : (paymentMethod || null),
      payment_reference: isCourtesy ? null : (paymentReference || null),
      payment_amount_bss: (!isCourtesy && paymentMethod === 'banesco_bss' && paymentAmountBss) ? Number(paymentAmountBss) : null,
      exchange_rate: (!isCourtesy && paymentMethod === 'banesco_bss' && exchangeRate) ? Number(exchangeRate) : null,
      notes: notes || null,
    })

    if (error) {
      toast.error('Error al asignar créditos', { description: error.message })
      setLoading(false)
      return
    }

    toast.success(isCourtesy ? 'Cortesía registrada exitosamente' : 'Créditos asignados exitosamente')
    router.push('/dashboard/assignments')
    router.refresh()
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Asignar Créditos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Credit balance */}
        {balance && (
          <div className={`p-3 rounded-lg border ${wouldExceed ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
            <p className={`text-sm font-medium ${wouldExceed ? 'text-red-800' : 'text-blue-800'}`}>
              Créditos disponibles: <strong>{balance.available_credits}</strong>
              {wouldExceed && (
                <span className="flex items-center gap-1 mt-1">
                  <AlertTriangle className="h-4 w-4" />
                  La asignación excede los créditos disponibles
                </span>
              )}
            </p>
          </div>
        )}

        {/* Client select */}
        <div className="space-y-2">
          <Label>Cliente *</Label>
          <Select value={clientId} onValueChange={(v) => v && setClientId(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar cliente..." />
            </SelectTrigger>
            <SelectContent>
              <div className="px-2 pb-2">
                <Input
                  placeholder="Buscar cliente..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="h-8"
                />
              </div>
              {filteredClients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} {c.flujo_login ? `(${c.flujo_login})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quantity and period */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Cantidad de créditos / meses *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max="24"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="periodStart">Fecha de inicio *</Label>
            <Input
              id="periodStart"
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
            />
          </div>
        </div>

        {periodEnd && (
          <div className="p-3 rounded-lg bg-gray-50 border">
            <p className="text-sm">
              Período: <strong>{formatDate(periodStart)}</strong> al <strong>{formatDate(periodEnd)}</strong>
            </p>
          </div>
        )}

        {/* Courtesy toggle */}
        <div className="p-4 rounded-lg border bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isCourtesy ? (
                <Gift className="h-5 w-5 text-purple-600" />
              ) : (
                <DollarSign className="h-5 w-5 text-green-600" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {isCourtesy ? 'Cortesía (sin cobro)' : 'Venta (con cobro)'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isCourtesy ? 'Crédito gratuito, se registra con valor $0' : 'Se registra el pago del cliente'}
                </p>
              </div>
            </div>
            <Switch
              checked={isCourtesy}
              onCheckedChange={setIsCourtesy}
            />
          </div>
        </div>

        {/* Courtesy reason */}
        {isCourtesy && (
          <div className="space-y-2 p-4 rounded-lg border border-purple-200 bg-purple-50">
            <Label htmlFor="courtesyReason">Motivo de cortesía *</Label>
            <Input
              id="courtesyReason"
              placeholder="Ej: Prueba gratuita, compensación, amigo/familia..."
              value={courtesyReason}
              onChange={(e) => setCourtesyReason(e.target.value)}
            />
            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
              Se registrará con valor $0.00
            </Badge>
          </div>
        )}

        {/* Payment fields (only for sales) */}
        {!isCourtesy && (
          <>
            <div className="space-y-2">
              <Label>Método de pago *</Label>
              <Select value={paymentMethod} onValueChange={(v) => v && setPaymentMethod(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar método..." />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNMENT_PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Banesco BSS fields */}
            {paymentMethod === 'banesco_bss' && (
              <div className="space-y-3 p-4 rounded-lg border border-yellow-200 bg-yellow-50">
                <p className="text-sm font-medium text-yellow-800">Pago en Bolívares</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="bss">Monto en Bs *</Label>
                    <Input
                      id="bss"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={paymentAmountBss}
                      onChange={(e) => setPaymentAmountBss(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rate">Tasa paralelo (Bs/$) *</Label>
                    <Input
                      id="rate"
                      type="number"
                      step="0.01"
                      placeholder="Ej: 85.50"
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(e.target.value)}
                    />
                  </div>
                </div>
                {paymentAmountBss && exchangeRate && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Equivale a: {formatUSD(Number(paymentAmountBss) / Number(exchangeRate))}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      ({formatBSS(Number(paymentAmountBss))} ÷ {exchangeRate} Bs/$)
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* USD amount for Zelle/PayPal */}
            {(paymentMethod === 'zelle' || paymentMethod === 'paypal') && (
              <div className="space-y-2">
                <Label htmlFor="paymentUsd">Monto USD *</Label>
                <Input
                  id="paymentUsd"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={paymentAmountUsd}
                  onChange={(e) => setPaymentAmountUsd(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reference">Referencia de pago</Label>
              <Input
                id="reference"
                placeholder="Nro. de transacción o confirmación"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            </div>
          </>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notas (opcional)</Label>
          <Textarea
            id="notes"
            placeholder="Notas adicionales..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Submit */}
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                className={`w-full ${isCourtesy ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                disabled={loading || !clientId || !quantity || !periodStart || (!isCourtesy && !paymentMethod)}
              />
            }
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isCourtesy ? 'Registrar Cortesía' : 'Asignar Créditos'}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {isCourtesy ? 'Confirmar cortesía' : 'Confirmar asignación'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {isCourtesy ? (
                  <>¿Registrar cortesía de <strong>{quantity}</strong> crédito(s) a <strong>{selectedClient?.name ?? 'cliente'}</strong>? Motivo: {courtesyReason}</>
                ) : (
                  <>¿Asignar <strong>{quantity}</strong> crédito(s) a <strong>{selectedClient?.name ?? 'cliente'}</strong> por <strong>{paymentMethod === 'banesco_bss' ? formatBSS(Number(paymentAmountBss)) + ' (' + formatUSD(Number(paymentAmountUsd)) + ')' : formatUSD(Number(paymentAmountUsd))}</strong>?</>
                )}
                {wouldExceed && (
                  <span className="block mt-2 text-red-600 font-medium">
                    Advertencia: Esta asignación excede los créditos disponibles.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleSubmit}
                className={isCourtesy ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}
              >
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
