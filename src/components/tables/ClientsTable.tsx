'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { formatDate, getStatusColor, getStatusLabel } from '@/lib/utils'
import { toast } from 'sonner'
import type { Client } from '@/lib/types'
import { Pencil } from 'lucide-react'

interface ClientsTableProps {
  clients: (Client & { total_credits?: number; last_assignment?: string })[]
  onClientUpdated?: () => void
}

function getPassword(deviceInfo: string | null): string {
  if (!deviceInfo) return '-'
  const parts = deviceInfo.split(' / ')
  return parts.length > 1 ? parts[1] : '-'
}

function EditableCell({
  value,
  clientId,
  field,
  placeholder,
  type = 'text',
  onSaved,
}: {
  value: string | null
  clientId: string
  field: 'phone' | 'email'
  placeholder: string
  type?: string
  onSaved?: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [inputValue, setInputValue] = useState(value || '')
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const save = async () => {
    const trimmed = inputValue.trim()
    if (trimmed === (value || '')) {
      setEditing(false)
      return
    }

    const { error } = await supabase
      .from('clients')
      .update({ [field]: trimmed || null })
      .eq('id', clientId)

    if (error) {
      toast.error('Error al guardar')
      setInputValue(value || '')
    } else {
      toast.success(`${field === 'email' ? 'Correo' : 'Teléfono'} actualizado`)
      onSaved?.()
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <Input
        ref={inputRef}
        type={type}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save()
          if (e.key === 'Escape') { setInputValue(value || ''); setEditing(false) }
        }}
        className="h-7 text-xs w-full min-w-[140px]"
        placeholder={placeholder}
      />
    )
  }

  return (
    <div
      className="flex items-center gap-1 group cursor-text min-w-[100px]"
      onClick={(e) => { e.stopPropagation(); setEditing(true) }}
    >
      <span className={`text-sm ${value ? '' : 'text-muted-foreground'}`}>
        {value || '-'}
      </span>
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </div>
  )
}

export function ClientsTable({ clients, onClientUpdated }: ClientsTableProps) {
  const router = useRouter()

  if (clients.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">No hay clientes registrados</p>
        <p className="text-sm mt-1">Sincroniza desde Flujo TV o agrega manualmente</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">Nombre de Usuario</TableHead>
            <TableHead className="whitespace-nowrap">Contraseña</TableHead>
            <TableHead className="whitespace-nowrap">Revendedor</TableHead>
            <TableHead className="whitespace-nowrap">Fecha de Inicio</TableHead>
            <TableHead className="whitespace-nowrap">Fecha de Finalización</TableHead>
            <TableHead className="whitespace-nowrap">Total Créditos Contratados</TableHead>
            <TableHead className="whitespace-nowrap">País</TableHead>
            <TableHead className="whitespace-nowrap">Notas</TableHead>
            <TableHead className="whitespace-nowrap">Correo Electrónico</TableHead>
            <TableHead className="whitespace-nowrap">Teléfono</TableHead>
            <TableHead className="whitespace-nowrap">Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow
              key={client.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => router.push(`/dashboard/clients/${client.id}`)}
            >
              <TableCell className="font-mono text-sm font-medium whitespace-nowrap">
                {client.flujo_login || '-'}
              </TableCell>
              <TableCell className="font-mono text-sm whitespace-nowrap">
                {getPassword(client.device_info)}
              </TableCell>
              <TableCell className="text-sm whitespace-nowrap">Wonderclass</TableCell>
              <TableCell className="text-sm whitespace-nowrap">
                {formatDate(client.flujo_start_date)}
              </TableCell>
              <TableCell className="text-sm whitespace-nowrap">
                {formatDate(client.flujo_end_date)}
              </TableCell>
              <TableCell className="text-sm text-center font-medium whitespace-nowrap">
                {client.flujo_credits ?? 0}
              </TableCell>
              <TableCell className="text-sm whitespace-nowrap">
                {client.country || '-'}
              </TableCell>
              <TableCell className="text-sm max-w-[250px] truncate" title={client.notes || ''}>
                {client.notes || '-'}
              </TableCell>
              <TableCell className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                <EditableCell
                  value={client.email}
                  clientId={client.id}
                  field="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  onSaved={onClientUpdated}
                />
              </TableCell>
              <TableCell className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                <EditableCell
                  value={client.phone}
                  clientId={client.id}
                  field="phone"
                  type="tel"
                  placeholder="+58 412 1234567"
                  onSaved={onClientUpdated}
                />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <Badge className={getStatusColor(client.status)} variant="secondary">
                  {getStatusLabel(client.status)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
