'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

const WA_NUMBER = '584248488722'
const WA_LINK = `https://wa.me/${WA_NUMBER}`

type Message = {
  id: number
  from: 'bot' | 'user'
  text?: string
  html?: string
  options?: { label: string; value: string; icon?: string }[]
  input?: 'name' | 'email' | 'phone' | 'plan' | 'username' | 'password'
}

const PLANS = [
  { name: 'Mensual', months: '1 mes', price: '$7.65', original: '$9.00', badge: '15% OFF', badgeColor: '#22c55e', extra: '' },
  { name: 'Trimestral', months: '3 meses', price: '$22.95', original: '$27.00', badge: '15% OFF', badgeColor: '#22c55e', extra: '$7.65/mes' },
  { name: 'Semestral', months: '6 + 1 GRATIS', price: '$39.20', original: '$49.00', badge: 'POPULAR', badgeColor: '#3b82f6', extra: '$5.60/mes - Ahorras 31%' },
  { name: 'Anual', months: '12 + 2 GRATIS', price: '$69.60', original: '$87.00', badge: 'MEJOR VALOR', badgeColor: '#9333ea', extra: '$4.97/mes - Ahorras 31%' },
]

const DEVICES = [
  { label: 'Fire TV Stick', value: 'firestick', icon: '🔥' },
  { label: 'Chromecast con Google TV', value: 'chromecast', icon: '📡' },
  { label: 'TV Box Android', value: 'tvbox', icon: '📦' },
  { label: 'Smart TV Android', value: 'smarttv', icon: '📺' },
  { label: 'Telefono/Tablet Android', value: 'android', icon: '📱' },
]

