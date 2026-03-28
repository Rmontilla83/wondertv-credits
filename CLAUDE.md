@AGENTS.md

# Wonder TV Credits - Guia del Proyecto

## Que es
App de control de creditos IPTV para el revendedor **Wonderclass** (Rafael Montilla). Gestiona clientes, ventas, finanzas, campanas de email, chatbot de ventas y sincronizacion con el portal **Flujo TV** (`vip.flujotv.net`).

## Stack
- **Next.js 16** + React 19 + TypeScript
- **Supabase** (auth, Postgres, RLS)
- **Tailwind CSS 4** + shadcn/ui
- **Resend** (email campaigns)
- **Anthropic SDK** (chatbot IA "Valentina" con Claude Haiku)
- Deploy en **Vercel**

## Flujo principal de negocio

```
1. Admin compra creditos al proveedor → credit_purchases
2. Operador recarga clientes en el portal Flujo TV
3. Sync automatico detecta Δ creditos → crea credit_assignment (pending)
4. Operador completa el pago (metodo, monto, referencia) → payment_status = completed
5. Dashboard muestra finanzas en tiempo real
```

## Sync con Flujo TV

El sync llama a la API de Flujo TV server-side con firma RSA+HMAC generada dinamicamente (reverse-engineered del frontend). Solo necesita el token de sesion (`FLUJO_TOKEN` en `.env.local`).

- **Endpoint**: `POST /api/sync/flujo` (Server-Sent Events para progreso en tiempo real)
- Descarga todas las paginas en paralelo (batches de 4)
- Detecta diferencias en `flujo_credits`: si subio → crea venta pendiente automaticamente
- La firma (`x-sign`) se genera por request: UUID + RSA encrypt + HMAC-SHA256
- Clave publica RSA hardcoded (extraida del bundle `umi.js` de Flujo TV)
- Preserva phone/email editados manualmente (no sobreescribe con datos del remark)
- Registra cada sync en tabla `sync_logs` (status, duracion, conteos, errores)

## Chatbot "Valentina" (/chat)

Agente IA de ventas powered by Claude Haiku. Pagina publica sin auth.

- **Personalidad**: asesora de ventas, amable, persuasiva, NUNCA revela que es IA
- **Conocimiento**: planes/precios, instalacion por dispositivo, metodos de pago, compatibilidad
- **Formato**: texto plano (NO usa markdown **bold**), MAYUSCULAS para enfasis
- **Flujo de venta**: recopila datos → da info de pago → espera confirmacion de pago → transfiere a WhatsApp con boton + datos pre-escritos
- **Transferencia a WhatsApp**: solo cuando el cliente ya pago, tiene problema tecnico, o pide humano. Usa marcador `[WHATSAPP:mensaje]` que el frontend convierte en boton verde
- **Captura de leads**: extrae email/telefono/nombre SOLO de mensajes del usuario (no del bot)
- **Conversaciones guardadas**: cada chat se almacena en `chat_conversations` con datos del lead

### Estrategia de precios (en el bot y plantillas de email)

| Plan | Precio | Original | Descuento | Meses |
|------|--------|----------|-----------|-------|
| Mensual | $7.65 | $9.00 | 15% | 1 |
| Trimestral | $22.95 | $27.00 | 15% | 3 |
| Semestral | $39.20 | $49.00 | 20% | 6 + 1 GRATIS = 7 |
| Anual | $69.60 | $87.00 | 20% | 12 + 2 GRATIS = 14 |

## Campanas de email (/dashboard/campaigns)

Envio de emails via Resend con 4 tipos predefinidos:
- **Recordatorio de vencimiento**: clientes por vencer en 7/14/30 dias
- **Reactivacion**: clientes inactivos/expirados
- **Promocion/Ventas**: tabla de precios visual con los 4 planes IPTV (FLUJO)
- **Bienvenida**: nuevos clientes

Editor full-page con:
- Panel izquierdo: segmento, asunto, contenido (tabs Preview/HTML)
- Panel derecho: destinatarios editables, agregar individual, pegado masivo
- Segmento "Vacio" para campanas a listas externas
- Templates con logo Wonder TV, boton verde "Escribenos ahora" → /chat
- Historial de campanas enviadas con contadores

## Estructura de paginas

| Ruta | Funcion | Rol |
|------|---------|-----|
| `/dashboard` | KPIs, ventas pendientes, graficas, actividad | Todos |
| `/dashboard/clients` | Tabla de clientes (orden portal Flujo TV) | Todos |
| `/dashboard/clients/[id]` | Detalle + historial + ventas pendientes | Todos |
| `/dashboard/credits` | Pool de creditos comprados | Todos |
| `/dashboard/credits/new` | Registrar compra al proveedor | Admin |
| `/dashboard/campaigns` | Campanas de email (4 tipos + editor) | Todos |
| `/dashboard/conversations` | Historial de chats del bot | Todos |
| `/dashboard/expiring` | Clientes por vencer | Todos |
| `/dashboard/financials` | Reportes P&L, margenes, burn rate | Todos |
| `/dashboard/sync` | Sync con Flujo TV (progreso real-time + historial) | Admin |
| `/dashboard/settings` | Usuarios, tasas de cambio | Admin |
| `/chat` | Chatbot publico "Valentina" (sin auth) | Publico |
| `/guia-operador.html` | Guia HTML completa para operadores (publica) | Publico |

**Eliminadas**: `/dashboard/assignments` (reemplazada por auto-deteccion en sync)

