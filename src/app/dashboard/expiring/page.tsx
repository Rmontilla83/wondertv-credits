'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { formatDate, daysUntilExpiration } from '@/lib/utils'
import type { Client } from '@/lib/types'
import { Download, Search, AlertTriangle, Clock, Calendar, Zap } from 'lucide-react'

export default function ExpiringPage() {
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [rangeFilter, setRangeFilter] = useState('30')
  const [countryFilter, setCountryFilter] = useState('all')

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function fetchData() {
      try {
        const { data } = await supabase
          .from('clients')
          .select('*')
          .not('flujo_end_date', 'is', null)
          .order('flujo_end_date', { ascending: true })

        if (data) setClients(data)
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  const withDays = clients.map(c => ({
    ...c,
    daysLeft: daysUntilExpiration(c.flujo_end_date) ?? 0,
  }))

  const maxDays = rangeFilter === 'expired' ? 0 : Number(rangeFilter)
  const filtered = withDays.filter(c => {
    if (rangeFilter === 'expired') {
      if (c.daysLeft > 0) return false
    } else if (rangeFilter !== 'all') {
      if (c.daysLeft > maxDays || c.daysLeft <= 0) return false
    }
    if (countryFilter !== 'all' && c.country !== countryFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!c.name.toLowerCase().includes(q) &&
          !c.flujo_login?.toLowerCase().includes(q) &&
          !c.phone?.toLowerCase().includes(q)) return false
    }
    return true
  })

  // Get unique countries for filter
  const countries = [...new Set(clients.map(c => c.country).filter(Boolean))] as string[]

  const exportCSV = () => {
    const headers = ['Nombre', 'Teléfono', 'Email', 'Usuario IPTV', 'País', 'Vence', 'Días Restantes']
    const rows = filtered.map(c => [
      c.name,
      c.phone ?? '',
      c.email ?? '',
      c.flujo_login ?? '',
      c.country ?? '',
      c.flujo_end_date ? new Date(c.flujo_end_date).toLocaleDateString('es-VE') : '',
      c.daysLeft,
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `vencimientos_${rangeFilter}d_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Stats
  const expired = withDays.filter(c => c.daysLeft <= 0).length
  const in7 = withDays.filter(c => c.daysLeft > 0 && c.daysLeft <= 7).length
  const in14 = withDays.filter(c => c.daysLeft > 7 && c.daysLeft <= 14).length
  const in30 = withDays.filter(c => c.daysLeft > 14 && c.daysLeft <= 30).length

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-orange-500" />
          Vencimientos
        </h1>
        <Button variant="outline" onClick={exportCSV} disabled={filtered.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV ({filtered.length})
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:ring-2 ring-red-300" onClick={() => setRangeFilter('expired')}>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-red-600">{expired}</p>
            <p className="text-xs text-muted-foreground">Expirados</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-2 ring-orange-300" onClick={() => setRangeFilter('7')}>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-orange-600">{in7}</p>
            <p className="text-xs text-muted-foreground">En 7 días</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-2 ring-yellow-300" onClick={() => setRangeFilter('14')}>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-yellow-600">{in14}</p>
            <p className="text-xs text-muted-foreground">En 14 días</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-2 ring-blue-300" onClick={() => setRangeFilter('30')}>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{in30}</p>
            <p className="text-xs text-muted-foreground">En 30 días</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar nombre, usuario, teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={rangeFilter} onValueChange={(v) => v && setRangeFilter(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expired">Expirados</SelectItem>
            <SelectItem value="7">Próximos 7 días</SelectItem>
            <SelectItem value="14">Próximos 14 días</SelectItem>
            <SelectItem value="30">Próximos 30 días</SelectItem>
            <SelectItem value="60">Próximos 60 días</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={countryFilter} onValueChange={(v) => v && setCountryFilter(v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="País" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los países</SelectItem>
            {countries.sort().map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">
          <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No hay clientes en este rango</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Usuario IPTV</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>País</TableHead>
                <TableHead>Vence</TableHead>
                <TableHead className="text-right">Días</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/dashboard/clients/${c.id}`} className="font-medium text-blue-600 hover:underline">
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.flujo_login ?? '-'}</TableCell>
                  <TableCell className="text-sm">{c.phone ?? '-'}</TableCell>
                  <TableCell>
                    {c.country && <Badge variant="secondary">{c.country}</Badge>}
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(c.flujo_end_date!)}</TableCell>
                  <TableCell className="text-right">
                    <span className={`inline-flex items-center gap-1 text-sm font-medium ${
                      c.daysLeft <= 0 ? 'text-red-600' :
                      c.daysLeft <= 7 ? 'text-orange-600' :
                      c.daysLeft <= 14 ? 'text-yellow-600' :
                      'text-blue-600'
                    }`}>
                      <Clock className="h-3 w-3" />
                      {c.daysLeft <= 0 ? `${Math.abs(c.daysLeft)}d exp` : `${c.daysLeft}d`}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Link href={`/dashboard/clients/${c.id}`}>
                      <Button size="sm" variant="ghost" className="h-7 text-xs">
                        <Zap className="h-3 w-3 mr-1" />
                        Recargar
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
