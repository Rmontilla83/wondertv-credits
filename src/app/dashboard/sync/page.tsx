'use client'

import { useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { RefreshCw, BookOpen, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'

const BOOKMARKLET_CODE = `javascript:void(async function(){
  const API='%HOST%/api/sync';
  const d=document;
  const s=d.createElement('div');
  s.id='wt-sync';
  s.style.cssText='position:fixed;top:20px;right:20px;z-index:99999;background:#1e293b;color:white;padding:16px 20px;border-radius:12px;font-family:system-ui;font-size:14px;min-width:280px;box-shadow:0 20px 60px rgba(0,0,0,0.3)';
  s.innerHTML='<div style="font-weight:bold;margin-bottom:8px">Wonder TV Sync</div><div id="wt-status">Leyendo clientes de Flujo TV...</div>';
  d.body.appendChild(s);
  const st=d.getElementById('wt-status');
  try{
    let all=[];
    let page=1;
    let total=0;
    do{
      const r=await fetch('/api/v1/magis/codigo?page='+page);
      const j=await r.json();
      if(j.code!==200)throw new Error('Error API Flujo: '+j.msg);
      all=all.concat(j.data.data);
      total=j.data.count;
      st.textContent='Leyendo página '+page+'/'+j.data.total_pages+' ('+all.length+'/'+total+')';
      page++;
    }while(all.length<total);
    st.textContent='Enviando '+all.length+' clientes a Wonder TV...';
    const dr=await fetch('/api/v1/magis/dashboard');
    const dd=await dr.json();
    const token=document.cookie.split(';').map(c=>c.trim()).find(c=>c.startsWith('sb-'))?.split('=')[1]||'';
    const resp=await fetch(API,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({accounts:all,dashboard:dd.code===200?dd.data:null})
    });
    if(!resp.ok)throw new Error('Error Wonder TV: '+resp.status);
    const result=await resp.json();
    st.innerHTML='<div style="color:#22c55e;font-weight:bold">Sincronización completada</div>'
      +'<div style="margin-top:6px;font-size:12px">'
      +'Nuevos: '+result.created+'<br>'
      +'Actualizados: '+result.updated+'<br>'
      +'Errores: '+result.errors+'<br>'
      +'Total: '+result.total+'</div>';
  }catch(e){
    st.innerHTML='<div style="color:#ef4444">Error: '+e.message+'</div>';
  }
  setTimeout(()=>s.remove(),10000);
})();`

export default function SyncPage() {
  const { profile } = useAuth()
  const [lastResult, setLastResult] = useState<{
    created: number
    updated: number
    errors: number
    total: number
  } | null>(null)
  const [syncing, setSyncing] = useState(false)

  if (profile?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">Solo administradores pueden sincronizar</p>
      </div>
    )
  }

  const host = typeof window !== 'undefined' ? window.location.origin : ''
  const bookmarkletUrl = BOOKMARKLET_CODE.replace('%HOST%', host)

  const handleManualSync = async () => {
    toast.info('Para sincronizar, usa el bookmarklet desde el panel de Flujo TV', {
      description: 'Arrastra el botón "Sync Flujo TV" a tu barra de favoritos, luego haz clic en él mientras estás logueado en vip.flujotv.net',
      duration: 8000,
    })
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
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 space-y-3">
            <h3 className="font-medium text-blue-800">Instrucciones</h3>
            <ol className="text-sm text-blue-700 space-y-2 list-decimal pl-5">
              <li>Arrastra el botón de abajo a tu <strong>barra de favoritos</strong> del navegador</li>
              <li>Abre el panel de Flujo TV: <a href="https://vip.flujotv.net/jeesite/a/home" target="_blank" className="underline font-medium">vip.flujotv.net</a></li>
              <li>Inicia sesión en Flujo TV con tu usuario</li>
              <li>Haz clic en el bookmarklet <strong>&quot;Sync Wonder TV&quot;</strong> en tu barra de favoritos</li>
              <li>Espera a que termine — verás un panel en la esquina superior derecha con el progreso</li>
            </ol>
          </div>

          <div className="flex flex-col items-center gap-4 p-6 rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-sm text-muted-foreground">Arrastra este botón a tu barra de favoritos:</p>
            <a
              href={bookmarkletUrl}
              onClick={(e) => e.preventDefault()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 cursor-grab active:cursor-grabbing shadow-lg"
              title="Arrastra a favoritos"
            >
              <RefreshCw className="h-4 w-4" />
              Sync Wonder TV
            </a>
            <p className="text-xs text-muted-foreground text-center">
              (No hagas clic aquí — arrástralo a la barra de favoritos)
            </p>
          </div>

          <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Nota importante</p>
                <p className="text-sm text-yellow-700 mt-1">
                  El bookmarklet debe ejecutarse <strong>desde el panel de Flujo TV</strong> (vip.flujotv.net)
                  porque necesita acceso a su API. Sincroniza todos los clientes: los nuevos se crean y los
                  existentes se actualizan automáticamente.
                </p>
              </div>
            </div>
          </div>

          {lastResult && (
            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="font-medium text-green-800">Última sincronización</p>
              </div>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-800">{lastResult.total}</p>
                  <p className="text-xs text-green-600">Total</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-800">{lastResult.created}</p>
                  <p className="text-xs text-blue-600">Nuevos</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-800">{lastResult.updated}</p>
                  <p className="text-xs text-yellow-600">Actualizados</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-800">{lastResult.errors}</p>
                  <p className="text-xs text-red-600">Errores</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