## Tablas principales (Supabase)

### clients
Sincronizada desde Flujo TV. Campos clave: `flujo_cust_id`, `flujo_login`, `flujo_credits`, `flujo_start_date`, `flujo_end_date`, `country`, `device_info` (login/password), `name`, `phone`, `email` (parseados del remark, pero edicion manual tiene prioridad), `notes` (remark original).

### credit_purchases
Compras de creditos al proveedor: `quantity`, `total_cost_usd`, `cost_per_credit` (generated), `payment_method`, `payment_reference`.

### credit_assignments
Ventas/cortesias a clientes. Campo clave: `payment_status` ('pending' | 'completed').
- **pending**: auto-creado por sync cuando detecta Δ creditos
- **completed**: operador completo el pago o marco como cortesia
- Campos de pago: `payment_method`, `payment_amount_usd`, `payment_reference`, `payment_amount_bss`, `exchange_rate`
- Campos de cortesia: `is_courtesy`, `courtesy_reason`

### campaigns
Campanas de email: `type` (expiring|reactivation|promotion|welcome), `status` (draft|sending|sent|failed), `subject`, `html_content`, `segment`, `total_recipients`, `sent_count`, `failed_count`.

### campaign_emails
Log por email enviado: `campaign_id`, `client_id`, `email`, `status` (sent|failed), `resend_id`, `error_message`.

### chat_conversations
Conversaciones del chatbot: `messages` (JSONB), `lead_name`, `lead_email`, `lead_phone`, `plan_interest`, `transferred_to_whatsapp`, `message_count`.

### leads
Prospectos capturados: `name`, `email`, `phone`, `source` (chatbot-ai), `plan_interest`.

### sync_logs
Historial de syncs: `status` (success|failed|partial), `total_processed`, `created`, `updated`, `errors`, `pending_sales`, `duration_ms`, `error_message`.

### Views
- `credit_balance`: total_purchased - total_assigned = available_credits
- `monthly_financial_summary`: revenue, assignments, avg ticket por mes
- `monthly_profitability`: cost vs revenue vs profit por mes

## Metodos de pago
- `banesco_bss` - Bolivares (requiere monto BSS + tasa de cambio)
- `zelle` - USD via Bank of America (pagos@wondertv.live / 4Ward Studio LLC)
- `paypal` - USD via PayPal (wondertvpagos@gmail.com)
- Pago Movil Venezuela: 0412-3947257, Banesco 0134, RIF J-297755527

## Roles
- **admin**: todo (compras, sync, settings, usuarios, campanas)
- **operator**: clientes, completar ventas, ver reportes, campanas
- **viewer**: solo lectura

## Archivos clave

| Archivo | Funcion |
|---------|---------|
| `src/app/api/sync/flujo/route.ts` | Sync SSE con firma RSA dinamica + deteccion Δ creditos |
| `src/app/api/chat/route.ts` | API del chatbot (Claude Haiku + system prompt completo) |
| `src/app/api/campaigns/send/route.ts` | Envio de emails via Resend |
| `src/app/chat/page.tsx` | UI del chatbot publico "Valentina" |
| `src/app/dashboard/campaigns/page.tsx` | Editor de campanas + templates de email |
| `src/app/dashboard/conversations/page.tsx` | Historial de conversaciones del bot |
| `src/components/forms/CompleteSaleForm.tsx` | Completar venta pendiente |
| `src/components/forms/QuickRechargeForm.tsx` | Recarga manual rapida |
| `src/lib/utils.ts` | Formateo + `daysUntilExpiration()` (fuente unica de calculo) |
| `src/lib/types.ts` | Interfaces TypeScript |
| `src/lib/constants.ts` | Labels, segmentos, tipos de campana |

## Variables de entorno (.env.local + Vercel)
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FLUJO_TOKEN` - Token de sesion de Flujo TV (actualizar cuando expire)
- `ANTHROPIC_API_KEY` - Claude API para chatbot Valentina
- `RESEND_API_KEY` - Resend para campanas de email
- `FROM_EMAIL` - Remitente de emails (Wonder TV <flujo@wondertv.live>)

## Filtros de clientes
La tabla de clientes tiene 5 filtros: Todos, Activos, Inactivos, Por vencer (7 dias), Expirados.
- "Por vencer" = activos con flujo_end_date dentro de 7 dias
- "Expirados" = inactivos + cualquier cliente con dias <= 0
- La pagina de vencimientos muestra TODOS los clientes con fecha (activos e inactivos), no solo activos
- Campanas solo envian a clientes con email (muchos inactivos no tienen email en el remark)

## Convenciones
- Espanol en la UI, ingles en codigo
- Supabase service role key para API routes (server-side)
- RLS con funcion `get_my_role()` para evitar recursion
- Migraciones en `supabase/migration*.sql` (v1 a v8)
- Calculo de vencimientos centralizado en `daysUntilExpiration()` (utils.ts)
- Sync preserva phone/email editados manualmente (no sobreescribe)
- Chatbot: datos del lead se extraen SOLO de mensajes del usuario, no del bot
- Chatbot: NO usa markdown ** (texto plano, MAYUSCULAS para enfasis)
- Chatbot: transfiere a WhatsApp SOLO cuando el cliente ya pago o pide humano
- Emails: boton verde unico "Escribenos ahora" → /chat (no expone WhatsApp)
- WhatsApp del operador: +58 424-8488722 (solo se revela via el chatbot tras recopilar datos)
