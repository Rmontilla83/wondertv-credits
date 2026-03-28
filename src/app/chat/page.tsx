'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

const WA_NUMBER = '584248488722'
const WA_LINK = `https://wa.me/${WA_NUMBER}`

type Message = {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const leadSaved = useRef(false)

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  useEffect(scrollToBottom, [messages, loading])

  useEffect(() => {
    if (leadSaved.current || messages.length < 4) return
    const fullText = messages.map(m => m.content).join(' ')
    const emailMatch = fullText.match(/[\w.-]+@[\w.-]+\.\w+/)
    const phoneMatch = fullText.match(/(?:\+?\d{1,3}[\s-]?)?\(?\d{3,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/)
    if (emailMatch || phoneMatch) {
      leadSaved.current = true
      const supabase = createClient()
      supabase.from('leads').insert({
        email: emailMatch?.[0] || null,
        phone: phoneMatch?.[0] || null,
        source: 'chatbot-ai',
      }).then(() => {})
    }
  }, [messages])

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')
    setStarted(true)

    const newMessages: Message[] = [...messages, { role: 'user', content: msg }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await resp.json()
      setMessages([...newMessages, { role: 'assistant', content: data.text || 'Disculpa, hubo un error. Puedes escribirnos por WhatsApp.' }])
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Problema de conexion. Escribenos por WhatsApp al +58 424-8488722.' }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const quickOptions = [
    { label: 'Planes y precios', icon: '💰', msg: 'Hola, quiero saber los planes y precios' },
    { label: 'Como instalar', icon: '📲', msg: 'Como instalo la app?' },
    { label: 'Formas de pago', icon: '💳', msg: 'Cuales son los metodos de pago?' },
    { label: 'Que es Wonder TV?', icon: '📺', msg: 'Que es Wonder TV y que incluye?' },
    { label: 'Quiero activar!', icon: '🚀', msg: 'Quiero activar una cuenta' },
    { label: 'Renovar servicio', icon: '🔄', msg: 'Necesito renovar mi cuenta' },
  ]

  return (
    <div className="h-dvh flex flex-col bg-[#0a0a1a] overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="relative shrink-0 backdrop-blur-xl bg-white/5 border-b border-white/10 px-4 py-3 flex items-center gap-3 z-10">
        <div className="relative">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-[2px]">
            <div className="w-full h-full rounded-full bg-[#0a0a1a] flex items-center justify-center overflow-hidden">
              <Image src="/logo-small.png" alt="" width={36} height={36} className="rounded-full" />
            </div>
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-[2.5px] border-[#0a0a1a]" />
        </div>
        <div className="flex-1">
          <p className="text-white text-sm font-semibold tracking-tight">Valentina</p>
          <p className="text-emerald-400 text-[11px] font-medium">Asesora Wonder TV (FLUJO)</p>
        </div>
        <a
          href={`${WA_LINK}?text=${encodeURIComponent('Hola, me interesa Wonder TV (FLUJO)')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 pl-3 pr-3.5 py-2 rounded-full text-xs font-semibold transition-all border border-emerald-500/20"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.614-1.467A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-2.169 0-4.189-.614-5.916-1.677l-.424-.26-2.742.872.876-2.679-.28-.44A9.777 9.777 0 012.182 12c0-5.414 4.404-9.818 9.818-9.818S21.818 6.586 21.818 12s-4.404 9.818-9.818 9.818z"/></svg>
          WhatsApp
        </a>
      </div>

      {/* Messages */}
      <div className="relative flex-1 overflow-y-auto px-4 py-5 space-y-4 z-10">
        {/* Welcome */}
        {!started && (
          <div className="flex flex-col items-center justify-center h-full gap-5 -mt-4 animate-in fade-in duration-500">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-full blur-2xl scale-150" />
              <Image src="/logo.png" alt="Wonder TV" width={200} height={200} className="relative w-28 h-auto drop-shadow-2xl" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-white text-xl font-bold tracking-tight">Hola, soy Valentina 👋</h2>
              <p className="text-gray-400 text-sm max-w-[280px] leading-relaxed">
                Tu asesora personal de Wonder TV (FLUJO). Preguntame lo que necesites.
              </p>
            </div>

            {/* Trust badges */}
            <div className="flex gap-3 text-[10px] text-gray-500 font-medium">
              <span className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                <span className="text-emerald-400">✓</span> 900+ canales
              </span>
              <span className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                <span className="text-emerald-400">✓</span> 3 pantallas
              </span>
              <span className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                <span className="text-emerald-400">✓</span> Desde $4.97/mes
              </span>
            </div>

            {/* Quick options grid */}
            <div className="grid grid-cols-2 gap-2 w-full max-w-sm mt-2">
              {quickOptions.map((opt) => (
                <button
                  key={opt.msg}
                  onClick={() => sendMessage(opt.msg)}
                  className="flex items-center gap-2.5 bg-white/5 hover:bg-purple-600/20 text-gray-300 hover:text-white px-4 py-3 rounded-xl transition-all text-left border border-white/5 hover:border-purple-500/30 group"
                >
                  <span className="text-lg group-hover:scale-110 transition-transform">{opt.icon}</span>
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              ))}
            </div>

            <p className="text-gray-600 text-[10px] mt-2">Respuesta inmediata 24/7</p>
          </div>
        )}

        {/* Chat messages */}
        {messages.map((msg, i) => {
          // Parse WhatsApp handoff marker from bot messages
          const waMatch = msg.role === 'assistant' ? msg.content.match(/\[WHATSAPP:(.+?)\]/) : null
          const displayText = waMatch ? msg.content.replace(/\[WHATSAPP:.+?\]/, '').trim() : msg.content
          const waMessage = waMatch ? waMatch[1].trim() : null

          return (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shrink-0 mr-2 mt-1 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">V</span>
                </div>
              )}
              <div className={`max-w-[80%] ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-2xl rounded-br-md shadow-lg shadow-purple-500/10'
                  : 'bg-white/8 backdrop-blur-sm text-gray-100 rounded-2xl rounded-bl-md border border-white/10'
              } px-4 py-3`}>
                <p className="text-[13.5px] whitespace-pre-line leading-relaxed">{displayText}</p>
                {waMessage && (
                  <a
                    href={`${WA_LINK}?text=${encodeURIComponent(waMessage)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 mt-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 text-sm"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.614-1.467A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-2.169 0-4.189-.614-5.916-1.677l-.424-.26-2.742.872.876-2.679-.28-.44A9.777 9.777 0 012.182 12c0-5.414 4.404-9.818 9.818-9.818S21.818 6.586 21.818 12s-4.404 9.818-9.818 9.818z"/></svg>
                    Continuar por WhatsApp
                  </a>
                )}
              </div>
            </div>
          )
        })}

        {/* Typing */}
        {loading && (
          <div className="flex justify-start animate-in fade-in duration-200">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shrink-0 mr-2 mt-1 flex items-center justify-center">
              <span className="text-white text-xs font-bold">V</span>
            </div>
            <div className="bg-white/8 backdrop-blur-sm rounded-2xl rounded-bl-md border border-white/10 px-4 py-3">
              <div className="flex gap-1.5 items-center">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="relative shrink-0 z-10">
        {/* Quick suggestions */}
        {started && !loading && messages.length > 0 && messages.length < 8 && (
          <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
            {quickOptions.slice(0, 4).map((opt) => (
              <button
                key={opt.msg}
                onClick={() => sendMessage(opt.msg)}
                className="text-[11px] bg-white/5 text-gray-500 hover:text-purple-400 px-3 py-1.5 rounded-full whitespace-nowrap border border-white/5 hover:border-purple-500/30 transition-colors"
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
        )}

        <div className="backdrop-blur-xl bg-white/5 border-t border-white/10 px-3 py-3">
          <form onSubmit={(e) => { e.preventDefault(); sendMessage() }} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu mensaje..."
              className="flex-1 bg-white/8 text-white rounded-2xl px-4 py-3 text-sm border border-white/10 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/20 placeholder:text-gray-600 transition-all"
              disabled={loading}
              autoFocus
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-600 text-white rounded-2xl w-12 h-12 flex items-center justify-center transition-all shadow-lg shadow-purple-500/20 disabled:shadow-none"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </form>
          <p className="text-center text-[10px] text-gray-700 mt-2">Wonder TV (FLUJO) — Atencion 24/7</p>
        </div>
      </div>
    </div>
  )
}
