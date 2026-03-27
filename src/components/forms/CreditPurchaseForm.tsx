'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { PURCHASE_PAYMENT_METHODS } from '@/lib/constants'
import { formatUSD } from '@/lib/utils'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export function CreditPurchaseForm() {
  const [quantity, setQuantity] = useState('')
  const [totalCost, setTotalCost] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentReference, setPaymentReference] = useState('')
  const [purchasedAt, setPurchasedAt] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const router = useRouter()
  const supabase = createClient()
  const { user } = useAuth()

  const costPerCredit = quantity && totalCost
    ? Number(totalCost) / Number(quantity)
    : 0

  const handleSubmit = async () => {
    if (!quantity || !totalCost || !paymentMethod) {
      toast.error('Completa todos los campos requeridos')
      return
    }

    setLoading(true)
    const { error } = await supabase.from('credit_purchases').insert({
      purchased_by: user?.id,
      quantity: Number(quantity),
      total_cost_usd: Number(totalCost),
      payment_method: paymentMethod,
      payment_reference: paymentReference || null,
      notes: notes || null,
      purchased_at: purchasedAt,
    })

    if (error) {
      toast.error('Error al registrar compra', { description: error.message })
      setLoading(false)
      return
    }

    toast.success('Compra registrada exitosamente')
    router.push('/dashboard/credits')
    router.refresh()
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Registrar Compra de Créditos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Cantidad de créditos *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              placeholder="Ej: 100"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="totalCost">Costo total USD *</Label>
            <Input
              id="totalCost"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Ej: 250.00"
              value={totalCost}
              onChange={(e) => setTotalCost(e.target.value)}
            />
          </div>
        </div>

        {costPerCredit > 0 && (
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-800">
              Costo por crédito: <strong>{formatUSD(costPerCredit)}</strong>
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Método de pago *</Label>
            <Select value={paymentMethod} onValueChange={(v) => v && setPaymentMethod(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {PURCHASE_PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reference">Referencia de pago</Label>
            <Input
              id="reference"
              placeholder="Nro. de transacción"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Fecha de compra</Label>
          <Input
            id="date"
            type="date"
            value={purchasedAt}
            onChange={(e) => setPurchasedAt(e.target.value)}
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
            render={<Button className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading || !quantity || !totalCost || !paymentMethod} />}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Registrar Compra
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar compra</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Registrar compra de <strong>{quantity}</strong> créditos por <strong>{formatUSD(Number(totalCost))}</strong>?
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
