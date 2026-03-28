'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ClientsTable } from '@/components/tables/ClientsTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { Client } from '@/lib/types'
import { Plus, Search } from 'lucide-react'
import { daysUntilExpiration } from '@/lib/utils'

type ClientRow = Client & { total_credits?: number; last_assignment?: string }

export default function ClientsPage() {
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<ClientRow[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: clientsData } = await supabase
          .from('clients')
          .select('*')
          .order('flujo_start_date', { ascending: false, nullsFirst: false })

        if (clientsData) {
          const { data: creditData } = await supabase
            .from('credit_assignments')
            .select('client_id, quantity, created_at')

          const creditMap: Record<string, { total: number; last: string }> = {}
          creditData?.forEach((a) => {
            if (!creditMap[a.client_id]) {
              creditMap[a.client_id] = { total: 0, last: '' }
            }
            creditMap[a.client_id].total += a.quantity
            if (a.created_at > (creditMap[a.client_id].last || '')) {
              creditMap[a.client_id].last = a.created_at
            }
          })

          setClients(clientsData.map((c) => ({
            ...c,
            total_credits: creditMap[c.id]?.total ?? 0,
            last_assignment: creditMap[c.id]?.last ?? '',
          })))
        }
      } catch (error) {
        console.error('Error fetching clients data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  const filteredClients = clients.filter((c) => {
    const q = search.toLowerCase()
    const matchesSearch = !search ||
      c.name.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.flujo_login?.toLowerCase().includes(q) ||
      c.notes?.toLowerCase().includes(q) ||
      c.country?.toLowerCase().includes(q)

    if (statusFilter === 'expiring') {
      const days = daysUntilExpiration(c.flujo_end_date)
      return matchesSearch && days !== null && days >= 0 && days <= 7
    }

    if (statusFilter === 'expired') {
      const days = daysUntilExpiration(c.flujo_end_date)
      return matchesSearch && (c.status === 'inactive' || (days !== null && days <= 0))
    }

    const matchesStatus = statusFilter === 'all' || c.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const activeCount = clients.filter(c => c.status === 'active').length
  const inactiveCount = clients.filter(c => c.status === 'inactive').length
  const expiringCount = clients.filter(c => {
    const days = daysUntilExpiration(c.flujo_end_date)
    return days !== null && days >= 0 && days <= 7
  }).length
  const expiredCount = clients.filter(c => {
    const days = daysUntilExpiration(c.flujo_end_date)
    return c.status === 'inactive' || (days !== null && days <= 0)
  }).length

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeCount} activos, {inactiveCount} inactivos, {expiredCount} expirados
            {expiringCount > 0 && <span className="text-orange-600 font-medium"> — {expiringCount} por vencer</span>}
          </p>
        </div>
        <Link href="/dashboard/clients/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            Agregar Cliente
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar nombre, teléfono, usuario IPTV..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {[
            { value: 'all', label: 'Todos', color: 'bg-blue-600' },
            { value: 'active', label: 'Activos', color: 'bg-green-600' },
            { value: 'inactive', label: 'Inactivos', color: 'bg-gray-600' },
            { value: 'expiring', label: `Por vencer (${expiringCount})`, color: 'bg-orange-600' },
            { value: 'expired', label: `Expirados (${expiredCount})`, color: 'bg-red-600' },
          ].map(opt => (
            <Button
              key={opt.value}
              variant={statusFilter === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(opt.value)}
              className={statusFilter === opt.value ? opt.color : ''}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{filteredClients.length} clientes</p>

      <ClientsTable clients={filteredClients} />
    </div>
  )
}
