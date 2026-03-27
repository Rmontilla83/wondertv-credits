'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AssignmentsTable } from '@/components/tables/AssignmentsTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ASSIGNMENT_PAYMENT_METHODS } from '@/lib/constants'
import type { CreditAssignment } from '@/lib/types'
import { Plus, Download, Search } from 'lucide-react'

export default function AssignmentsPage() {
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<CreditAssignment[]>([])
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase
        .from('credit_assignments')
        .select('*, clients(name), profiles(full_name)')
        .order('created_at', { ascending: false })

      if (data) setAssignments(data)
      setLoading(false)
    }

    fetchData()
  }, [supabase])

  const filtered = assignments.filter((a) => {
    if (search && !a.clients?.name?.toLowerCase().includes(search.toLowerCase())) return false
    if (methodFilter !== 'all' && a.payment_method !== methodFilter) return false
    if (dateFrom && a.created_at < dateFrom) return false
    if (dateTo && a.created_at > dateTo + 'T23:59:59') return false
    return true
  })

  const exportCSV = () => {
    const headers = ['Fecha', 'Cliente', 'Créditos', 'Monto USD', 'Monto BSS', 'Método', 'Referencia', 'Asignado por']
    const rows = filtered.map((a) => [
      a.created_at?.split('T')[0] ?? '',
      a.clients?.name ?? '',
      a.quantity,
      a.payment_amount_usd ?? '',
      a.payment_amount_bss ?? '',
      a.payment_method ?? '',
      a.payment_reference ?? '',
      a.profiles?.full_name ?? '',
    ])

    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `asignaciones_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Asignaciones</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
          <Link href="/dashboard/assignments/new">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Asignar Créditos
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={methodFilter} onValueChange={(v) => setMethodFilter(v ?? 'all')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Método de pago" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los métodos</SelectItem>
            {ASSIGNMENT_PAYMENT_METHODS.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          placeholder="Desde"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-[160px]"
        />
        <Input
          type="date"
          placeholder="Hasta"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-[160px]"
        />
      </div>

      <AssignmentsTable assignments={filtered} />
    </div>
  )
}
