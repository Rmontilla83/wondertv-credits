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
import { formatDateTime, daysUntilExpiration } from '@/lib/utils'
import { toast } from 'sonner'
import type { Campaign, Client, CampaignSegment } from '@/lib/types'
import {
  AlertTriangle, RefreshCw, Megaphone, PartyPopper,
  Send, Loader2, Users, Mail, History, X, Plus, Upload, Eye, Code,
} from 'lucide-react'

const ICON_MAP: Record<string, typeof AlertTriangle> = {
  AlertTriangle, RefreshCw, Megaphone, PartyPopper,
}

const LOGO_URL = 'https://www.wondertv.live/logo.png'
const CHAT_URL = 'https://www.wondertv.live/chat'
const WA_NUMBER = '584248488722'
const CTA_BUTTON = `<div style="text-align:center;margin:28px 0 8px">
  <a href="${CHAT_URL}" target="_blank" style="display:inline-block;background:#25D366;color:white;font-size:18px;font-weight:bold;padding:16px 40px;border-radius:50px;text-decoration:none;box-shadow:0 4px 15px rgba(37,211,102,0.4)">
    &#128172;&nbsp;&nbsp;Escr&iacute;benos ahora
  </a>
  <p style="margin:10px 0 0;color:#6b7280;font-size:12px">Te respondemos al instante</p>
</div>`
const EMAIL_HEADER = `<div style="text-align:center;padding:24px 20px;background:linear-gradient(135deg,#1e1b4b,#312e81);border-radius:12px 12px 0 0">
  <img src="${LOGO_URL}" alt="Wonder TV (FLUJO)" width="180" style="max-width:180px;height:auto" />
</div>`
const EMAIL_FOOTER = `${CTA_BUTTON}
<div style="border-top:1px solid #e5e7eb;margin-top:24px;padding-top:16px;text-align:center">
  <p style="color:#9ca3af;font-size:11px;margin:0">Wonder TV (FLUJO) &mdash; Tu entretenimiento sin l&iacute;mites</p>
  <p style="color:#d1d5db;font-size:10px;margin:4px 0 0">Este correo fue enviado a {email}</p>
  <p style="margin:8px 0 0"><a href="mailto:hola@wondertv.live?subject=Desuscribir%20{email}" style="color:#d1d5db;font-size:10px;text-decoration:underline">Desuscribirme de estos correos</a></p>
</div>`

