'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { RefreshCw, CheckCircle, AlertTriangle, Copy } from 'lucide-react'

function getBookmarkletCode(host: string, syncKey: string) {
  return `javascript:void((async function(){var API='${host}/api/sync';var KEY='${syncKey}';var d=document;var s=d.createElement('div');s.id='wt-sync';s.style.cssText='position:fixed;top:20px;right:20px;z-index:99999;background:%231e293b;color:white;padding:16px 20px;border-radius:12px;font-family:system-ui;font-size:14px;min-width:280px;box-shadow:0 20px 60px rgba(0,0,0,0.3)';s.innerHTML='<div style=\"font-weight:bold;margin-bottom:8px\">Wonder TV Sync</div><div id=\"wt-status\">Leyendo clientes...</div>';d.body.appendChild(s);var st=d.getElementById('wt-status');try{var all=[];var page=1;var total=0;do{var r=await fetch('/api/v1/magis/codigo?page='+page);var j=await r.json();if(j.code!==200)throw new Error('Error Flujo: '+j.msg);all=all.concat(j.data.data);total=j.data.count;st.textContent='Pagina '+page+'/'+j.data.total_pages+' ('+all.length+'/'+total+')';page++}while(all.length<total);st.textContent='Enviando '+all.length+' clientes...';var dr=await fetch('/api/v1/magis/dashboard');var dd=await dr.json();var resp=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','X-Sync-Key':KEY},body:JSON.stringify({accounts:all,dashboard:dd.code===200?dd.data:null})});if(!resp.ok){var err=await resp.json();throw new Error(err.error||resp.status)}var result=await resp.json();st.innerHTML='<div style=\"color:%2322c55e;font-weight:bold\">Completado!</div><div style=\"margin-top:6px;font-size:12px\">Nuevos: '+result.created+'<br>Actualizados: '+result.updated+'<br>Errores: '+result.errors+'<br>Total: '+result.total+'</div>'}catch(e){st.innerHTML='<div style=\"color:%23ef4444\">Error: '+e.message+'</div>'}setTimeout(function(){s.remove()},15000)})())`
}

function getConsoleCode(host: string, syncKey: string) {
  return `(async function(){
  var API='${host}/api/sync';
  var KEY='${syncKey}';
  console.log('[Sync] Leyendo clientes de Flujo TV...');
  var all=[], page=1, total=0;
  do {
    var r = await fetch('/api/v1/magis/codigo?page='+page);
    var j = await r.json();
    if(j.code!==200) throw new Error('Error Flujo: '+j.msg);
    all = all.concat(j.data.data);
    total = j.data.count;
    console.log('[Sync] Página '+page+'/'+j.data.total_pages+' ('+all.length+'/'+total+')');
    page++;
  } while(all.length < total);

  console.log('[Sync] Enviando '+all.length+' clientes a Wonder TV...');
  var dr = await fetch('/api/v1/magis/dashboard');
  var dd = await dr.json();

  var resp = await fetch(API, {
    method: 'POST',
    headers: {'Content-Type':'application/json', 'X-Sync-Key': KEY},
    body: JSON.stringify({accounts: all, dashboard: dd.code===200 ? dd.data : null})
  });

  var result = await resp.json();
  if(!resp.ok) throw new Error(result.error || resp.status);
  console.log('[Sync] COMPLETADO:', result);
  alert('Sync completado! Nuevos: '+result.created+', Actualizados: '+result.updated+', Errores: '+result.errors);
})()`
}

export default function SyncPage() {
  const { profile } = useAuth()
  const [host, setHost] = useState('')
  const [syncKey, setSyncKey] = useState('')
  const [copied, setCopied] = useState(false)
  const [loadingKey, setLoadingKey] = useState(true)

  useEffect(() => {
    setHost(window.location.origin)
    fetch('/api/sync/key')
      .then(r => r.json())
      .then(d => { if (d.key) setSyncKey(d.key) })
      .finally(() => setLoadingKey(false))
  }, [])

  if (profile?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">Solo administradores pueden sincronizar</p>
      </div>
    )
  }

  const consoleCode = getConsoleCode(host, syncKey)

  const handleCopyBookmarklet = async () => {
    try {
      await navigator.clipboard.writeText(getBookmarkletCode(host, syncKey))
      setCopied(true)
      toast.success('Código del bookmarklet copiado')
      setTimeout(() => setCopied(false), 3000)
    } catch {
      toast.error('Error al copiar')
    }
  }

  const handleCopyConsole = async () => {
    try {
      await navigator.clipboard.writeText(consoleCode)
      toast.success('Código para consola copiado')
    } catch {
      toast.error('Error al copiar')
    }
  }

  if (loadingKey) {
    return <div className="text-center py-12 text-muted-foreground">Cargando...</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Sincronización Flujo TV</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Sincronizar Clientes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Method 1: Bookmarklet */}
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 space-y-3">
            <h3 className="font-medium text-blue-800">Opción 1: Bookmark (permanente)</h3>
            <ol className="text-sm text-blue-700 space-y-1.5 list-decimal pl-5">
              <li>Clic en <strong>&quot;Copiar bookmarklet&quot;</strong></li>
              <li>Crea un nuevo favorito en el navegador</li>
              <li>Nombre: <strong>Sync Wonder TV</strong></li>
              <li>En URL: <strong>pega</strong> el código copiado</li>
              <li>Abre <strong>vip.flujotv.net</strong>, loguéate, y haz clic en el bookmark</li>
            </ol>
            <Button onClick={handleCopyBookmarklet} className={copied ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}>
              {copied ? <CheckCircle className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? 'Copiado!' : 'Copiar bookmarklet'}
            </Button>
          </div>

          {/* Method 2: Console */}
          <div className="p-4 rounded-lg bg-green-50 border border-green-200 space-y-3">
            <h3 className="font-medium text-green-800">Opción 2: Consola (rápido, una vez)</h3>
            <ol className="text-sm text-green-700 space-y-1.5 list-decimal pl-5">
              <li>Abre <a href="https://vip.flujotv.net/jeesite/a/home" target="_blank" rel="noopener noreferrer" className="underline font-medium">vip.flujotv.net</a> y loguéate</li>
              <li>Presiona <strong>F12</strong> → pestaña <strong>Console</strong></li>
              <li>Pega el código y presiona <strong>Enter</strong></li>
              <li>Espera el mensaje de completado</li>
            </ol>

            <Textarea
              readOnly
              value={consoleCode}
              className="font-mono text-xs h-32 bg-white"
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            />

            <Button onClick={handleCopyConsole} className="bg-green-600 hover:bg-green-700">
              <Copy className="mr-2 h-4 w-4" />
              Copiar para consola
            </Button>
          </div>

          {/* Warning */}
          <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-700">
                Ejecutar desde <strong>vip.flujotv.net</strong> estando logueado.
                Lee todas las páginas de clientes y sincroniza con Wonder TV.
                Clientes nuevos se crean, existentes se actualizan.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
