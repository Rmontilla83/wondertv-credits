'use client'

import { useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { RefreshCw, CheckCircle, AlertTriangle, Upload, Loader2, Zap, Key, Save } from 'lucide-react'

interface SyncResult {
  created: number
  updated: number
  errors: number
  total: number
  totalInFlujo?: number
  pages?: number
}

export default function SyncPage() {
  const { profile } = useAuth()

  // Auto sync state
  const [autoSyncing, setAutoSyncing] = useState(false)
  const [autoResult, setAutoResult] = useState<SyncResult | null>(null)
  const [showCredentials, setShowCredentials] = useState(false)
  const [flujoToken, setFlujoToken] = useState('')
  const [credentialsSaved, setCredentialsSaved] = useState(false)

  // Manual sync state
  const [jsonData, setJsonData] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<SyncResult | null>(null)

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
        `Sync completo: ${data.total} clientes (${data.created} nuevos, ${data.updated} actualizados)`
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
    toast.success('Token guardado para esta sesión. Ahora haz clic en "Sync Automático".')
  }

  const handleManualSync = async () => {
    if (!jsonData.trim()) {
      toast.error('Pega el JSON de Flujo TV')
      return
    }

    setSyncing(true)
    setResult(null)

    try {
      let accounts = []
      const parsed = JSON.parse(jsonData)

      if (parsed.code === 200 && parsed.data?.data) {
        accounts = parsed.data.data
      } else if (Array.isArray(parsed)) {
        accounts = parsed
      } else if (parsed.data && Array.isArray(parsed.data)) {
        accounts = parsed.data
      } else {
        toast.error('Formato JSON no reconocido')
        setSyncing(false)
        return
      }

      if (accounts.length === 0) {
        toast.error('No se encontraron cuentas en el JSON')
        setSyncing(false)
        return
      }

      toast.info(`Importando ${accounts.length} clientes...`)

      const resp = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts }),
      })

      const data = await resp.json()

      if (!resp.ok) {
        toast.error('Error: ' + (data.error || resp.status))
        setSyncing(false)
        return
      }

      setResult(data)
      toast.success(`Sincronización completada: ${data.created} nuevos, ${data.updated} actualizados`)
      setJsonData('')
    } catch (e) {
      toast.error('Error al procesar JSON: ' + String(e))
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Sincronización Flujo TV</h1>

      {/* AUTO SYNC */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            Sync Automático
            <span className="ml-2 text-xs font-normal bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              Recomendado
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Descarga automáticamente todas las páginas de clientes desde Flujo TV y sincroniza con la base de datos.
          </p>

          {/* Credentials section */}
          {showCredentials && (
            <div className="space-y-3 p-4 rounded-lg bg-white border border-blue-200">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-800">
                <Key className="h-4 w-4" />
                Credenciales de Flujo TV
              </div>
              <p className="text-xs text-muted-foreground">
                Obtén el token de DevTools → Application → Cookies → <code>msgistv-token</code>, o de cualquier header <code>x-token</code> en Network.
              </p>
              <div>
                <label className="text-xs font-medium text-gray-600">Token de sesión (msgistv-token)</label>
                <Input
                  placeholder="6cc1979a686b49868fdb7b1468840f0a"
                  value={flujoToken}
                  onChange={(e) => setFlujoToken(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
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
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sincronizando todas las páginas...</>
              ) : (
                <><Zap className="mr-2 h-4 w-4" />Sync Automático</>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCredentials(!showCredentials)}
            >
              <Key className="mr-2 h-3 w-3" />
              {showCredentials ? 'Ocultar' : 'Actualizar'} Credenciales
            </Button>
          </div>

          {credentialsSaved && !showCredentials && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Token guardado para esta sesión
            </p>
          )}

          {/* Auto sync result */}
          {autoResult && (
            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="font-medium text-green-800">
                  Sync completado — {autoResult.pages} páginas, {autoResult.totalInFlujo} clientes en Flujo TV
                </p>
              </div>
              <div className="grid grid-cols-4 gap-4 text-center">
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
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MANUAL SYNC */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Importación Manual
            <span className="ml-2 text-xs font-normal text-muted-foreground">(alternativa)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 space-y-3">
            <h3 className="font-medium text-blue-800">Instrucciones</h3>
            <ol className="text-sm text-blue-700 space-y-2 list-decimal pl-5">
              <li>Abre <a href="https://vip.flujotv.net/jeesite/a/home" target="_blank" rel="noopener noreferrer" className="underline font-medium">vip.flujotv.net</a> y loguéate</li>
              <li>Ve a la sección de <strong>lista de cuentas/clientes</strong></li>
              <li>Presiona <strong>F12</strong> → pestaña <strong>Network</strong></li>
              <li>En Network, busca la petición que contiene <strong>&quot;cust/list&quot;</strong></li>
              <li>Haz clic en ella → pestaña <strong>Response</strong></li>
              <li><strong>Copia todo el JSON</strong> de la respuesta</li>
              <li>Pégalo aquí abajo y haz clic en <strong>&quot;Importar&quot;</strong></li>
              <li>Repite para cada página</li>
            </ol>
          </div>

          <div className="space-y-2">
            <Textarea
              placeholder='Pega aquí el JSON de Flujo TV...'
              value={jsonData}
              onChange={(e) => setJsonData(e.target.value)}
              className="font-mono text-xs h-48"
              disabled={syncing}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {jsonData ? `${jsonData.length.toLocaleString()} caracteres` : 'Esperando JSON...'}
              </p>
              <Button
                onClick={handleManualSync}
                disabled={syncing || !jsonData.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {syncing ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importando...</>
                ) : (
                  <><Upload className="mr-2 h-4 w-4" />Importar Clientes</>
                )}
              </Button>
            </div>
          </div>

          {result && (
            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="font-medium text-green-800">Importación completada</p>
              </div>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-800">{result.total}</p>
                  <p className="text-xs text-green-600">Total</p>
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
              </div>
            </div>
          )}

          <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-700 space-y-1">
                <p><strong>Tips:</strong></p>
                <p>Puedes pegar una página a la vez (30 clientes) o todas juntas.</p>
                <p>Si importas un cliente que ya existe, se actualiza automáticamente.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
