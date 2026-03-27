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

export default function ClientsPage() {
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<(Client & { total_credits?: number; last_assignment?: string })[]>([])
  const [search, setSearch] = useState('')
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: clientsData } = await supabase
          .from('clients')
          .select('*')
          .order('name')

        if (clientsData) {
          // Fetch credit totals per client
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

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

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
        <h1 className="text-2xl font-bold">Clientes</h1>
        <Link href="/dashboard/clients/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            Agregar Cliente
          </Button>
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, teléfono o correo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <ClientsTable clients={filteredClients} />
    </div>
  )
}
