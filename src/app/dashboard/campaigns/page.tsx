'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { CAMPAIGN_TYPES, CAMPAIGN_SEGMENTS, CAMPAIGN_STATUSES } from '@/lib/constants'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import type { Campaign, Client, CampaignSegment } from '@/lib/types'
import {
  AlertTriangle, RefreshCw, Megaphone, PartyPopper,
  Send, Loader2, Users, Mail, History, X, Plus, Upload, Eye, Code,
} from 'lucide-react'

const ICON_MAP: Record<string, typeof AlertTriangle> = {
  AlertTriangle, RefreshCw, Megaphone, PartyPopper,
}

const LOGO_URL = 'https://wondertv-credits.vercel.app/logo.png'
const CHAT_URL = 'https://wondertv-credits.vercel.app/chat'
const WA_NUMBER = '584248488722'
const WA_BUTTON = `<div style="text-align:center;margin:28px 0 8px">
  <a href="${CHAT_URL}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6366f1);color:white;font-size:17px;font-weight:bold;padding:16px 36px;border-radius:50px;text-decoration:none;box-shadow:0 4px 15px rgba(124,58,237,0.4);margin-bottom:10px">
    &#128172;&nbsp;&nbsp;Chatea con Valentina
  </a>
  <p style="margin:8px 0 0;color:#6b7280;font-size:12px">Nuestra asesora te atiende al instante</p>
  <div style="margin:14px 0 0">
    <a href="https://wa.me/${WA_NUMBER}" target="_blank" style="display:inline-block;background:#25D366;color:white;font-size:14px;font-weight:bold;padding:12px 28px;border-radius:50px;text-decoration:none;box-shadow:0 3px 10px rgba(37,211,102,0.3)">
      &#9742;&nbsp;&nbsp;O escr&iacute;benos por WhatsApp
    </a>
    <p style="margin:6px 0 0;color:#9ca3af;font-size:11px">+58 424-8488722</p>
  </div>
</div>`
const EMAIL_HEADER = `<div style="text-align:center;padding:24px 20px;background:linear-gradient(135deg,#1e1b4b,#312e81);border-radius:12px 12px 0 0">
  <img src="${LOGO_URL}" alt="Wonder TV (FLUJO)" width="180" style="max-width:180px;height:auto" />
</div>`
const EMAIL_FOOTER = `${WA_BUTTON}
<div style="border-top:1px solid #e5e7eb;margin-top:24px;padding-top:16px;text-align:center">
  <p style="color:#9ca3af;font-size:11px;margin:0">Wonder TV (FLUJO) &mdash; Tu entretenimiento sin l&iacute;mites</p>
  <p style="color:#d1d5db;font-size:10px;margin:4px 0 0">Este correo fue enviado a {email}</p>
</div>`

