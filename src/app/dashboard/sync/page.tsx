'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { formatDateTime } from '@/lib/utils'
import { CheckCircle, Loader2, Zap, Key, Save, ExternalLink, XCircle, AlertTriangle, History } from 'lucide-react'

interface SyncProgress {
  phase: string
  message: string
  percent: number
  pages?: number
  totalClients?: number
  created?: number
  updated?: number
  errors?: number
  pendingSales?: number
}

interface SyncResult {
  success: boolean
  status: string
  created: number
  updated: number
  errors: number
  pendingSales: number
  total: number
  totalInFlujo: number
  pages: number
  durationMs: number
}

interface SyncLog {
  id: string
  status: string
  total_processed: number
  created: number
  updated: number
  errors: number
  pending_sales: number
  total_in_flujo: number
  pages: number
  duration_ms: number
  error_message: string | null
  created_at: string
}

export default function SyncPage() {
  const { profile } = useAuth()
  const [syncing, setSyncing] = useState(false)
  const [progress, setProgress] = useState<SyncProgress | null>(null)
  const [result, setResult] = useState<SyncResult | null>(null)
  const [showCredentials, setShowCredentials] = useState(false)
  const [flujoToken, setFlujoToken] = useState('')
  const [credentialsSaved, setCredentialsSaved] = useState(false)
  const [logs, setLogs] = useState<SyncLog[]>([])

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    supabase
      .from('sync_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setLogs(data)
      })
  }, [supabase, result])

  if (profile?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">Solo administradores pueden sincronizar</p>
      </div>
    )
  }

  const handleSync = async () => {
    setSyncing(true)
    setProgress({ phase: 'connecting', message: 'Iniciando...', percent: 0 })
    setResult(null)

    try {
      const body: Record<string, string> = {}
      if (flujoToken) body.token = flujoToken

      const resp = await fetch('/api/sync/flujo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (resp.headers.get('content-type')?.includes('text/event-stream')) {
        const reader = resp.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() || ''

          for (const block of lines) {
            const eventMatch = block.match(/^event: (\w+)/)
            const dataMatch = block.match(/^data: (.+)$/m)
            if (!eventMatch || !dataMatch) continue

            const event = eventMatch[1]
            const data = JSON.parse(dataMatch[1])

            if (event === 'progress') {
              setProgress(data)
            } else if (event === 'error') {
              toast.error('Error: ' + data.message)
              if (data.message?.includes('Token') || data.message?.includes('expirado')) {
                setShowCredentials(true)
              }
            } else if (event === 'done') {
              setResult(data)
              setProgress(null)
              if (data.success) {
                toast.success(`Sync completo en ${(data.durationMs / 1000).toFixed(1)}s`)
              }
            }
          }
        }
      } else {
        const data = await resp.json()
        if (!resp.ok) {
          toast.error('Error: ' + (data.error || resp.status))
          if (resp.status === 401) setShowCredentials(true)
        }
      }
    } catch (e) {
      toast.error('Error de conexión: ' + String(e))
    } finally {
      setSyncing(false)
      setProgress(null)
    }
  }

  const handleSaveCredentials = () => {
    if (!flujoToken) { toast.error('Ingresa el token'); return }
    setCredentialsSaved(true)
    setShowCredentials(false)
    toast.success('Token guardado. Ahora haz clic en "Sincronizar".')
  }

  const statusIcon = (s: string) => {
    if (s === 'success') return <CheckCircle className="h-4 w-4 text-green-600" />
    if (s === 'failed') return <XCircle className="h-4 w-4 text-red-600" />
    return <AlertTriangle className="h-4 w-4 text-yellow-600" />
  }

  const statusBadge = (s: string) => {
    if (s === 'success') return <Badge className="bg-green-100 text-green-700">Exitosa</Badge>
    if (s === 'failed') return <Badge className="bg-red-100 text-red-700">Fallida</Badge>
    return <Badge className="bg-yellow-100 text-yellow-700">Parcial</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sincronización Flujo TV</h1>
        <a href="https://vip.flujotv.net/jeesite/a/sys-cust-list" target="_blank" rel="noopener noreferrer">
          <Button className="bg-purple-600 hover:bg-purple-700">
            <ExternalLink className="mr-2 h-4 w-4" />
            IR A PORTAL MASTER
          </Button>
        </a>
      </div>

      {/* Sync card */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            Sincronizar con Flujo TV
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {showCredentials && (
            <div className="space-y-3 p-4 rounded-lg bg-white border border-blue-200">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-800">
                <Key className="h-4 w-4" />
                Token de Flujo TV
              </div>
              <p className="text-xs text-muted-foreground">
                DevTools → Application → Cookies → <code>msgistv-token</code>
              </p>
              <Input
                placeholder="6cc1979a686b49868fdb7b1468840f0a"
                value={flujoToken}
                onChange={(e) => setFlujoToken(e.target.value)}
                className="font-mono text-xs"
              />
              <Button size="sm" onClick={handleSaveCredentials} className="bg-blue-600 hover:bg-blue-700">
                <Save className="mr-2 h-3 w-3" />
                Guardar
              </Button>
            </div>
          )}

          {/* Progress bar */}
          {syncing && progress && (
            <div className="space-y-2 p-4 rounded-lg bg-white border border-blue-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-800 font-medium">{progress.message}</span>
                <span className="text-blue-600 font-bold">{progress.percent}%</span>
              </div>
              <div className="h-3 rounded-full bg-blue-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              {progress.phase === 'syncing' && (
                <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                  {progress.created != null && <span>Nuevos: {progress.created}</span>}
                  {progress.updated != null && <span>Actualizados: {progress.updated}</span>}
                  {progress.errors != null && progress.errors > 0 && <span className="text-red-600">Errores: {progress.errors}</span>}
                  {progress.pendingSales != null && progress.pendingSales > 0 && <span className="text-orange-600">Ventas: {progress.pendingSales}</span>}
                </div>
              )}
            </div>
          )}

          {/* Buttons */}
          {!syncing && (
            <div className="flex items-center gap-3">
              <Button onClick={handleSync} className="bg-blue-600 hover:bg-blue-700" size="lg">
                <Zap className="mr-2 h-4 w-4" />
                Sincronizar
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowCredentials(!showCredentials)}>
                <Key className="mr-2 h-3 w-3" />
                {showCredentials ? 'Ocultar' : 'Actualizar'} Token
              </Button>
            </div>
          )}

          {syncing && !progress && (
            <Button disabled size="lg">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Conectando...
            </Button>
          )}

          {credentialsSaved && !showCredentials && !syncing && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Token guardado para esta sesión
            </p>
          )}

          {/* Result */}
          {result && (
            <div className={`p-4 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                {result.success ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
                <p className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                  {result.success ? 'Sync completado' : 'Sync con errores'} — {(result.durationMs / 1000).toFixed(1)}s
                </p>
              </div>
              <div className={`grid gap-4 text-center ${result.pendingSales > 0 ? 'grid-cols-5' : 'grid-cols-4'}`}>
                <div>
                  <p className="text-2xl font-bold text-green-800">{result.total}</p>
                  <p className="text-xs text-green-600">Procesados</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-800">{result.created}</p>
                  <p className="text-xs text-blue-600">Nuevos</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-800">{result.updated}</p>
                  <p className="text-xs text-yellow-600">Actualizados</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-800">{result.errors}</p>
                  <p className="text-xs text-red-600">Errores</p>
                </div>
                {result.pendingSales > 0 && (
                  <div>
                    <p className="text-2xl font-bold text-orange-800">{result.pendingSales}</p>
                    <p className="text-xs text-orange-600">Ventas Detectadas</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de Sincronizaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No hay sincronizaciones registradas</p>
          ) : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Procesados</TableHead>
                    <TableHead className="text-right">Nuevos</TableHead>
                    <TableHead className="text-right">Actualizados</TableHead>
                    <TableHead className="text-right">Errores</TableHead>
                    <TableHead className="text-right">Ventas</TableHead>
                    <TableHead className="text-right">Duración</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{statusBadge(log.status)}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{formatDateTime(log.created_at)}</TableCell>
                      <TableCell className="text-right text-sm">{log.total_processed}</TableCell>
                      <TableCell className="text-right text-sm">{log.created}</TableCell>
                      <TableCell className="text-right text-sm">{log.updated}</TableCell>
                      <TableCell className="text-right text-sm">
                        {log.errors > 0 ? <span className="text-red-600 font-medium">{log.errors}</span> : '0'}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {log.pending_sales > 0 ? <span className="text-orange-600 font-medium">{log.pending_sales}</span> : '0'}
                      </TableCell>
                      <TableCell className="text-right text-sm whitespace-nowrap">{(log.duration_ms / 1000).toFixed(1)}s</TableCell>
                      <TableCell className="text-xs text-red-600 max-w-[200px] truncate" title={log.error_message || ''}>
                        {log.error_message || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
