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

  // Try to extract and save lead data from conversation
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
      const botText = data.text || data.error || 'Lo siento, hubo un error. Escribenos por WhatsApp.'

      setMessages([...newMessages, { role: 'assistant', content: botText }])
    } catch {
      setMessages([...newMessages, {
        role: 'assistant',
        content: 'Disculpa, tuve un problema de conexion. Puedes escribirnos directo por WhatsApp al +58 424-8488722 y te atendemos al instante.',
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const quickOptions = [
    { label: '💰 Planes y precios', msg: 'Hola, quiero saber los planes y precios' },
    { label: '📲 Como instalar', msg: 'Como instalo la app en mi dispositivo?' },
    { label: '💳 Metodos de pago', msg: 'Cuales son los metodos de pago?' },
    { label: '📺 Que es Wonder TV?', msg: 'Que es Wonder TV y que ofrece?' },
  ]

  return (
    <div className="h-dvh flex flex-col bg-gray-950">
      {/* Header */}
      <div className="shrink-0 bg-gradient-to-r from-indigo-950 to-purple-950 px-4 py-3 flex items-center gap-3 shadow-lg">
        <div className="relative">
          <Image src="/logo-small.png" alt="" width={40} height={40} className="rounded-full" />
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-indigo-950" />
        </div>
        <div className="flex-1">
          <p className="text-white text-sm font-semibold">Ana - Wonder TV</p>
          <p className="text-green-400 text-xs">En linea</p>
        </div>
        <a
          href={`${WA_LINK}?text=${encodeURIComponent('Hola, me interesa Wonder TV (FLUJO)')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-green-500/20 text-green-400 px-3 py-1.5 rounded-full text-xs font-medium hover:bg-green-500/30 transition-colors flex items-center gap-1.5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.614-1.467A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-2.169 0-4.189-.614-5.916-1.677l-.424-.26-2.742.872.876-2.679-.28-.44A9.777 9.777 0 012.182 12c0-5.414 4.404-9.818 9.818-9.818S21.818 6.586 21.818 12s-4.404 9.818-9.818 9.818z"/></svg>
          WhatsApp
        </a>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Welcome if not started */}
        {!started && (
          <div className="flex flex-col items-center justify-center h-full gap-6 -mt-8">
            <Image src="/logo.png" alt="Wonder TV" width={200} height={200} className="w-32 h-auto opacity-80" />
            <div className="text-center">
              <h2 className="text-white text-lg font-semibold">Hola! Soy Ana 👋</h2>
              <p className="text-gray-400 text-sm mt-1 max-w-xs">Asesora de Wonder TV (FLUJO). Preguntame lo que necesites sobre nuestro servicio de IPTV.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-sm">
              {quickOptions.map((opt) => (
                <button
                  key={opt.msg}
                  onClick={() => sendMessage(opt.msg)}
                  className="text-xs bg-gray-800 hover:bg-purple-600 text-gray-300 hover:text-white px-4 py-2.5 rounded-2xl transition-all font-medium border border-gray-700 hover:border-purple-500"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat messages */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${
              msg.role === 'user'
                ? 'bg-purple-600 text-white rounded-2xl rounded-br-sm'
                : 'bg-gray-800 text-gray-100 rounded-2xl rounded-bl-sm'
            } px-4 py-3`}>
              <p className="text-sm whitespace-pre-line leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1.5 items-center">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="text-xs text-gray-500 ml-2">Ana esta escribiendo...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-gray-800 bg-gray-900 px-3 py-3">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage() }} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu mensaje..."
            className="flex-1 bg-gray-800 text-white rounded-2xl px-4 py-3 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none placeholder:text-gray-500"
            disabled={loading}
            autoFocus
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-2xl px-5 py-3 font-medium text-sm transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </form>

        {/* Quick suggestions after conversation started */}
        {started && !loading && messages.length > 0 && messages.length < 6 && (
          <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
            {quickOptions.map((opt) => (
              <button
                key={opt.msg}
                onClick={() => sendMessage(opt.msg)}
                className="text-[11px] bg-gray-800/50 text-gray-400 px-3 py-1.5 rounded-full whitespace-nowrap border border-gray-800 hover:border-purple-600 hover:text-purple-400 transition-colors"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