const EMAIL_TEMPLATES: Record<string, { subject: string; html: string }> = {
  expiring: {
    subject: '⚠️ {nombre}, tu servicio Wonder TV (FLUJO) vence en {dias} dias',
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
  ${EMAIL_HEADER}
  <div style="padding:24px 28px 20px">
    <h2 style="color:#1f2937;margin:0 0 12px">Hola {nombre} 👋</h2>
    <p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 16px">Tu servicio de Wonder TV (FLUJO) <strong>vence en {dias} d&iacute;as</strong>. No te quedes sin acceso a tus canales favoritos.</p>
    <div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;padding:16px;margin:20px 0">
      <p style="margin:0;color:#92400e;font-weight:bold;font-size:15px">&#128197; Renueva ahora y no pierdas ni un d&iacute;a</p>
    </div>
    <p style="color:#4b5563;font-size:15px;line-height:1.5;margin:16px 0 0">Para renovar tu suscripci&oacute;n, escr&iacute;benos por WhatsApp y te atendemos al instante:</p>
    ${EMAIL_FOOTER}
  </div>
</div>`,
  },
  reactivation: {
    subject: '🔄 {nombre}, te extrañamos en Wonder TV (FLUJO)',
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
  ${EMAIL_HEADER}
  <div style="padding:24px 28px 20px">
    <h2 style="color:#1f2937;margin:0 0 12px">Hola {nombre} 👋</h2>
    <p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 16px">Notamos que tu servicio de Wonder TV (FLUJO) expir&oacute;. <strong>&iexcl;Queremos que vuelvas!</strong></p>
    <div style="background:#dbeafe;border-left:4px solid #3b82f6;border-radius:8px;padding:16px;margin:20px 0">
      <p style="margin:0;color:#1e40af;font-weight:bold;font-size:15px">&#127881; Reactiva tu servicio y vuelve a disfrutar de todos tus canales</p>
    </div>
    <p style="color:#4b5563;font-size:15px;line-height:1.5;margin:16px 0 0">Escr&iacute;benos por WhatsApp y te ayudamos a reactivar tu cuenta en minutos:</p>
    ${EMAIL_FOOTER}
  </div>
</div>`,
  },
  promotion: {
    subject: '🔥 {nombre}, mira estos precios exclusivos de Wonder TV (FLUJO)',
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
  ${EMAIL_HEADER}
  <div style="padding:24px 28px 20px">
    <h2 style="color:#1f2937;margin:0 0 8px">Hola {nombre} &#128075;</h2>
    <p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 20px">Tenemos <strong>precios exclusivos</strong> en tu servicio de IPTV (FLUJO) con m&aacute;s de <strong>+1000 canales en vivo, series, pel&iacute;culas y deportes</strong>. &iexcl;Mira lo que tenemos para ti!</p>

    <!-- PRICING TABLE -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px">
      <!-- Plan Mensual -->
      <tr>
        <td style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid #86efac;border-radius:12px;padding:18px;margin-bottom:10px">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td>
              <span style="background:#22c55e;color:white;font-size:10px;font-weight:bold;padding:3px 8px;border-radius:20px;text-transform:uppercase">15% OFF</span>
              <p style="margin:8px 0 2px;font-size:18px;font-weight:bold;color:#166534">IPTV (FLUJO) &mdash; Mensual</p>
              <p style="margin:0;color:#4ade80;font-size:12px;text-decoration:line-through">$9.00/mes</p>
            </td>
            <td style="text-align:right;vertical-align:middle">
              <p style="margin:0;font-size:32px;font-weight:900;color:#166534">$7.65</p>
              <p style="margin:0;color:#15803d;font-size:11px">por mes</p>
            </td>
          </tr></table>
        </td>
      </tr>
      <tr><td style="height:10px"></td></tr>

      <!-- Plan Trimestral -->
      <tr>
        <td style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid #86efac;border-radius:12px;padding:18px">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td>
              <span style="background:#22c55e;color:white;font-size:10px;font-weight:bold;padding:3px 8px;border-radius:20px;text-transform:uppercase">15% OFF</span>
              <p style="margin:8px 0 2px;font-size:18px;font-weight:bold;color:#166534">IPTV (FLUJO) &mdash; Trimestral</p>
              <p style="margin:0;color:#4ade80;font-size:12px"><span style="text-decoration:line-through">$27.00</span> &mdash; 3 meses</p>
            </td>
            <td style="text-align:right;vertical-align:middle">
              <p style="margin:0;font-size:32px;font-weight:900;color:#166534">$22.95</p>
              <p style="margin:0;color:#15803d;font-size:11px">$7.65/mes</p>
            </td>
          </tr></table>
        </td>
      </tr>
      <tr><td style="height:10px"></td></tr>

      <!-- Plan Semestral -->
      <tr>
        <td style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border:2px solid #93c5fd;border-radius:12px;padding:18px;position:relative">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td>
              <span style="background:#3b82f6;color:white;font-size:10px;font-weight:bold;padding:3px 8px;border-radius:20px;text-transform:uppercase">&#11088; POPULAR</span>
              <p style="margin:8px 0 2px;font-size:18px;font-weight:bold;color:#1e40af">IPTV (FLUJO) &mdash; Semestral</p>
              <p style="margin:0;color:#60a5fa;font-size:12px"><span style="text-decoration:line-through">$49.00</span> &mdash; 6 meses <strong>+ 1 MES GRATIS</strong></p>
            </td>
            <td style="text-align:right;vertical-align:middle">
              <p style="margin:0;font-size:32px;font-weight:900;color:#1e40af">$39.20</p>
              <p style="margin:0;color:#2563eb;font-size:11px">$5.60/mes &mdash; <strong>Ahorras 31%</strong></p>
            </td>
          </tr></table>
        </td>
      </tr>
      <tr><td style="height:10px"></td></tr>

      <!-- Plan Anual -->
      <tr>
        <td style="background:linear-gradient(135deg,#faf5ff,#f3e8ff);border:2px solid #c084fc;border-radius:12px;padding:18px">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td>
              <span style="background:#9333ea;color:white;font-size:10px;font-weight:bold;padding:3px 8px;border-radius:20px;text-transform:uppercase">&#128526; MEJOR VALOR</span>
              <p style="margin:8px 0 2px;font-size:18px;font-weight:bold;color:#6b21a8">IPTV (FLUJO) &mdash; Anual</p>
              <p style="margin:0;color:#a855f7;font-size:12px"><span style="text-decoration:line-through">$87.00</span> &mdash; 12 meses <strong>+ 2 MESES GRATIS</strong></p>
            </td>
            <td style="text-align:right;vertical-align:middle">
              <p style="margin:0;font-size:32px;font-weight:900;color:#6b21a8">$69.60</p>
              <p style="margin:0;color:#7c3aed;font-size:11px">$4.97/mes &mdash; <strong>Ahorras 31%</strong></p>
            </td>
          </tr></table>
        </td>
      </tr>
    </table>

    <div style="background:#fefce8;border-left:4px solid #eab308;border-radius:8px;padding:14px;margin:16px 0">
      <p style="margin:0;color:#854d0e;font-size:14px"><strong>&#9200; Oferta por tiempo limitado</strong> &mdash; Aprovecha antes de que se acabe</p>
    </div>

    <p style="color:#4b5563;font-size:15px;line-height:1.5;margin:16px 0 4px;text-align:center"><strong>&#128242; Escr&iacute;benos por WhatsApp para contratar tu plan IPTV (FLUJO):</strong></p>
    ${EMAIL_FOOTER}
  </div>
</div>`,
  },
  welcome: {
    subject: '🎉 Bienvenido a Wonder TV (FLUJO), {nombre}!',
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
  ${EMAIL_HEADER}
  <div style="padding:24px 28px 20px">
    <h2 style="color:#1f2937;margin:0 0 12px">&iexcl;Bienvenido {nombre}! 🎉</h2>
    <p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 16px">Gracias por unirte a Wonder TV (FLUJO). Ya puedes disfrutar de todos nuestros canales y contenido.</p>
    <div style="background:#ede9fe;border-left:4px solid #8b5cf6;border-radius:8px;padding:16px;margin:20px 0">
      <p style="margin:0;color:#5b21b6;font-weight:bold;font-size:15px">&#128250; Tu usuario IPTV: {usuario}</p>
    </div>
    <p style="color:#4b5563;font-size:15px;line-height:1.5;margin:16px 0 0">Si necesitas ayuda o tienes alguna pregunta, escr&iacute;benos por WhatsApp:</p>
    ${EMAIL_FOOTER}
  </div>
</div>`,
  },
}

