'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ASSIGNMENT_PAYMENT_METHODS } from '@/lib/constants'
import { formatUSD, formatBSS, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { Loader2, Gift, DollarSign } from 'lucide-react'
import type { Client } from '@/lib/types'
import { addMonths, format } from 'date-fns'

interface QuickRechargeFormProps {
  client: Client
  onComplete: () => void
}

export function QuickRechargeForm({ client, onComplete }: QuickRechargeFormProps) {
  const [quantity, setQuantity] = useState('1')
  const [periodStart, setPeriodStart] = useState(new Date().toISOString().split('T')[0])
  const [isCourtesy, setIsCourtesy] = useState(false)
  const [courtesyReason, setCourtesyReason] = useState('')
  const [paymentAmountUsd, setPaymentAmountUsd] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentReference, setPaymentReference] = useState('')
  const [paymentAmountBss, setPaymentAmountBss] = useState('')
  const [exchangeRate, setExchangeRate] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { user } = useAuth()

  // Load latest exchange rate
  useEffect(() => {
    supabase
      .from('exchange_rates')
      .select('rate_bss_usd')
      .order('recorded_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]) setExchangeRate(String(data[0].rate_bss_usd))
      })
  }, [supabase])

  const periodEnd = quantity && periodStart
    ? format(addMonths(new Date(periodStart), Number(quantity)), 'yyyy-MM-dd')
    : ''

  // Auto-calculate USD from BSS
  useEffect(() => {
    if (paymentMethod === 'banesco_bss' && paymentAmountBss && exchangeRate) {
      setPaymentAmountUsd((Number(paymentAmountBss) / Number(exchangeRate)).toFixed(2))
    }
  }, [paymentAmountBss, exchangeRate, paymentMethod])

  const handleSubmit = async () => {
    if (!isCourtesy && !paymentMethod) {
      toast.error('Selecciona un método de pago')
      return
    }
    if (isCourtesy && !courtesyReason.trim()) {
      toast.error('Indica el motivo de la cortesía')
      return
    }

    setLoading(true)

    const { error } = await supabase.from('credit_assignments').insert({
      client_id: client.id,
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
      toast.error('Error al registrar recarga', { description: error.message })
      setLoading(false)
      return
    }

    toast.success(isCourtesy ? 'Cortesía registrada' : 'Recarga registrada')
    onComplete()
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Client info */}
      <div className="p-3 rounded-lg bg-gray-50 border flex items-center justify-between">
        <div>
          <p className="font-medium">{client.name}</p>
          <p className="text-xs text-muted-foreground">
            {client.flujo_login && <span>IPTV: {client.flujo_login}</span>}
            {client.flujo_end_date && (
              <span className="ml-2">Vence: {formatDate(client.flujo_end_date)}</span>
            )}
          </p>
        </div>
        {client.flujo_credits && (
          <Badge variant="secondary">{client.flujo_credits} créditos</Badge>
        )}
      </div>

      {/* Quantity + period */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Meses</Label>
          <Input type="number" min="1" max="24" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Desde</Label>
          <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
        </div>
      </div>

      {periodEnd && (
        <p className="text-xs text-muted-foreground">
          Período: {formatDate(periodStart)} al {formatDate(periodEnd)}
        </p>
      )}

      {/* Courtesy toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">
        <div className="flex items-center gap-2">
          {isCourtesy ? <Gift className="h-4 w-4 text-purple-600" /> : <DollarSign className="h-4 w-4 text-green-600" />}
          <span className="text-sm font-medium">{isCourtesy ? 'Cortesía' : 'Venta'}</span>
        </div>
        <Switch checked={isCourtesy} onCheckedChange={setIsCourtesy} />
      </div>

      {isCourtesy ? (
        <div className="space-y-2">
          <Label className="text-xs">Motivo de cortesía *</Label>
          <Input
            placeholder="Ej: Prueba, compensación, amigo..."
            value={courtesyReason}
            onChange={(e) => setCourtesyReason(e.target.value)}
          />
        </div>
      ) : (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Método de pago *</Label>
            <Select value={paymentMethod} onValueChange={(v) => v && setPaymentMethod(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNMENT_PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {paymentMethod === 'banesco_bss' && (
            <div className="space-y-2 p-3 rounded-lg border border-yellow-200 bg-yellow-50">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Monto Bs</Label>
                  <Input type="number" step="0.01" placeholder="0.00" value={paymentAmountBss} onChange={(e) => setPaymentAmountBss(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tasa paralelo</Label>
                  <Input type="number" step="0.01" placeholder="85.50" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} />
                </div>
              </div>
              {paymentAmountBss && exchangeRate && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  = {formatUSD(Number(paymentAmountBss) / Number(exchangeRate))}
                </Badge>
              )}
            </div>
          )}

          {(paymentMethod === 'zelle' || paymentMethod === 'paypal') && (
            <div className="space-y-1">
              <Label className="text-xs">Monto USD</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={paymentAmountUsd} onChange={(e) => setPaymentAmountUsd(e.target.value)} />
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Referencia</Label>
            <Input placeholder="Nro. transacción" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} />
          </div>
        </>
      )}

      <div className="space-y-1">
        <Label className="text-xs">Notas</Label>
        <Textarea placeholder="Opcional..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>

      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button
              className={`w-full ${isCourtesy ? 'bg-purple-600 hover:bg-purple-700' : 'bg-green-600 hover:bg-green-700'}`}
              disabled={loading || (!isCourtesy && !paymentMethod)}
            />
          }
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isCourtesy ? 'Registrar Cortesía' : 'Registrar Recarga'}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar</AlertDialogTitle>
            <AlertDialogDescription>
              {isCourtesy
                ? <>¿Registrar cortesía de {quantity} mes(es) a <strong>{client.name}</strong>?</>
                : <>¿Registrar recarga de {quantity} mes(es) a <strong>{client.name}</strong> por {paymentMethod === 'banesco_bss' ? formatBSS(Number(paymentAmountBss)) : formatUSD(Number(paymentAmountUsd))}?</>
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} className={isCourtesy ? 'bg-purple-600' : 'bg-green-600'}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
