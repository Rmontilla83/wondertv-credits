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
import { CLIENT_STATUSES } from '@/lib/constants'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { Client } from '@/lib/types'

interface ClientFormProps {
  client?: Client
}

export function ClientForm({ client }: ClientFormProps) {
  const [name, setName] = useState(client?.name ?? '')
  const [phone, setPhone] = useState(client?.phone ?? '')
  const [email, setEmail] = useState(client?.email ?? '')
  const [deviceInfo, setDeviceInfo] = useState(client?.device_info ?? '')
  const [status, setStatus] = useState(client?.status ?? 'active')
  const [notes, setNotes] = useState(client?.notes ?? '')
  const [loading, setLoading] = useState(false)

  const router = useRouter()
  const supabase = createClient()
  const { user } = useAuth()
  const isEdit = !!client

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('El nombre es requerido')
      return
    }

    setLoading(true)

    const data = {
      name: name.trim(),
      phone: phone || null,
      email: email || null,
      device_info: deviceInfo || null,
      status,
      notes: notes || null,
      ...(!isEdit && { created_by: user?.id }),
    }

    const { error } = isEdit
      ? await supabase.from('clients').update(data).eq('id', client.id)
      : await supabase.from('clients').insert(data)

    if (error) {
      toast.error(isEdit ? 'Error al actualizar cliente' : 'Error al crear cliente', {
        description: error.message,
      })
      setLoading(false)
      return
    }

    toast.success(isEdit ? 'Cliente actualizado' : 'Cliente creado exitosamente')
    router.push('/dashboard/clients')
    router.refresh()
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre *</Label>
          <Input
            id="name"
            placeholder="Nombre completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              placeholder="+58 412 1234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="device">Dispositivo / Info</Label>
            <Input
              id="device"
              placeholder="Ej: MAG 322, IPTV Smarters"
              value={deviceInfo}
              onChange={(e) => setDeviceInfo(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={status} onValueChange={(v) => v && setStatus(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLIENT_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
            render={<Button className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading || !name.trim()} />}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isEdit ? 'Guardar Cambios' : 'Crear Cliente'}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar</AlertDialogTitle>
              <AlertDialogDescription>
                {isEdit
                  ? `¿Guardar cambios para "${name}"?`
                  : `¿Crear cliente "${name}"?`}
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
