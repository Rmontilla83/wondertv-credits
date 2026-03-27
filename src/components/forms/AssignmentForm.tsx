'use client'

import { useEffect, useState } from 'react'
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
import { ASSIGNMENT_PAYMENT_METHODS } from '@/lib/constants'
import { formatUSD, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { Loader2, AlertTriangle } from 'lucide-react'
import type { Client, CreditBalance } from '@/lib/types'
import { addMonths, format } from 'date-fns'

export function AssignmentForm() {
  const searchParams = useSearchParams()
  const preselectedClient = searchParams.get('client')

  const [clientId, setClientId] = useState(preselectedClient ?? '')
  const [clients, setClients] = useState<Client[]>([])
  const [quantity, setQuantity] = useState('1')
  const [periodStart, setPeriodStart] = useState(new Date().toISOString().split('T')[0])
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
  const supabase = createClient()
  const { user, profile } = useAuth()

  useEffect(() => {
    async function fetchData() {
      const [clientsRes, balanceRes, rateRes] = await Promise.all([
        supabase.from('clients').select('*').eq('status', 'active').order('name'),
        supabase.from('credit_balance').select('*').single(),
        supabase.from('exchange_rates').select('*').order('recorded_at', { ascending: false }).limit(1),
      ])

      if (clientsRes.data) setClients(clientsRes.data)
      if (balanceRes.data) setBalance(balanceRes.data)
      if (rateRes.data?.[0]) setExchangeRate(String(rateRes.data[0].rate_bss_usd))
    }

    fetchData()
  }, [supabase])

  const periodEnd = quantity && periodStart
    ? format(addMonths(new Date(periodStart), Number(quantity)), 'yyyy-MM-dd')
    : ''

  const wouldExceed = balance && Number(quantity) > (balance.available_credits ?? 0)
  const selectedClient = clients.find((c) => c.id === clientId)

  // Auto-calculate USD from BSS
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
      payment_amount_usd: paymentAmountUsd ? Number(paymentAmountUsd) : null,
      payment_method: paymentMethod || null,
      payment_reference: paymentReference || null,
      payment_amount_bss: paymentAmountBss ? Number(paymentAmountBss) : null,
      exchange_rate: exchangeRate ? Number(exchangeRate) : null,
      notes: notes || null,
    })

    if (error) {
      toast.error('Error al asignar créditos', { description: error.message })
      setLoading(false)
      return
    }

    toast.success('Créditos asignados exitosamente')
    router.push('/dashboard/assignments')
    router.refresh()
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Asignar Créditos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Cantidad de créditos / meses *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max="12"
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Método de pago</Label>
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
          <div className="space-y-2">
            <Label htmlFor="paymentUsd">Monto USD</Label>
            <Input
              id="paymentUsd"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={paymentAmountUsd}
              onChange={(e) => setPaymentAmountUsd(e.target.value)}
              disabled={paymentMethod === 'banesco_bss'}
            />
          </div>
        </div>

        {paymentMethod === 'banesco_bss' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-yellow-50 border border-yellow-200">
            <div className="space-y-2">
              <Label htmlFor="bss">Monto en Bolívares (BSS)</Label>
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
              <Label htmlFor="rate">Tasa de cambio (BSS/USD)</Label>
              <Input
                id="rate"
                type="number"
                step="0.0001"
                placeholder="Ej: 36.50"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
              />
            </div>
            {paymentAmountBss && exchangeRate && (
              <div className="sm:col-span-2">
                <Badge variant="secondary">
                  Equivale a: {formatUSD(Number(paymentAmountBss) / Number(exchangeRate))}
                </Badge>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="reference">Referencia de pago</Label>
          <Input
            id="reference"
            placeholder="Nro. de transacción"
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notas (opcional)</Label>
          <Textarea
            id="notes"
            placeholder="Notas adicionales..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <AlertDialog>
          <AlertDialogTrigger
            render={<Button className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading || !clientId || !quantity || !periodStart} />}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Asignar Créditos
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar asignación</AlertDialogTitle>
              <AlertDialogDescription>
                  ¿Asignar <strong>{quantity}</strong> crédito(s) a{' '}
                  <strong>{selectedClient?.name ?? 'cliente'}</strong> para el período{' '}
                  {formatDate(periodStart)} - {formatDate(periodEnd)}?
                  {wouldExceed && (
                    <span className="block mt-2 text-red-600 font-medium">
                      Advertencia: Esta asignación excede los créditos disponibles.
                    </span>
                  )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