const EMAIL_TEMPLATES: Record<string, { subject: string; html: string }> = {
  expiring: {
    subject: '{nombre}, tu Wonder TV (FLUJO) está por vencer — renueva desde $4.97/mes',
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
  ${EMAIL_HEADER}
  <div style="padding:24px 28px 20px">
    <h2 style="color:#1f2937;margin:0 0 8px">{nombre}, &iexcl;tu servicio est&aacute; por vencer! &#9888;&#65039;</h2>
    <p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 16px">Tu suscripci&oacute;n de Wonder TV (FLUJO) est&aacute; a punto de expirar. <strong>Si no renuevas, perder&aacute;s acceso a +1000 canales en vivo, series, pel&iacute;culas y todos los deportes.</strong></p>

    <div style="background:linear-gradient(135deg,#fef2f2,#fee2e2);border-left:4px solid #ef4444;border-radius:8px;padding:16px;margin:20px 0">
      <p style="margin:0;color:#991b1b;font-weight:bold;font-size:15px">&#128680; No te quedes sin tu entretenimiento &mdash; renueva ahora antes de que se desactive</p>
    </div>

    <p style="color:#1f2937;font-size:16px;font-weight:bold;margin:20px 0 12px;text-align:center">&#127873; Aprovecha nuestros precios especiales de renovaci&oacute;n:</p>

    <!-- PRICING TABLE -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px">
      <tr>
        <td style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid #86efac;border-radius:12px;padding:18px">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td>
              <span style="background:#22c55e;color:white;font-size:10px;font-weight:bold;padding:3px 8px;border-radius:20px">15% OFF</span>
              <p style="margin:8px 0 2px;font-size:17px;font-weight:bold;color:#166534">Mensual</p>
              <p style="margin:0;color:#4ade80;font-size:12px;text-decoration:line-through">$9.00</p>
            </td>
            <td style="text-align:right;vertical-align:middle">
              <p style="margin:0;font-size:28px;font-weight:900;color:#166534">$7.65</p>
              <p style="margin:0;color:#15803d;font-size:11px">por mes</p>
            </td>
          </tr></table>
        </td>
      </tr>
      <tr><td style="height:8px"></td></tr>
      <tr>
        <td style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border:2px solid #93c5fd;border-radius:12px;padding:18px">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td>
              <span style="background:#3b82f6;color:white;font-size:10px;font-weight:bold;padding:3px 8px;border-radius:20px">&#11088; POPULAR</span>
              <p style="margin:8px 0 2px;font-size:17px;font-weight:bold;color:#1e40af">Semestral &mdash; 6 + 1 MES GRATIS</p>
              <p style="margin:0;color:#60a5fa;font-size:12px"><span style="text-decoration:line-through">$49.00</span></p>
            </td>
            <td style="text-align:right;vertical-align:middle">
              <p style="margin:0;font-size:28px;font-weight:900;color:#1e40af">$39.20</p>
              <p style="margin:0;color:#2563eb;font-size:11px">$5.60/mes &mdash; <strong>Ahorras 31%</strong></p>
            </td>
          </tr></table>
        </td>
      </tr>
      <tr><td style="height:8px"></td></tr>
      <tr>
        <td style="background:linear-gradient(135deg,#faf5ff,#f3e8ff);border:2px solid #c084fc;border-radius:12px;padding:18px">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td>
              <span style="background:#9333ea;color:white;font-size:10px;font-weight:bold;padding:3px 8px;border-radius:20px">&#128526; MEJOR VALOR</span>
              <p style="margin:8px 0 2px;font-size:17px;font-weight:bold;color:#6b21a8">Anual &mdash; 12 + 2 MESES GRATIS</p>
              <p style="margin:0;color:#a855f7;font-size:12px"><span style="text-decoration:line-through">$87.00</span></p>
            </td>
            <td style="text-align:right;vertical-align:middle">
              <p style="margin:0;font-size:28px;font-weight:900;color:#6b21a8">$69.60</p>
              <p style="margin:0;color:#7c3aed;font-size:11px">$4.97/mes &mdash; <strong>Ahorras 31%</strong></p>
            </td>
          </tr></table>
        </td>
      </tr>
    </table>

    <div style="background:#f0fdf4;border:2px dashed #22c55e;border-radius:10px;padding:14px;text-align:center;margin:16px 0">
      <p style="margin:0;color:#166534;font-size:15px"><strong>&#128161; Clientes que renuevan por m&aacute;s meses ahorran hasta un 31%</strong></p>
      <p style="margin:6px 0 0;color:#15803d;font-size:13px">Tu cuenta se reactiva al instante. Sin esperas.</p>
    </div>

    <div style="background:#fefce8;border-left:4px solid #eab308;border-radius:8px;padding:14px;margin:16px 0">
      <p style="margin:0;color:#854d0e;font-size:14px"><strong>&#9200; Renueva antes de que expire</strong> &mdash; evita perder tu historial y configuraci&oacute;n</p>
    </div>

    <p style="color:#4b5563;font-size:15px;line-height:1.5;margin:16px 0 4px;text-align:center"><strong>&#128242; Escr&iacute;benos ahora para renovar en minutos:</strong></p>
    ${EMAIL_FOOTER}
  </div>
</div>`,
  },
  reactivation: {
    subject: '{nombre}, te extrañamos en Wonder TV (FLUJO)',
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
    subject: '{nombre}, descuento imbatible en Magis TV / Flujo TV desde $4.97/mes',
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
  ${EMAIL_HEADER}
  <div style="padding:24px 28px 20px">
    <h2 style="color:#1f2937;margin:0 0 8px">Hola {nombre} &#128075;</h2>
    <p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 20px">Tenemos <strong>precios exclusivos</strong> en tu servicio de Magis TV / Flujo TV con m&aacute;s de <strong>+1000 canales en vivo, series, pel&iacute;culas y deportes</strong>. &iexcl;Mira lo que tenemos para ti!</p>

    <!-- PRICING TABLE -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px">
      <!-- Plan Mensual -->
      <tr>
        <td style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid #86efac;border-radius:12px;padding:18px;margin-bottom:10px">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td>
              <span style="background:#22c55e;color:white;font-size:10px;font-weight:bold;padding:3px 8px;border-radius:20px;text-transform:uppercase">15% OFF</span>
              <p style="margin:8px 0 2px;font-size:18px;font-weight:bold;color:#166534">Magis TV / Flujo TV &mdash; Mensual</p>
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
              <p style="margin:8px 0 2px;font-size:18px;font-weight:bold;color:#166534">Magis TV / Flujo TV &mdash; Trimestral</p>
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
              <p style="margin:8px 0 2px;font-size:18px;font-weight:bold;color:#1e40af">Magis TV / Flujo TV &mdash; Semestral</p>
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
              <p style="margin:8px 0 2px;font-size:18px;font-weight:bold;color:#6b21a8">Magis TV / Flujo TV &mdash; Anual</p>
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

    <p style="color:#4b5563;font-size:15px;line-height:1.5;margin:16px 0 4px;text-align:center"><strong>&#128242; Escr&iacute;benos por WhatsApp para contratar tu plan Magis TV / Flujo TV:</strong></p>
    ${EMAIL_FOOTER}
  </div>
</div>`,
  },
  welcome: {
    subject: 'Bienvenido a Wonder TV (FLUJO), {nombre}',
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

  // Send progress
  const [sendProgress, setSendProgress] = useState<{ sent: number; failed: number; total: number; percent: number; current?: number; lastEmail?: string } | null>(null)

  // Add recipients
  const [addName, setAddName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [bulkEmails, setBulkEmails] = useState('')

  const [failedLog, setFailedLog] = useState<{ email: string; error_message: string | null }[]>([])
  const [failedCampaignId, setFailedCampaignId] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  const showFailedLog = async (campaignId: string) => {
    const { data } = await supabase
      .from('campaign_emails')
      .select('email, error_message')
      .eq('campaign_id', campaignId)
      .eq('status', 'failed')
    setFailedLog(data || [])
    setFailedCampaignId(campaignId)
  }

  useEffect(() => {
    async function fetchData() {
      try {
        const [campaignsRes, clientsRes] = await Promise.all([
          supabase.from('campaigns').select('*').order('created_at', { ascending: false }).limit(20),
          supabase.from('clients').select('id, email, status, flujo_end_date').not('email', 'is', null),
        ])

        if (campaignsRes.data) setCampaigns(campaignsRes.data)

        if (clientsRes.data) {
          const counts: Record<string, number> = {}
          const active = clientsRes.data.filter(c => c.status === 'active')
          const inactive = clientsRes.data.filter(c => c.status === 'inactive')

          counts.expiring_7d = active.filter(c => {
            const d = daysUntilExpiration(c.flujo_end_date)
            return d !== null && d >= 0 && d <= 7
          }).length
          counts.expiring_14d = active.filter(c => {
            const d = daysUntilExpiration(c.flujo_end_date)
            return d !== null && d >= 0 && d <= 14
          }).length
          counts.expiring_30d = active.filter(c => {
            const d = daysUntilExpiration(c.flujo_end_date)
            return d !== null && d >= 0 && d <= 30
          }).length
          counts.inactive = inactive.length
          counts.active = active.length
          counts.all = clientsRes.data.length

          // Count chatbot leads with email that are NOT existing clients
          const clientEmails = new Set(clientsRes.data.map(c => c.email?.toLowerCase()))
          const { data: leadsData } = await supabase
            .from('leads')
            .select('email')
            .eq('source', 'chatbot-ai')
            .not('email', 'is', null)
          counts.chatbot_leads = leadsData
            ? leadsData.filter(l => l.email && !clientEmails.has(l.email.toLowerCase())).length
            : 0

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

    if (seg === 'chatbot_leads') {
      // Fetch leads from chatbot that are NOT existing clients
      const [leadsRes, clientsRes] = await Promise.all([
        supabase.from('leads').select('name, email, phone').eq('source', 'chatbot-ai').not('email', 'is', null),
        supabase.from('clients').select('email').not('email', 'is', null),
      ])
      const clientEmails = new Set((clientsRes.data || []).map(c => c.email?.toLowerCase()))
      const leads = (leadsRes.data || []).filter(l => l.email && !clientEmails.has(l.email.toLowerCase()))
      setRecipients(leads.map(l => ({ name: l.name || 'Prospecto', email: l.email! })))
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

  const parseBulkLines = (text: string): { added: number; duplicates: number } => {
    const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean)
    const newRecipients: Recipient[] = []
    const existing = new Set(recipients.map(r => r.email.toLowerCase()))
    let duplicates = 0

    for (const line of lines) {
      let name = ''
      let email = ''

      // Format: Name <email>
      const angleMatch = line.match(/^(.+?)\s*<(.+@.+)>$/)
      // Format: name,email or name;email or name\temail (CSV/TSV)
      const csvMatch = line.match(/^([^,;\t]+?)[,;\t]\s*(\S+@\S+)/)
      // Format: email,name or email;name (reversed CSV)
      const reverseCsvMatch = line.match(/^(\S+@\S+)[,;\t]\s*(.+)/)

      if (angleMatch) {
        name = angleMatch[1].trim().replace(/^["']|["']$/g, '')
        email = angleMatch[2].trim()
      } else if (csvMatch && !csvMatch[1].includes('@')) {
        name = csvMatch[1].trim().replace(/^["']|["']$/g, '')
        email = csvMatch[2].trim()
      } else if (reverseCsvMatch) {
        email = reverseCsvMatch[1].trim()
        name = reverseCsvMatch[2].trim().replace(/^["']|["']$/g, '')
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
      newRecipients.push({ name: name || email.split('@')[0], email })
    }

    if (newRecipients.length > 0) {
      setRecipients(prev => [...prev, ...newRecipients])
    }
    return { added: newRecipients.length, duplicates }
  }

  const addBulkRecipients = () => {
    const { added, duplicates } = parseBulkLines(bulkEmails)
    if (added > 0) {
      setBulkEmails('')
      toast.success(`${added} destinatarios agregados` + (duplicates > 0 ? `, ${duplicates} duplicados omitidos` : ''))
    } else {
      toast.error(duplicates > 0 ? `${duplicates} emails ya estaban en la lista` : 'No se encontraron emails validos')
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      if (!text) return

      // Skip header row if it looks like a CSV header
      const lines = text.trim()
      const firstLine = lines.split('\n')[0].toLowerCase()
      const skipHeader = firstLine.includes('nombre') || firstLine.includes('name') || firstLine.includes('email') || firstLine.includes('correo')
      const content = skipHeader ? lines.split('\n').slice(1).join('\n') : lines

      const { added, duplicates } = parseBulkLines(content)
      if (added > 0) {
        toast.success(`${added} destinatarios cargados desde archivo` + (duplicates > 0 ? `, ${duplicates} duplicados omitidos` : ''))
      } else {
        toast.error(duplicates > 0 ? `${duplicates} emails ya estaban en la lista` : 'No se encontraron emails validos en el archivo')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleSend = async () => {
    setConfirmSend(false)
    setSending(true)
    const total = recipients.length
    setSendProgress({ sent: 0, failed: 0, total, percent: 0 })

    const { data: campaign, error: createError } = await supabase
      .from('campaigns')
      .insert({
        name: CAMPAIGN_TYPES.find(t => t.value === prepareType)?.label || prepareType,
        type: prepareType,
        status: 'draft',
        subject,
        html_content: htmlContent,
        segment,
        total_recipients: total,
        created_by: user?.id,
      })
      .select('id')
      .single()

    if (createError || !campaign) {
      toast.error('Error al crear campana: ' + createError?.message)
      setSending(false)
      setSendProgress(null)
      return
    }

    const recipientList = recipients.map(r => ({ name: r.name, email: r.email }))

    // Send in batches — the API auto-continues until done
    const sendBatch = async () => {
      try {
        const resp = await fetch('/api/campaigns/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId: campaign.id,
            customRecipients: recipientList,
          }),
        })
        const result = await resp.json()

        if (result.success) {
          const sent = result.sentCount ?? 0
          const failed = result.failedCount ?? 0
          const processed = sent + failed
          setSendProgress({ sent, failed, total, current: processed, percent: Math.round((processed / total) * 100) })

          if (!result.done && result.remaining > 0) {
            // More to send — call again
            await sendBatch()
          } else {
            // Done
            setSending(false)
            setSendProgress(null)
            toast.success(`Campana enviada: ${sent} emails enviados` + (failed > 0 ? `, ${failed} fallidos` : ''))
            const { data: updated } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false }).limit(20)
            if (updated) setCampaigns(updated)
            setPrepareType(null)
          }
        } else {
          toast.error('Error: ' + (result.error || 'desconocido'))
          setSending(false)
          setSendProgress(null)
        }
      } catch (e) {
        toast.error('Error de conexion: ' + String(e))
        setSending(false)
        setSendProgress(null)
      }
    }

    await sendBatch()
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
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="min-w-[var(--radix-select-trigger-width)] w-auto max-w-[500px]">
                    {CAMPAIGN_SEGMENTS.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="whitespace-nowrap">
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

                {/* Bulk paste + file upload */}
                <div className="space-y-1.5">
                  <Textarea
                    placeholder={"Pega destinatarios (uno por linea):\nNombre, email@ejemplo.com\nemail@ejemplo.com\nNombre <email@ejemplo.com>"}
                    value={bulkEmails}
                    onChange={(e) => setBulkEmails(e.target.value)}
                    className="text-xs h-16 resize-none"
                  />
                  <div className="flex gap-1.5">
                    {bulkEmails.trim() && (
                      <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={addBulkRecipients}>
                        <Upload className="h-3 w-3 mr-1" />
                        Agregar pegados
                      </Button>
                    )}
                    <label className={`inline-flex items-center justify-center gap-1 text-xs font-medium border rounded-md cursor-pointer hover:bg-gray-100 transition-colors h-7 px-3 ${bulkEmails.trim() ? '' : 'flex-1'}`}>
                      <Upload className="h-3 w-3" />
                      Cargar archivo CSV/TXT
                      <input type="file" accept=".csv,.txt,.tsv" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
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
          <div className="px-6 py-4 border-t shrink-0 bg-gray-50 space-y-3">
            {sending && sendProgress ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-purple-800 font-medium flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando {sendProgress.current ?? 0} de {sendProgress.total}...
                  </span>
                  <span className="text-purple-600 font-bold">{sendProgress.percent}%</span>
                </div>
                <div className="h-3 rounded-full bg-purple-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-purple-600 transition-all duration-300"
                    style={{ width: `${sendProgress.percent}%` }}
                  />
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="text-green-600">{sendProgress.sent} enviados</span>
                  {sendProgress.failed > 0 && <span className="text-red-600">{sendProgress.failed} fallidos</span>}
                  {sendProgress.lastEmail && <span className="truncate">Ultimo: {sendProgress.lastEmail}</span>}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {recipients.length} email{recipients.length !== 1 ? 's' : ''} se enviaran con el asunto: <span className="font-medium text-gray-700">{subject.substring(0, 50)}{subject.length > 50 ? '...' : ''}</span>
                </p>
                <Button
                  className="bg-purple-600 hover:bg-purple-700 px-8"
                  disabled={sending || recipients.length === 0}
                  onClick={() => setConfirmSend(true)}
                >
                  <Send className="mr-2 h-4 w-4" />Enviar Campana
                </Button>
              </div>
            )}
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

      {/* Failed emails log */}
      <Dialog open={!!failedCampaignId} onOpenChange={(open) => !open && setFailedCampaignId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Emails fallidos ({failedLog.length})</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {failedLog.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No hay detalles de errores</p>
            ) : (
              failedLog.map((f, i) => (
                <div key={i} className="p-3 rounded-lg border border-red-200 bg-red-50/50">
                  <p className="text-sm font-medium">{f.email}</p>
                  <p className="text-xs text-red-600 mt-1">{f.error_message || 'Error desconocido'}</p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

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
                          {c.failed_count > 0 ? (
                            <button onClick={() => showFailedLog(c.id)} className="text-red-600 font-medium underline underline-offset-2 hover:text-red-800 cursor-pointer">
                              {c.failed_count}
                            </button>
                          ) : '0'}
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
