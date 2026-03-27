'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { RefreshCw, CheckCircle, AlertTriangle, Upload, Loader2 } from 'lucide-react'

export default function SyncPage() {
  const { profile } = useAuth()
  const [jsonData, setJsonData] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<{
    created: number; updated: number; errors: number; total: number
  } | null>(null)

  if (profile?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">Solo administradores pueden sincronizar</p>
      </div>
    )
  }

  const handleSync = async () => {
    if (!jsonData.trim()) {
      toast.error('Pega el JSON de Flujo TV')
      return
    }

    setSyncing(true)
    setResult(null)

    try {
      // Parse - support both single page response and array of accounts
      let accounts = []
      const parsed = JSON.parse(jsonData)

      if (parsed.code === 200 && parsed.data?.data) {
        // Single page response from /api/v1/magis/codigo
        accounts = parsed.data.data
      } else if (Array.isArray(parsed)) {
        // Direct array of accounts
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Importar Clientes desde Flujo TV
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Instructions */}
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 space-y-3">
            <h3 className="font-medium text-blue-800">Instrucciones</h3>
            <ol className="text-sm text-blue-700 space-y-2 list-decimal pl-5">
              <li>Abre <a href="https://vip.flujotv.net/jeesite/a/home" target="_blank" rel="noopener noreferrer" className="underline font-medium">vip.flujotv.net</a> y loguéate</li>
              <li>Ve a la sección de <strong>lista de cuentas/clientes</strong></li>
              <li>Presiona <strong>F12</strong> → pestaña <strong>Network</strong></li>
              <li>En Network, busca la petición que contiene <strong>&quot;codigo&quot;</strong></li>
              <li>Haz clic en ella → pestaña <strong>Response</strong></li>
              <li><strong>Copia todo el JSON</strong> de la respuesta</li>
              <li>Pégalo aquí abajo y haz clic en <strong>&quot;Importar&quot;</strong></li>
              <li>Repite para cada página (hay 13 páginas)</li>
            </ol>
          </div>

          {/* JSON paste area */}
          <div className="space-y-2">
            <Textarea
              placeholder='Pega aquí el JSON de Flujo TV (la respuesta de /api/v1/magis/codigo)...'
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
                onClick={handleSync}
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

          {/* Result */}
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

          {/* Tips */}
          <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-700 space-y-1">
                <p><strong>Tips:</strong></p>
                <p>Puedes pegar una página a la vez (30 clientes) o todas juntas.</p>
                <p>Si importas un cliente que ya existe, se actualiza automáticamente.</p>
                <p>Navega por las páginas en Flujo TV para importar todos los clientes.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