type Recipient = { id?: string; name: string; email: string }

export default function CampaignsPage() {
  const { profile, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [recipientCounts, setRecipientCounts] = useState<Record<string, number>>({})

  // Prepare campaign state
  const [prepareType, setPrepareType] = useState<string | null>(null)
  const [segment, setSegment] = useState<CampaignSegment>('expiring_7d')
  const [subject, setSubject] = useState('')
  const [htmlContent, setHtmlContent] = useState('')
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [sending, setSending] = useState(false)
  const [confirmSend, setConfirmSend] = useState(false)
  const [editorTab, setEditorTab] = useState<string>('preview')

  // Add recipients
  const [addName, setAddName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [bulkEmails, setBulkEmails] = useState('')

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function fetchData() {
      try {
        const [campaignsRes, clientsRes] = await Promise.all([
          supabase.from('campaigns').select('*').order('created_at', { ascending: false }).limit(20),
          supabase.from('clients').select('id, email, status, flujo_end_date').not('email', 'is', null),
        ])

        if (campaignsRes.data) setCampaigns(campaignsRes.data)

        if (clientsRes.data) {
          const now = Date.now()
          const counts: Record<string, number> = {}
          const active = clientsRes.data.filter(c => c.status === 'active')
          const inactive = clientsRes.data.filter(c => c.status === 'inactive')

          counts.expiring_7d = active.filter(c => {
            const d = c.flujo_end_date ? (new Date(c.flujo_end_date).getTime() - now) / 86400000 : null
            return d !== null && d >= 0 && d <= 7
          }).length
          counts.expiring_14d = active.filter(c => {
            const d = c.flujo_end_date ? (new Date(c.flujo_end_date).getTime() - now) / 86400000 : null
            return d !== null && d >= 0 && d <= 14
          }).length
          counts.expiring_30d = active.filter(c => {
            const d = c.flujo_end_date ? (new Date(c.flujo_end_date).getTime() - now) / 86400000 : null
            return d !== null && d >= 0 && d <= 30
          }).length
          counts.inactive = inactive.length
          counts.active = active.length
          counts.all = clientsRes.data.length

          setRecipientCounts(counts)
        }
      } catch (e) {
        console.error('Error fetching campaigns:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [supabase])

  const openPrepare = async (type: string) => {
    const template = EMAIL_TEMPLATES[type]
    const defaultSegment: CampaignSegment =
      type === 'expiring' ? 'expiring_7d' :
      type === 'reactivation' ? 'inactive' :
      type === 'welcome' ? 'all' : 'active'

    setPrepareType(type)
    setSegment(defaultSegment)
    setSubject(template.subject)
    setHtmlContent(template.html)
    setEditorTab('preview')
    setAddName('')
    setAddEmail('')
    setBulkEmails('')
    await loadRecipients(defaultSegment)
  }

  const loadRecipients = async (seg: CampaignSegment) => {
    setLoadingPreview(true)

    if (seg === 'empty') {
      setRecipients([])
      setLoadingPreview(false)
      return
    }

    let query = supabase
      .from('clients')
      .select('id, name, email, flujo_login, flujo_end_date, status')
      .not('email', 'is', null)

    const now = new Date()
    if (seg === 'inactive') {
      query = query.eq('status', 'inactive')
    } else if (seg === 'active') {
      query = query.eq('status', 'active')
    } else if (seg.startsWith('expiring_')) {
      const days = parseInt(seg.replace('expiring_', '').replace('d', ''))
      query = query
        .eq('status', 'active')
        .gte('flujo_end_date', now.toISOString())
        .lte('flujo_end_date', new Date(now.getTime() + days * 86400000).toISOString())
    }

    const { data } = await query.order('name').limit(500)
    setRecipients((data || []).map(c => ({ id: c.id, name: c.name, email: c.email! })))
    setLoadingPreview(false)
  }

  const handleSegmentChange = async (newSeg: CampaignSegment) => {
    setSegment(newSeg)
    await loadRecipients(newSeg)
  }

  const removeRecipient = (index: number) => {
    setRecipients(prev => prev.filter((_, i) => i !== index))
  }

  const addSingleRecipient = () => {
    if (!addEmail.trim() || !addEmail.includes('@')) {
      toast.error('Email invalido')
      return
    }
    if (recipients.some(r => r.email.toLowerCase() === addEmail.trim().toLowerCase())) {
      toast.error('Este email ya esta en la lista')
      return
    }
    setRecipients(prev => [...prev, { name: addName.trim() || addEmail.split('@')[0], email: addEmail.trim() }])
    setAddName('')
    setAddEmail('')
    toast.success('Destinatario agregado')
  }

  const addBulkRecipients = () => {
    const lines = bulkEmails.split(/[\n,;]+/).map(l => l.trim()).filter(Boolean)
    const newRecipients: Recipient[] = []
    const existing = new Set(recipients.map(r => r.email.toLowerCase()))
    let duplicates = 0

    for (const line of lines) {
      // Support formats: "email", "name <email>", "name,email", "name;email"
      let name = ''
      let email = ''

      const angleMatch = line.match(/^(.+?)\s*<(.+@.+)>$/)
      if (angleMatch) {
        name = angleMatch[1].trim()
        email = angleMatch[2].trim()
      } else if (line.includes('@')) {
        email = line.replace(/^["']|["']$/g, '').trim()
        name = email.split('@')[0]
      }

      if (!email || !email.includes('@')) continue

      if (existing.has(email.toLowerCase())) {
        duplicates++
        continue
      }

      existing.add(email.toLowerCase())
      newRecipients.push({ name, email })
    }

    if (newRecipients.length > 0) {
      setRecipients(prev => [...prev, ...newRecipients])
      setBulkEmails('')
      toast.success(`${newRecipients.length} destinatarios agregados` + (duplicates > 0 ? `, ${duplicates} duplicados omitidos` : ''))
    } else {
      toast.error(duplicates > 0 ? `${duplicates} emails ya estaban en la lista` : 'No se encontraron emails validos')
    }
  }

  const handleSend = async () => {
    setConfirmSend(false)
    setSending(true)

    const { data: campaign, error: createError } = await supabase
      .from('campaigns')
      .insert({
        name: CAMPAIGN_TYPES.find(t => t.value === prepareType)?.label || prepareType,
        type: prepareType,
        status: 'draft',
        subject,
        html_content: htmlContent,
        segment,
        total_recipients: recipients.length,
        created_by: user?.id,
      })
      .select('id')
      .single()

    if (createError || !campaign) {
      toast.error('Error al crear campana: ' + createError?.message)
      setSending(false)
      return
    }

    const resp = await fetch('/api/campaigns/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: campaign.id,
        customRecipients: recipients.map(r => ({ name: r.name, email: r.email })),
      }),
    })

    const result = await resp.json()

    if (result.success) {
      toast.success(`Campana enviada: ${result.sentCount} emails enviados` + (result.failedCount > 0 ? `, ${result.failedCount} fallidos` : ''))
      const { data } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false }).limit(20)
      if (data) setCampaigns(data)
    } else {
      toast.error('Error: ' + (result.error || 'desconocido'))
    }

    setSending(false)
    setPrepareType(null)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Campanas</h1>
        <p className="text-sm text-muted-foreground">Envia emails a tus clientes via Resend</p>
      </div>

      {/* Quick campaign cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CAMPAIGN_TYPES.map((ct) => {
          const Icon = ICON_MAP[ct.icon] || Mail
          const defaultSeg = ct.value === 'expiring' ? 'expiring_7d' : ct.value === 'reactivation' ? 'inactive' : ct.value === 'welcome' ? 'all' : 'active'
          const count = recipientCounts[defaultSeg] ?? 0

          return (
            <Card key={ct.value} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => openPrepare(ct.value)}>
              <CardContent className="p-5">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${ct.color} mb-3`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-sm">{ct.label}</h3>
                <p className="text-xs text-muted-foreground mt-1">{ct.description}</p>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {count} destinatarios
                  </div>
                  <span className="text-xs text-purple-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Preparar →
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Campaign editor - full page dialog */}
      <Dialog open={!!prepareType} onOpenChange={(open) => !open && !sending && setPrepareType(null)}>
        <DialogContent className="sm:!max-w-[95vw] !w-[95vw] h-[92vh] flex flex-col !p-0 !gap-0 rounded-xl">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg">
                {CAMPAIGN_TYPES.find(t => t.value === prepareType)?.label}
              </DialogTitle>
              <Badge variant="secondary" className="text-xs">
                {recipients.length} destinatarios
              </Badge>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex">
            {/* Left: Editor */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 border-r">
              {/* Segment */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Segmento base</Label>
                <Select value={segment} onValueChange={(v) => handleSegmentChange(v as CampaignSegment)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_SEGMENTS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label} ({recipientCounts[s.value] ?? 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Asunto</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="text-sm" />
                <p className="text-[10px] text-muted-foreground">Variables: {'{nombre}'}, {'{dias}'}, {'{usuario}'}, {'{email}'}</p>
              </div>

              {/* Content editor with tabs */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contenido</Label>
                <Tabs value={editorTab} onValueChange={setEditorTab}>
                  <TabsList className="h-8">
                    <TabsTrigger value="preview" className="text-xs gap-1"><Eye className="h-3 w-3" />Preview</TabsTrigger>
                    <TabsTrigger value="code" className="text-xs gap-1"><Code className="h-3 w-3" />HTML</TabsTrigger>
                  </TabsList>
                  <TabsContent value="preview" className="mt-2">
                    <div className="border rounded-lg bg-gray-50 p-1">
                      <div className="bg-white rounded-md overflow-hidden max-h-[400px] overflow-y-auto" dangerouslySetInnerHTML={{
                        __html: htmlContent
                          .replace(/\{nombre\}/g, 'Juan Perez')
                          .replace(/\{dias\}/g, '7')
                          .replace(/\{usuario\}/g, 'juanp123')
                          .replace(/\{email\}/g, 'juan@email.com')
                      }} />
                    </div>
                  </TabsContent>
                  <TabsContent value="code" className="mt-2">
                    <Textarea
                      value={htmlContent}
                      onChange={(e) => setHtmlContent(e.target.value)}
                      className="font-mono text-xs h-[400px] resize-none"
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            {/* Right: Recipients */}
            <div className="w-[380px] shrink-0 flex flex-col overflow-hidden">
              <div className="p-4 border-b space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Destinatarios
                  <Badge variant="secondary" className="ml-auto">{recipients.length}</Badge>
                </h3>

                {/* Add single */}
                <div className="flex gap-1.5">
                  <Input
                    placeholder="Nombre"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className="text-xs h-8"
                  />
                  <Input
                    placeholder="email@ejemplo.com"
                    type="email"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className="text-xs h-8 flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && addSingleRecipient()}
                  />
                  <Button size="sm" variant="outline" className="h-8 px-2" onClick={addSingleRecipient}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Bulk paste */}
                <div className="space-y-1.5">
                  <Textarea
                    placeholder="Pega emails masivos aqui (uno por linea, separados por comas, o formato Nombre <email>)"
                    value={bulkEmails}
                    onChange={(e) => setBulkEmails(e.target.value)}
                    className="text-xs h-16 resize-none"
                  />
                  {bulkEmails.trim() && (
                    <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={addBulkRecipients}>
                      <Upload className="h-3 w-3 mr-1" />
                      Agregar emails masivos
                    </Button>
                  )}
                </div>
              </div>

              {/* Recipient list */}
              <div className="flex-1 overflow-y-auto">
                {loadingPreview ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : recipients.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8 px-4">
                    No hay destinatarios. Cambia el segmento o agrega emails manualmente.
                  </p>
                ) : (
                  <div className="divide-y">
                    {recipients.map((r, i) => (
                      <div key={`${r.email}-${i}`} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 group">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{r.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{r.email}</p>
                        </div>
                        <button
                          onClick={() => removeRecipient(i)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 p-0.5"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t shrink-0 flex items-center justify-between bg-gray-50">
            <p className="text-xs text-muted-foreground">
              {recipients.length} email{recipients.length !== 1 ? 's' : ''} se enviaran con el asunto: <span className="font-medium text-gray-700">{subject.substring(0, 50)}{subject.length > 50 ? '...' : ''}</span>
            </p>
            <Button
              className="bg-purple-600 hover:bg-purple-700 px-8"
              disabled={sending || recipients.length === 0}
              onClick={() => setConfirmSend(true)}
            >
              {sending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</>
              ) : (
                <><Send className="mr-2 h-4 w-4" />Enviar Campana</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send confirmation */}
      <AlertDialog open={confirmSend} onOpenChange={setConfirmSend}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar envio</AlertDialogTitle>
            <AlertDialogDescription>
              Enviar <strong>{recipients.length} emails</strong> de &quot;{CAMPAIGN_TYPES.find(t => t.value === prepareType)?.label}&quot;?
              Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend} className="bg-purple-600">
              Enviar Campana
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Campaign history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de Campanas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No hay campanas enviadas</p>
          ) : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estado</TableHead>
                    <TableHead>Campana</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Destinatarios</TableHead>
                    <TableHead className="text-right">Enviados</TableHead>
                    <TableHead className="text-right">Fallidos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((c) => {
                    const statusInfo = CAMPAIGN_STATUSES.find(s => s.value === c.status)
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <Badge className={statusInfo?.color}>{statusInfo?.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{c.subject}</p>
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{formatDateTime(c.sent_at || c.created_at)}</TableCell>
                        <TableCell className="text-right text-sm">{c.total_recipients}</TableCell>
                        <TableCell className="text-right text-sm">{c.sent_count}</TableCell>
                        <TableCell className="text-right text-sm">
                          {c.failed_count > 0 ? <span className="text-red-600 font-medium">{c.failed_count}</span> : '0'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