const INSTALL_GUIDES: Record<string, string> = {
  firestick: `<b>📺 Instalacion en Fire TV Stick</b>

<b>⚠️ Primero desbloquea el modo desarrollador:</b>
1️⃣ Ve a Menu > Mi Fire TV > Acerca de
2️⃣ Presiona el nombre del dispositivo <b>7 veces</b>
3️⃣ Veras "Ahora eres desarrollador" ✅

<b>🔧 Instalacion:</b>
1. Ve a <b>Configuracion > Mi Fire TV > Opciones para desarrolladores</b>
2. Activa ✅ <b>Depurado ADB</b> y ✅ <b>Apps de origen desconocido</b>
3. En el buscador del Fire TV escribe <b>Downloader</b>, descargalo e instalalo
4. Abre Downloader, en la barra coloca: <b>5868166</b> y presiona "Go"
5. Se descargara la app, instalala e ingresa tus datos. ¡Listo! 🎬`,

  chromecast: `<b>📺 Instalacion en Chromecast con Google TV</b>

1️⃣ Ve a <b>Configuracion > Sistema > Acerca de > Compilacion de ISO</b>
   Presiona <b>5 veces</b> para activar modo desarrollador 🛠️

2️⃣ Ve a <b>Configuracion > Apps > Seguridad y restricciones</b>
   Activa ✅ <b>Fuentes desconocidas</b>

3️⃣ Abre la tienda y descarga <b>Downloader</b>

4️⃣ Abre Downloader, en "Enter URL" coloca: <b>5868166</b>
   Presiona "Go" y sigue los pasos ✅

📝 Abre la app, ingresa tus datos ¡y listo! 🚀`,

  tvbox: `<b>📺 Instalacion en TV Box Android</b>

1️⃣ Ve a <b>Configuracion > Opciones de desarrollador</b>
2️⃣ Activa ✅ <b>Depurado ADB</b>
3️⃣ Activa ✅ <b>Apps de origen desconocido</b>

📥 Abre la Tienda de Apps y busca <b>Downloader</b>, descargalo e instalalo

🔗 Abre Downloader, en "Enter URL" coloca: <b>5868166</b>
   Presiona "GO" 🚀

📲 Se descargara la app. Abrela e ingresa tus datos ¡y listo!`,

  smarttv: `<b>📺 Instalacion en Smart TV con Android TV</b>

El proceso es igual al TV Box Android:

1️⃣ <b>Configuracion > Opciones de desarrollador</b>
2️⃣ Activa ✅ <b>Depurado ADB</b> y ✅ <b>Fuentes desconocidas</b>
3️⃣ Descarga <b>Downloader</b> desde la tienda
4️⃣ Abre Downloader, coloca: <b>5868166</b> y presiona "Go"
5️⃣ Instala la app e ingresa tus datos ✅`,

  android: `<b>📱 Instalacion en Telefono/Tablet Android</b>

1️⃣ Abre el navegador de tu telefono
2️⃣ Ve a la pagina de descarga (te la enviamos por WhatsApp)
3️⃣ Descarga e instala la APK
4️⃣ Abre la app e ingresa tu usuario y clave

⚠️ Si te pide permiso para instalar apps de origen desconocido, activalo en Configuracion.`,
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [typing, setTyping] = useState(false)
  const [leadData, setLeadData] = useState<Record<string, string>>({})
  const [inputValue, setInputValue] = useState('')
  const [currentInput, setCurrentInput] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  let msgId = useRef(0)

  const nextId = () => ++msgId.current

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const addBotMessage = (msg: Partial<Message>, delay = 600) => {
    setTyping(true)
    scrollToBottom()
    setTimeout(() => {
      setTyping(false)
      setMessages(prev => [...prev, { id: nextId(), from: 'bot', ...msg } as Message])
      scrollToBottom()
    }, delay)
  }

  const addUserMessage = (text: string) => {
    setMessages(prev => [...prev, { id: nextId(), from: 'user', text }])
    scrollToBottom()
  }

  // Initial greeting
  useEffect(() => {
    setTimeout(() => {
      setMessages([{
        id: nextId(),
        from: 'bot',
        text: '¡Hola! 👋 Soy el asistente virtual de Wonder TV (FLUJO). ¿En que puedo ayudarte?',
        options: mainMenu(),
      }])
    }, 500)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function mainMenu() {
    return [
      { label: '💰 Planes y precios', value: 'prices' },
      { label: '📲 Como instalar la app', value: 'install' },
      { label: '💳 Metodos de pago', value: 'payment' },
      { label: '📺 Dispositivos compatibles', value: 'devices' },
      { label: '❓ Que es Wonder TV?', value: 'about' },
      { label: '🔑 Activar mi cuenta', value: 'activate' },
      { label: '🔄 Renovar mi cuenta', value: 'renew' },
      { label: '💬 Hablar con un asesor', value: 'human' },
    ]
  }

  const handleOption = (value: string) => {
    switch (value) {
      case 'prices':
        addUserMessage('Planes y precios')
        addBotMessage({
          html: `<div style="margin-bottom:8px"><b>📺 Planes IPTV (FLUJO)</b></div>` +
            PLANS.map(p =>
              `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin:6px 0">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <div>
                    <span style="background:${p.badgeColor};color:white;font-size:10px;padding:2px 6px;border-radius:10px;font-weight:bold">${p.badge}</span>
                    <div style="font-weight:bold;margin-top:4px">${p.name}</div>
                    <div style="font-size:12px;color:#64748b">${p.months}</div>
                  </div>
                  <div style="text-align:right">
                    <div style="font-size:22px;font-weight:900;color:#7c3aed">${p.price}</div>
                    <div style="font-size:11px;color:#94a3b8;text-decoration:line-through">${p.original}</div>
                    ${p.extra ? `<div style="font-size:10px;color:#22c55e;font-weight:600">${p.extra}</div>` : ''}
                  </div>
                </div>
              </div>`
            ).join('') +
            `<div style="margin-top:10px;font-size:13px;color:#64748b">💳 Metodos: Zelle, PayPal, Pago Movil</div>
             <div style="font-size:13px;color:#64748b">📱 Hasta 3 pantallas simultaneas</div>`,
          options: [
            { label: '🔑 Quiero activar!', value: 'activate' },
            { label: '💬 Hablar con asesor', value: 'human' },
            { label: '⬅️ Menu principal', value: 'menu' },
          ],
        })
        break

      case 'install':
        addUserMessage('Como instalar la app')
        addBotMessage({
          text: '¿En que dispositivo quieres instalar Wonder TV (FLUJO)?',
          options: [
            ...DEVICES.map(d => ({ label: `${d.icon} ${d.label}`, value: `guide_${d.value}` })),
            { label: '⬅️ Menu principal', value: 'menu' },
          ],
        })
        break

      case 'payment':
        addUserMessage('Metodos de pago')
        addBotMessage({
          html: `<b>💳 Metodos de pago disponibles:</b>

<div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:10px;padding:12px;margin:8px 0">
<b>💵 Zelle</b>
📧 <b>pagos@wondertv.live</b>
🏢 4Ward Studio LLC
</div>

<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:12px;margin:8px 0">
<b>💵 PayPal</b>
📧 <b>wondertvpagos@gmail.com</b>
</div>

<div style="background:#fefce8;border:1px solid #fde047;border-radius:10px;padding:12px;margin:8px 0">
<b>💵 Pago Movil Venezuela</b>
📱 <b>0412-3947257</b>
🏦 Banesco (0134)
🆔 RIF: J-297755527
</div>

<div style="font-size:12px;color:#64748b;margin-top:8px">Una vez realizado el pago, envia el capture del comprobante por WhatsApp ⚡</div>`,
          options: [
            { label: '🔑 Activar mi cuenta', value: 'activate' },
            { label: '⬅️ Menu principal', value: 'menu' },
          ],
        })
        break

      case 'devices':
        addUserMessage('Dispositivos compatibles')
        addBotMessage({
          html: `<b>📺 Wonder TV (FLUJO) es compatible con:</b>

✅ Fire TV Stick
✅ Google Chromecast con Google TV
✅ TV Box Android
✅ Smart TV con Android TV
✅ Telefono/Tablet Android

⛔ <b>No compatible con Roku</b>

📱 Hasta <b>3 pantallas simultaneas</b> por cuenta`,
          options: [
            { label: '📲 Ver guia de instalacion', value: 'install' },
            { label: '⬅️ Menu principal', value: 'menu' },
          ],
        })
        break

      case 'about':
        addUserMessage('Que es Wonder TV?')
        addBotMessage({
          html: `<b>📺 Wonder TV (FLUJO)</b> es una plataforma de television por streaming 🔥

✅ Mas de <b>900 canales en vivo</b> (deportes, peliculas, noticias, infantiles, internacionales)
🎬 Miles de <b>series y peliculas</b> (Netflix, Prime, Disney+ y mas)
📱 Funciona en <b>Android, Fire Stick, TV Box, Smart TV, Chromecast</b>
👨‍👩‍👧‍👦 Hasta <b>3 pantallas simultaneas</b> por cuenta
💸 Planes desde <b>$7.65 al mes</b>

🔞 Seccion adultos disponible (clave: <b>1234</b>)

⚠️ Actualmente no ofrecemos demo gratuito, pero garantizamos un servicio de calidad con soporte directo ✅`,
          options: [
            { label: '💰 Ver planes', value: 'prices' },
            { label: '⬅️ Menu principal', value: 'menu' },
          ],
        })
        break

      case 'activate':
        addUserMessage('Activar mi cuenta')
        addBotMessage({
          text: '¡Genial! 🎉 Para activar tu cuenta necesito algunos datos. Empecemos con tu nombre completo:',
        })
        setCurrentInput('name')
        setTimeout(() => inputRef.current?.focus(), 700)
        break

      case 'renew':
        addUserMessage('Renovar mi cuenta')
        addBotMessage({
          html: `<b>🔄 Renovacion de cuenta</b>

Tu cuenta de Wonder TV (FLUJO) puede estar por vencer o ya vencio. Para renovar:

1️⃣ Elige tu plan (mensual, trimestral, semestral o anual)
2️⃣ Realiza el pago por Zelle, PayPal o Pago Movil
3️⃣ Envianos el comprobante por WhatsApp

¡Y listo! Tu cuenta se reactiva al instante ⚡`,
          options: [
            { label: '💰 Ver planes', value: 'prices' },
            { label: '💬 WhatsApp para renovar', value: 'human' },
            { label: '⬅️ Menu principal', value: 'menu' },
          ],
        })
        break

      case 'human':
        addUserMessage('Hablar con un asesor')
        addBotMessage({
          html: `<b>💬 ¡Con gusto te atendemos!</b>

Haz clic en el boton de abajo para hablar directamente con nuestro equipo por WhatsApp:

<a href="${WA_LINK}?text=Hola%2C%20me%20interesa%20Wonder%20TV%20(FLUJO)" target="_blank" style="display:inline-block;background:#25D366;color:white;font-weight:bold;padding:14px 28px;border-radius:50px;text-decoration:none;margin:12px 0;font-size:16px;box-shadow:0 4px 12px rgba(37,211,102,0.3)">📲 Abrir WhatsApp</a>

<div style="font-size:12px;color:#64748b;margin-top:4px">+58 424-8488722</div>`,
          options: [
            { label: '⬅️ Menu principal', value: 'menu' },
          ],
        })
        break

      case 'menu':
        addBotMessage({
          text: '¿En que mas puedo ayudarte? 😊',
          options: mainMenu(),
        })
        break

      default:
        // Installation guides
        if (value.startsWith('guide_')) {
          const device = value.replace('guide_', '')
          const deviceName = DEVICES.find(d => d.value === device)?.label || device
          addUserMessage(deviceName)
          addBotMessage({
            html: INSTALL_GUIDES[device] || 'Guia no disponible',
            options: [
              { label: '📲 Otra guia', value: 'install' },
              { label: '🔑 Activar mi cuenta', value: 'activate' },
              { label: '⬅️ Menu principal', value: 'menu' },
            ],
          })
        }
        break
    }
  }

  const handleInputSubmit = async () => {
    if (!inputValue.trim() || !currentInput) return
    const val = inputValue.trim()
    addUserMessage(val)
    setInputValue('')

    const newLead = { ...leadData, [currentInput]: val }
    setLeadData(newLead)

    const steps: { field: string; next: string; prompt: string }[] = [
      { field: 'name', next: 'email', prompt: 'Perfecto! Ahora tu correo electronico:' },
      { field: 'email', next: 'phone', prompt: 'Tu numero de telefono (con codigo de pais):' },
      { field: 'phone', next: 'plan', prompt: '¿Que plan te interesa?' },
    ]

    const current = steps.find(s => s.field === currentInput)
    if (current) {
      if (current.next === 'plan') {
        addBotMessage({
          text: current.prompt,
          options: PLANS.map(p => ({
            label: `${p.name} - ${p.price}`,
            value: `plan_${p.name}`,
          })),
        })
        setCurrentInput(null)
      } else {
        addBotMessage({ text: current.prompt })
        setCurrentInput(current.next)
        setTimeout(() => inputRef.current?.focus(), 700)
      }
      return
    }

    // If we reach here with plan selection, it's handled in handleOption
  }

  // Handle plan selection during activation
  const handlePlanSelect = async (planName: string) => {
    addUserMessage(planName)
    const lName = leadData.name || ''
    const lEmail = leadData.email || ''
    const lPhone = leadData.phone || ''

    try {
      const supabase = createClient()
      await supabase.from('leads').insert({
        name: lName || null,
        email: lEmail || null,
        phone: lPhone || null,
        plan_interest: planName,
        source: 'chatbot',
      })
    } catch (e) {
      console.error('Error saving lead:', e)
    }

    const waText = encodeURIComponent(
      `Hola! Quiero activar Wonder TV (FLUJO)\n\nNombre: ${lName}\nEmail: ${lEmail}\nTel: ${lPhone}\nPlan: ${planName}`
    )

    addBotMessage({
      html: `<b>✅ ¡Excelente eleccion!</b>

Tus datos:
👤 <b>${lName}</b>
📧 ${lEmail}
📱 ${lPhone}
📦 Plan: <b>${planName}</b>

Para completar la activacion, contacta a nuestro equipo por WhatsApp con tus datos ya listos:

<a href="${WA_LINK}?text=${waText}" target="_blank" style="display:inline-block;background:#25D366;color:white;font-weight:bold;padding:14px 28px;border-radius:50px;text-decoration:none;margin:12px 0;font-size:16px;box-shadow:0 4px 12px rgba(37,211,102,0.3)">📲 Activar por WhatsApp</a>`,
      options: [
        { label: '⬅️ Menu principal', value: 'menu' },
      ],
    })
  }

  const handleOptionClick = (value: string) => {
    if (value.startsWith('plan_')) {
      handlePlanSelect(value.replace('plan_', ''))
    } else {
      handleOption(value)
    }
  }

  return (
    <div className="h-dvh flex flex-col bg-gray-950">
      {/* Header */}
      <div className="shrink-0 bg-gradient-to-r from-indigo-950 to-purple-950 px-4 py-3 flex items-center gap-3 shadow-lg">
        <Image src="/logo.png" alt="Wonder TV" width={120} height={30} className="h-8 w-auto" />
        <div className="flex-1" />
        <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" />
        <span className="text-xs text-green-400 font-medium">En linea</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${
              msg.from === 'user'
                ? 'bg-purple-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5'
                : 'bg-gray-800 text-gray-100 rounded-2xl rounded-bl-sm px-4 py-3'
            }`}>
              {msg.text && <p className="text-sm whitespace-pre-line">{msg.text}</p>}
              {msg.html && (
                <div
                  className="text-sm [&_b]:font-bold [&_a]:text-green-400 [&_a]:underline"
                  dangerouslySetInnerHTML={{ __html: msg.html }}
                />
              )}
              {msg.options && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {msg.options.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleOptionClick(opt.value)}
                      className="text-xs bg-gray-700/80 hover:bg-purple-600 text-white px-3 py-2 rounded-xl transition-colors font-medium border border-gray-600 hover:border-purple-500"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {typing && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {currentInput && (
        <div className="shrink-0 border-t border-gray-800 bg-gray-900 px-4 py-3">
          <form onSubmit={(e) => { e.preventDefault(); handleInputSubmit() }} className="flex gap-2">
            <input
              ref={inputRef}
              type={currentInput === 'email' ? 'email' : 'text'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                currentInput === 'name' ? 'Tu nombre completo...' :
                currentInput === 'email' ? 'correo@ejemplo.com' :
                currentInput === 'phone' ? '+58 412 1234567' :
                'Escribe aqui...'
              }
              className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-2.5 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none placeholder:text-gray-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-xl px-4 py-2.5 font-medium text-sm transition-colors"
            >
              Enviar
            </button>
          </form>
        </div>
      )}

      {/* WhatsApp floating button */}
      {!currentInput && (
        <div className="shrink-0 border-t border-gray-800 bg-gray-900 px-4 py-3 text-center">
          <a
            href={`${WA_LINK}?text=${encodeURIComponent('Hola, me interesa Wonder TV (FLUJO)')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-3 rounded-full text-sm transition-colors shadow-lg shadow-green-500/20"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.614-1.467A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-2.169 0-4.189-.614-5.916-1.677l-.424-.26-2.742.872.876-2.679-.28-.44A9.777 9.777 0 012.182 12c0-5.414 4.404-9.818 9.818-9.818S21.818 6.586 21.818 12s-4.404 9.818-9.818 9.818z"/></svg>
            Chatea con nosotros
          </a>
          <p className="text-xs text-gray-500 mt-2">+58 424-8488722</p>
        </div>
      )}
    </div>
  )
}
