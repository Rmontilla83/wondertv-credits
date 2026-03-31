'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { formatDateTime } from '@/lib/utils'
import { MessageCircle, User, Mail, Phone, ShoppingCart, ArrowRight, ExternalLink, Copy, Share2, Check } from 'lucide-react'

interface Conversation {
  id: string
  messages: { role: 'user' | 'assistant'; content: string }[]
  lead_name: string | null
  lead_email: string | null
  lead_phone: string | null
  plan_interest: string | null
  transferred_to_whatsapp: boolean
  message_count: number
  last_message_at: string
  created_at: string
}

export default function ConversationsPage() {
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const chatUrl = typeof window !== 'undefined' ? `${window.location.origin}/chat` : '/chat'

  const copyLink = (type: 'link' | 'whatsapp', phone?: string) => {
    let text: string
    if (type === 'whatsapp' && phone) {
      const digits = phone.replace(/\D/g, '')
      text = `https://wa.me/${digits}?text=${encodeURIComponent(`Hola! Te comparto el link de nuestra asesora virtual Valentina para que te atienda al instante 👇\n${chatUrl}`)}`
      window.open(text, '_blank')
      return
    }
    text = chatUrl
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  useEffect(() => {
    supabase
      .from('chat_conversations')
      .select('*')
      .order('last_message_at', { ascending: false })
      .limit(500)
      .then(({ data }) => {
        if (data) setConversations(data)
        setLoading(false)
      })
  }, [supabase])

  const withContact = conversations.filter(c => c.lead_email || c.lead_phone)
  const transferred = conversations.filter(c => c.transferred_to_whatsapp)
  const withPlan = conversations.filter(c => c.plan_interest)
  // Hot leads: have plan interest + contact data but NOT transferred to WhatsApp yet
  const hotLeads = conversations.filter(c => c.plan_interest && (c.lead_email || c.lead_phone) && !c.transferred_to_whatsapp)

  const stats = {
    total: conversations.length,
    withContact: withContact.length,
    transferred: transferred.length,
    withPlan: withPlan.length,
    hotLeads: hotLeads.length,
    conversionRate: conversations.length > 0
      ? Math.round((transferred.length / conversations.length) * 100)
      : 0,
    contactRate: conversations.length > 0
      ? Math.round((withContact.length / conversations.length) * 100)
      : 0,
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Conversaciones del Bot</h1>
          <p className="text-sm text-muted-foreground">Historial de chats con Valentina</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5"
            onClick={() => copyLink('link')}
          >
            {copied === 'link' ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copied === 'link' ? 'Copiado!' : 'Copiar link de Valentina'}
          </Button>
          <Button
            size="sm"
            className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => {
              const phone = prompt('Numero de WhatsApp del cliente (ej: 584141234567):')
              if (phone) copyLink('whatsapp', phone)
            }}
          >
            <Share2 className="h-3.5 w-3.5" />
            Enviar por WhatsApp
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Conversaciones</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.withContact}</p>
            <p className="text-xs text-muted-foreground">Con contacto ({stats.contactRate}%)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.transferred}</p>
            <p className="text-xs text-muted-foreground">A WhatsApp ({stats.conversionRate}%)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.withPlan}</p>
            <p className="text-xs text-muted-foreground">Interesados en plan</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{stats.hotLeads}</p>
            <p className="text-xs text-muted-foreground">Leads calientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.conversionRate}%</p>
            <p className="text-xs text-muted-foreground">Tasa de conversion</p>
          </CardContent>
        </Card>
      </div>

      {/* Hot leads alert */}
      {hotLeads.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-orange-800 mb-2">
              {hotLeads.length} lead{hotLeads.length > 1 ? 's' : ''} caliente{hotLeads.length > 1 ? 's' : ''} — interesados en plan pero no transfirieron a WhatsApp
            </p>
            <div className="space-y-2">
              {hotLeads.slice(0, 5).map((conv) => (
                <div key={conv.id} className="flex items-center justify-between p-2 rounded bg-white border border-orange-200">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium truncate">{conv.lead_name || 'Visitante'}</span>
                    {conv.plan_interest && <Badge className="bg-purple-100 text-purple-700 text-[10px]">{conv.plan_interest}</Badge>}
                    {conv.lead_phone && <span className="text-[10px] text-green-600">{conv.lead_phone}</span>}
                    {conv.lead_email && <span className="text-[10px] text-blue-600">{conv.lead_email}</span>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {conv.lead_phone && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[10px] h-7 gap-1"
                        onClick={() => {
                          const digits = conv.lead_phone!.replace(/\D/g, '')
                          window.open(`https://wa.me/${digits}?text=${encodeURIComponent(`Hola! Te comparto el link de nuestra asesora virtual Valentina para que te atienda al instante 👇\n${chatUrl}`)}`, '_blank')
                        }}
                      >
                        <Share2 className="h-3 w-3" />Enviar Valentina
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-[10px] h-7" onClick={() => setSelected(conv)}>
                      Ver chat
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conversations list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Ultimas conversaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No hay conversaciones aun</p>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv) => {
                const firstUserMsg = conv.messages.find(m => m.role === 'user')?.content || ''
                const preview = firstUserMsg.substring(0, 80) + (firstUserMsg.length > 80 ? '...' : '')

                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelected(conv)}
                    className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {conv.lead_name || 'Visitante'}
                        </p>
                        {conv.transferred_to_whatsapp && (
                          <Badge className="bg-green-100 text-green-700 text-[10px]">WhatsApp</Badge>
                        )}
                        {conv.plan_interest && (
                          <Badge className="bg-purple-100 text-purple-700 text-[10px]">{conv.plan_interest}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{preview}</p>
                      <div className="flex items-center gap-3 mt-1">
                        {conv.lead_email && (
                          <span className="text-[10px] text-blue-500 flex items-center gap-0.5">
                            <Mail className="h-2.5 w-2.5" />{conv.lead_email}
                          </span>
                        )}
                        {conv.lead_phone && (
                          <span className="text-[10px] text-green-500 flex items-center gap-0.5">
                            <Phone className="h-2.5 w-2.5" />{conv.lead_phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">{formatDateTime(conv.last_message_at)}</p>
                      <p className="text-[10px] text-muted-foreground">{conv.message_count} mensajes</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversation detail modal */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:!max-w-[600px] h-[80vh] flex flex-col !p-0 !gap-0">
          <DialogHeader className="px-5 py-4 border-b shrink-0">
            <DialogTitle className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold">{selected?.lead_name || 'Visitante'}</p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-normal">
                  {selected?.lead_email && <span>{selected.lead_email}</span>}
                  {selected?.lead_phone && <span>{selected.lead_phone}</span>}
                  {!selected?.lead_email && !selected?.lead_phone && <span>Sin datos de contacto</span>}
                </div>
              </div>
            </DialogTitle>
            {(selected?.plan_interest || selected?.transferred_to_whatsapp) && (
              <div className="flex gap-2 mt-2">
                {selected.plan_interest && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <ShoppingCart className="h-3 w-3" />Plan: {selected.plan_interest}
                  </Badge>
                )}
                {selected.transferred_to_whatsapp && (
                  <Badge className="bg-green-100 text-green-700 text-xs gap-1">
                    <ArrowRight className="h-3 w-3" />Transferido a WhatsApp
                  </Badge>
                )}
              </div>
            )}
          </DialogHeader>

          {/* Chat replay */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50">
            {selected?.messages.map((msg, i) => {
              const displayText = msg.content.replace(/\[WHATSAPP:.+?\]/g, '').trim()
              return (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-3.5 py-2.5 text-sm ${
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white rounded-2xl rounded-br-sm'
                      : 'bg-white text-gray-800 rounded-2xl rounded-bl-sm border shadow-sm'
                  }`}>
                    <p className="whitespace-pre-line leading-relaxed text-[13px]">{displayText}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t shrink-0 flex items-center justify-between text-xs text-muted-foreground">
            <span>{selected?.message_count} mensajes — {selected && formatDateTime(selected.created_at)}</span>
            <div className="flex items-center gap-2">
              {selected?.lead_phone && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1"
                  onClick={() => {
                    const digits = selected.lead_phone!.replace(/\D/g, '')
                    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(`Hola! Te comparto el link de nuestra asesora virtual Valentina para que te atienda al instante 👇\n${chatUrl}`)}`, '_blank')
                  }}
                >
                  <Share2 className="h-3 w-3" />Enviar Valentina
                </Button>
              )}
              {(selected?.lead_phone || selected?.lead_email) && (
                <a
                  href={`https://wa.me/${selected?.lead_phone?.replace(/\D/g, '') || ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="sm" variant="outline" className="text-xs gap-1">
                    <ExternalLink className="h-3 w-3" />Contactar
                  </Button>
                </a>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
