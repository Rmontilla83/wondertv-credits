'use client'

import { useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { CheckCircle, Loader2, Zap, Key, Save, ExternalLink } from 'lucide-react'

interface SyncResult {
  created: number
  updated: number
  errors: number
  total: number
  totalInFlujo?: number
  pages?: number
  pendingSales?: number
}

export default function SyncPage() {
  const { profile } = useAuth()
  const [autoSyncing, setAutoSyncing] = useState(false)
  const [autoResult, setAutoResult] = useState<SyncResult | null>(null)
  const [showCredentials, setShowCredentials] = useState(false)
  const [flujoToken, setFlujoToken] = useState('')
  const [credentialsSaved, setCredentialsSaved] = useState(false)

  if (profile?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">Solo administradores pueden sincronizar</p>
      </div>
    )
  }

  const handleAutoSync = async () => {
    setAutoSyncing(true)
    setAutoResult(null)

    try {
      const body: Record<string, string> = {}
      if (flujoToken) body.token = flujoToken

      toast.info('Conectando con Flujo TV y descargando todas las páginas...')

      const resp = await fetch('/api/sync/flujo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await resp.json()

      if (!resp.ok) {
        if (resp.status === 401) {
          toast.error('Token expirado. Actualiza las credenciales de Flujo TV.')
          setShowCredentials(true)
        } else {
          toast.error('Error: ' + (data.error || resp.status))
        }
        setAutoSyncing(false)
        return
      }

      setAutoResult(data)
      toast.success(
        `Sync completo: ${data.total} clientes (${data.created} nuevos, ${data.updated} actualizados)` +
        (data.pendingSales ? ` — ${data.pendingSales} ventas pendientes detectadas` : '')
      )
    } catch (e) {
      toast.error('Error de conexión: ' + String(e))
    } finally {
      setAutoSyncing(false)
    }
  }

  const handleSaveCredentials = () => {
    if (!flujoToken) {
      toast.error('Ingresa el token')
      return
    }
    setCredentialsSaved(true)
    setShowCredentials(false)
    toast.success('Token guardado para esta sesión. Ahora haz clic en "Sincronizar".')
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

      <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            Sincronizar con Flujo TV
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Descarga todos los clientes desde Flujo TV, actualiza datos y detecta ventas nuevas automáticamente.
          </p>

          {showCredentials && (
            <div className="space-y-3 p-4 rounded-lg bg-white border border-blue-200">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-800">
                <Key className="h-4 w-4" />
                Token de Flujo TV
              </div>
              <p className="text-xs text-muted-foreground">
                Obtén el token de DevTools → Application → Cookies → <code>msgistv-token</code>
              </p>
              <Input
                placeholder="6cc1979a686b49868fdb7b1468840f0a"
                value={flujoToken}
                onChange={(e) => setFlujoToken(e.target.value)}
                className="font-mono text-xs"
              />
              <Button size="sm" onClick={handleSaveCredentials} className="bg-blue-600 hover:bg-blue-700">
                <Save className="mr-2 h-3 w-3" />
                Guardar para esta sesión
              </Button>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button
              onClick={handleAutoSync}
              disabled={autoSyncing}
              className="bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {autoSyncing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sincronizando...</>
              ) : (
                <><Zap className="mr-2 h-4 w-4" />Sincronizar</>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCredentials(!showCredentials)}
            >
              <Key className="mr-2 h-3 w-3" />
              {showCredentials ? 'Ocultar' : 'Actualizar'} Token
            </Button>
          </div>

          {credentialsSaved && !showCredentials && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Token guardado para esta sesión
            </p>
          )}

          {autoResult && (
            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="font-medium text-green-800">
                  Sync completado — {autoResult.pages} páginas, {autoResult.totalInFlujo} clientes en Flujo TV
                </p>
              </div>
              <div className={`grid gap-4 text-center ${autoResult.pendingSales ? 'grid-cols-5' : 'grid-cols-4'}`}>
                <div>
                  <p className="text-2xl font-bold text-green-800">{autoResult.total}</p>
                  <p className="text-xs text-green-600">Procesados</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-800">{autoResult.created}</p>
                  <p className="text-xs text-blue-600">Nuevos</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-800">{autoResult.updated}</p>
                  <p className="text-xs text-yellow-600">Actualizados</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-800">{autoResult.errors}</p>
                  <p className="text-xs text-red-600">Errores</p>
                </div>
                {(autoResult.pendingSales ?? 0) > 0 && (
                  <div>
                    <p className="text-2xl font-bold text-orange-800">{autoResult.pendingSales}</p>
                    <p className="text-xs text-orange-600">Ventas Detectadas</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
