'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ASSIGNMENT_PAYMENT_METHODS } from '@/lib/constants'
import { formatUSD, formatBSS } from '@/lib/utils'
import { toast } from 'sonner'
import { Loader2, Gift } from 'lucide-react'
import type { CreditAssignment } from '@/lib/types'

interface CompleteSaleFormProps {
  assignment: CreditAssignment
  onComplete: () => void
}

export function CompleteSaleForm({ assignment, onComplete }: CompleteSaleFormProps) {
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentAmountUsd, setPaymentAmountUsd] = useState('')
  const [paymentReference, setPaymentReference] = useState('')
  const [paymentAmountBss, setPaymentAmountBss] = useState('')
  const [exchangeRate, setExchangeRate] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = useMemo(() => createClient(), [])

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

  useEffect(() => {
    if (paymentMethod === 'banesco_bss' && paymentAmountBss && exchangeRate) {
      setPaymentAmountUsd((Number(paymentAmountBss) / Number(exchangeRate)).toFixed(2))
    }
  }, [paymentAmountBss, exchangeRate, paymentMethod])

  const handleCompleteSale = async () => {
    if (!paymentMethod) {
      toast.error('Selecciona un método de pago')
      return
    }
    setLoading(true)

    const { error } = await supabase
      .from('credit_assignments')
      .update({
        payment_status: 'completed',
        payment_method: paymentMethod,
        payment_amount_usd: paymentAmountUsd ? Number(paymentAmountUsd) : null,
        payment_reference: paymentReference || null,
        payment_amount_bss: (paymentMethod === 'banesco_bss' && paymentAmountBss) ? Number(paymentAmountBss) : null,
        exchange_rate: (paymentMethod === 'banesco_bss' && exchangeRate) ? Number(exchangeRate) : null,
      })
      .eq('id', assignment.id)

    if (error) {
      toast.error('Error al completar venta', { description: error.message })
    } else {
      toast.success('Venta registrada')
      onComplete()
    }
    setLoading(false)
  }

  const handleMarkCourtesy = async () => {
    setLoading(true)
    const reason = prompt('Motivo de la cortesía:')
    if (!reason) {
      setLoading(false)
      return
    }

    const { error } = await supabase
      .from('credit_assignments')
      .update({
        payment_status: 'completed',
        is_courtesy: true,
        courtesy_reason: reason,
        payment_amount_usd: 0,
      })
      .eq('id', assignment.id)

    if (error) {
      toast.error('Error', { description: error.message })
    } else {
      toast.success('Marcado como cortesía')
      onComplete()
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      {/* Assignment info */}
      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-blue-900">{assignment.clients?.name}</p>
            <p className="text-xs text-blue-700">{assignment.notes}</p>
          </div>
          <Badge className="bg-blue-100 text-blue-800 text-lg px-3">
            +{assignment.quantity} mes{assignment.quantity > 1 ? 'es' : ''}
          </Badge>
        </div>
      </div>

      {/* Payment method */}
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

      {/* Banesco BSS fields */}
      {paymentMethod === 'banesco_bss' && (
        <div className="space-y-2 p-3 rounded-lg border border-yellow-200 bg-yellow-50">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Monto Bs</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={paymentAmountBss} onChange={(e) => setPaymentAmountBss(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tasa</Label>
              <Input type="number" step="0.01" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} />
            </div>
          </div>
          {paymentAmountBss && exchangeRate && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              = {formatUSD(Number(paymentAmountBss) / Number(exchangeRate))}
            </Badge>
          )}
        </div>
      )}

      {/* USD amount for Zelle/PayPal */}
      {(paymentMethod === 'zelle' || paymentMethod === 'paypal') && (
        <div className="space-y-1">
          <Label className="text-xs">Monto USD</Label>
          <Input type="number" step="0.01" placeholder="0.00" value={paymentAmountUsd} onChange={(e) => setPaymentAmountUsd(e.target.value)} />
        </div>
      )}

      {/* Reference */}
      {paymentMethod && (
        <div className="space-y-1">
          <Label className="text-xs">Referencia</Label>
          <Input placeholder="Nro. transacción" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={handleCompleteSale}
          disabled={loading || !paymentMethod}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Registrar Pago
        </Button>
        <Button
          variant="outline"
          onClick={handleMarkCourtesy}
          disabled={loading}
          className="text-purple-600 border-purple-200 hover:bg-purple-50"
        >
          <Gift className="mr-1 h-4 w-4" />
          Cortesía
        </Button>
      </div>
    </div>
  )
}
