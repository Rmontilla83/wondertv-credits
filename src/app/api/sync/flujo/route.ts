import crypto from 'crypto'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const FLUJO_API_BASE = 'https://vip.flujotv.net'
const PAGE_SIZE = 30

const RSA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvzyWJvB+8JsET61hLJ8y
sgkZvhw2T1qhZtjKOwult1qaCawuOAS+GJ3bYGmOo9X/Nwfz7BtgOrIAtxZWMfMQ
y/CwkFFiBkuHWFauhPUiMjrBJDEqHlx0KBoEYDQagL23hGBjbdI5+i/Xe1mlLH/o
dnHtFoLTG9JlPmRvh4JfjO+n39VkgtabSW1BeiRvfJTdyi+0UoTOWVNR4RyYPFGC
K2jw14Mk1qm3OkniPRuj3eLaqoC8qUbwXIZ0sWkjc/eNQxQpkzZZi9rtJY5FHQ3F
x25mDBU1qO901LT7gkJLISG4bOwXxpuqf85t+uU4dxbepmESg+kIw3wmvuZycNLp
mwIDAQAB
-----END PUBLIC KEY-----`

interface FlujoAccount {
  cust_id: string
  login_name: string
  password: string
  status: string
  remark: string
  credit: number
  start_date: string
  end_date: string
  country: string
  account_num: number
  revendedor: string
}

interface FlujoPageResponse {
  code: number
  data: {
    data: FlujoAccount[]
    count: number
    page: number
    total_pages: number
  }
  msg: string
}

function generateXSign(path: string, method: string, body?: string): string {
  const key = crypto.randomUUID()
  const time = Math.floor(Date.now() / 1000)
  const plaintext = `version=v1.0.0&key=${key}&time=${time}`
  const secret = crypto.publicEncrypt(
    { key: RSA_PUBLIC_KEY, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(plaintext)
  ).toString('base64')
  const bodyHash = crypto.createHash('sha256').update(body || '').digest('hex')
  const hmacData = [time.toString(), method.toUpperCase(), path, bodyHash].join('\n')
  const hmacHex = crypto.createHmac('sha256', key).update(hmacData).digest('hex')
  const signature = Buffer.from(hmacHex).toString('base64')
  return `key=${key}&secret=${secret}&signature=${signature}`
}

function titleCase(s: string): string {
  const particles = new Set(['de', 'del', 'la', 'el', 'las', 'los', 'y', 'e', 'da'])
  return s.split(' ').map((w, i) => {
    if (!w) return w
    const lower = w.toLowerCase()
    if (i > 0 && particles.has(lower)) return lower
    return lower[0].toUpperCase() + lower.slice(1)
  }).join(' ')
}

function cleanName(raw: string): string {
  let n = raw
  // Strip WhatsApp bold markers
  n = n.replace(/\*/g, '')
  // Remove emails
  n = n.replace(/[\w.-]+@[\w.-]+\.\w+/gi, '')
  // Remove email-like fragments without @ (e.g. "perezjuan8gmail com", "maverde27gmail")
  n = n.replace(/\b\w+\d+\w*gmail\b\s*(com)?/gi, '')
  n = n.replace(/\b\w+@\w+/gi, '')
  // Remove all phone-like patterns
  n = n.replace(/(?:\+?\d{1,3}[\s.-]?)?\(?\d{3,4}\)?[\s./,-]?\d{3,4}[\s./,-]?\d{3,4}/g, '')
  n = n.replace(/\b\d{4}[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/g, '')
  n = n.replace(/\b\d{10,13}\b/g, '')
  // Remove form labels and everything after colon
  n = n.replace(/\b(telf|telef|tel[ée]fono|correo(\s*electr[oó]nico)?|c\.?\s*i\.?|cedula|clave|usuario|contrase[nñ]a|password|monto|tipo\s*de\s*plan|plan|nombre|apellido|nombres|apellidos)\s*:?\s*\S*/gi, '')
  // Remove price patterns
  n = n.replace(/\$\s*\d+[.,]?\d*/g, '')
  n = n.replace(/\b\d+[.,]?\d*\s*\$/g, '')
  n = n.replace(/\b\d+[.,]?\d*\s*(usd|bs|bss)\b/gi, '')
  // Remove plan/time info
  n = n.replace(/\b\d+\s*(mes|meses|año|años|a[ñn]o)\b/gi, '')
  n = n.replace(/\b(mensual|trimestral|semestral|anual|mes|meses|credito|creditos|renovaci[oó]n|renovaci[oó]nes)\b/gi, '')
  // Remove relationship phrases (amigo/prima/esposa de X...)
  n = n.replace(/\b(amigo|amiga|prima|primo|hermano|hermana|esposa|esposo|hijo|hija|novia|novio|cu[ñn]ado|cu[ñn]ada|suegr[oa]s?|mam[aá]|pap[aá]|jefe|vecino|vecina|revendedor)\s+(de\s+)?[\wáéíóúñ]+.*$/gi, '')
  // Remove trailing filler
  n = n.replace(/\b(usa|ve|es|cl|ca|ae|otro|otra|cuenta|segunda|alterna|nueva|personal|detalla|coworking|fire\s*stick)\b\s*$/gi, '')
  // Remove "Para su afiliación..." type form intros
  n = n.replace(/^para\s+su\s+afiliaci[oó]n.*?(nombres?\s*:?\s*)/gi, '')
  // Remove trailing "com" (leftover from email fragments)
  n = n.replace(/\bcom\s*$/gi, '')
  // Remove trailing "tel" / "tlf" / "cel" leftovers
  n = n.replace(/\b(tel|tlf|cel|telf|telef|correo)\s*$/gi, '')
  // Clean separators
  n = n.replace(/[,.\-/|:;()]+/g, ' ').replace(/\s+/g, ' ').trim()
  // Remove trailing single char fragments
  n = n.replace(/\s+\S{1}$/g, '').trim()
  // Title case (handles accents properly)
  n = titleCase(n)
  return n
}

function parseRemark(remark: string): { name: string; phone: string | null; email: string | null } {
  if (!remark) return { name: 'Sin nombre', phone: null, email: null }
  const emailMatch = remark.match(/[\w.-]+@[\w.-]+\.\w+/i)
  const email = emailMatch ? emailMatch[0].replace(/([a-z])([A-Z])/g, '$1.$2').toLowerCase() : null
  const phoneMatch = remark.match(/(?:\+?\d{1,3}[\s-]?)?\(?\d{3,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g)
  const phone = phoneMatch ? phoneMatch[0] : null
  const name = cleanName(remark)
  if (!name) return { name: remark.substring(0, 50), phone, email }
  return { name, phone, email }
}

async function fetchFlujoPage(page: number, token: string): Promise<FlujoPageResponse> {
  const path = `/api/v1/magis/cust/list?page=${page}&pageSize=${PAGE_SIZE}&status=&login_name=&tipo=&ip=&country=&smartCode=&start=&end=&up=&user_id=`
  const xSign = generateXSign(path, 'GET', '')
  const res = await fetch(`${FLUJO_API_BASE}${path}`, {
    headers: {
      'accept': 'application/json',
      'x-lang': 'xby',
      'x-sign': xSign,
      'x-token': token,
      'cookie': `msgistv-token=${token}`,
    },
  })
  if (!res.ok) throw new Error(`Flujo TV API error: ${res.status} ${res.statusText}`)
  return res.json()
}

export async function POST(request: NextRequest) {
  const syncKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-16) ?? ''
  const reqKey = request.headers.get('x-sync-key')
  const isSameOrigin = request.headers.get('origin') === null ||
    request.headers.get('origin') === request.nextUrl.origin

  if (!isSameOrigin && (!reqKey || reqKey !== syncKey)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const token = body.token || process.env.FLUJO_TOKEN
  const syncUserId = body.userId || null

  if (!token) {
    return NextResponse.json(
      { error: 'Falta el token de Flujo TV.' },
      { status: 400 }
    )
  }

  const startTime = Date.now()
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      const adminClient = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      let totalPages = 0
      let totalCount = 0
      let created = 0
      let updated = 0
      let errors = 0
      let pendingSales = 0
      let errorMessage: string | null = null

      // Resolve assigned_by: use provided userId or fallback to first admin
      let assignedBy = syncUserId
      if (!assignedBy) {
        const { data: admin } = await adminClient
          .from('profiles')
          .select('id')
          .eq('role', 'admin')
          .limit(1)
          .single()
        assignedBy = admin?.id || null
      }

      try {
        // Phase 1: Fetch first page
        send('progress', { phase: 'fetching', message: 'Conectando con Flujo TV...', percent: 0 })

        const firstPage = await fetchFlujoPage(1, token)
        if (firstPage.code !== 200) {
          throw new Error(`Token expirado o inválido (código ${firstPage.code})`)
        }

        totalPages = firstPage.data.total_pages
        totalCount = firstPage.data.count
        const allAccounts: FlujoAccount[] = [...firstPage.data.data]

        send('progress', {
          phase: 'fetching',
          message: `Página 1/${totalPages} descargada (${totalCount} clientes)`,
          percent: Math.round((1 / totalPages) * 50),
          pages: totalPages,
          totalClients: totalCount,
        })

        // Phase 2: Fetch remaining pages
        const BATCH_SIZE = 4
        for (let i = 2; i <= totalPages; i += BATCH_SIZE) {
          const batch = []
          for (let p = i; p < i + BATCH_SIZE && p <= totalPages; p++) {
            batch.push(fetchFlujoPage(p, token))
          }
          const results = await Promise.all(batch)
          for (const res of results) {
            if (res.code === 200) allAccounts.push(...res.data.data)
          }
          const fetchedPages = Math.min(i + BATCH_SIZE - 1, totalPages)
          send('progress', {
            phase: 'fetching',
            message: `Página ${fetchedPages}/${totalPages} descargada`,
            percent: Math.round((fetchedPages / totalPages) * 50),
          })
        }

        // Phase 3: Upsert
        send('progress', { phase: 'syncing', message: 'Sincronizando clientes...', percent: 50 })

        for (let idx = 0; idx < allAccounts.length; idx++) {
          const account = allAccounts[idx]
          const { name, phone, email } = parseRemark(account.remark)
          const status = account.status === '1' ? 'active' : 'inactive'

          const { data: existing } = await adminClient
            .from('clients')
            .select('id, flujo_credits, phone, email')
            .eq('flujo_cust_id', account.cust_id)
            .maybeSingle()

          if (existing) {
            const oldCredits = existing.flujo_credits ?? 0
            const delta = account.credit - oldCredits

            if (delta > 0) {
              const { error: saleError } = await adminClient
                .from('credit_assignments')
                .insert({
                  client_id: existing.id,
                  assigned_by: assignedBy,
                  quantity: delta,
                  period_start: account.start_date ? new Date(account.start_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                  period_end: account.end_date ? new Date(account.end_date).toISOString().split('T')[0] : null,
                  is_courtesy: false,
                  payment_status: 'pending',
                  notes: `Auto-detectado: +${delta} créditos en sync`,
                })
              if (!saleError) pendingSales++
            }

            const { error } = await adminClient
              .from('clients')
              .update({
                name,
                phone: existing.phone || phone,
                email: existing.email || email,
                status,
                flujo_login: account.login_name,
                country: account.country,
                device_info: `${account.login_name} / ${account.password}`,
                flujo_start_date: account.start_date,
                flujo_end_date: account.end_date,
                flujo_credits: account.credit,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id)

            if (error) { errors++; console.error('Update error:', error.message) }
            else updated++
          } else {
            const { data: newClient, error } = await adminClient
              .from('clients')
              .insert({
                name, phone, email, status,
                flujo_cust_id: account.cust_id,
                flujo_login: account.login_name,
                country: account.country,
                device_info: `${account.login_name} / ${account.password}`,
                flujo_start_date: account.start_date,
                flujo_end_date: account.end_date,
                flujo_credits: account.credit,
                notes: account.remark,
              })
              .select('id')
              .single()
            if (error) { errors++; console.error('Insert error:', error.message) }
            else {
              created++
              // New client with credits = sale to register
              if (account.credit > 0 && newClient) {
                const { error: saleError } = await adminClient
                  .from('credit_assignments')
                  .insert({
                    client_id: newClient.id,
                    assigned_by: assignedBy,
                    quantity: account.credit,
                    period_start: account.start_date ? new Date(account.start_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    period_end: account.end_date ? new Date(account.end_date).toISOString().split('T')[0] : null,
                    is_courtesy: false,
                    payment_status: 'pending',
                    notes: `Auto-detectado: cliente nuevo con ${account.credit} créditos`,
                  })
                if (!saleError) pendingSales++
              }
            }
          }

          // Send progress every 20 clients
          if ((idx + 1) % 20 === 0 || idx === allAccounts.length - 1) {
            send('progress', {
              phase: 'syncing',
              message: `Procesando ${idx + 1}/${allAccounts.length} clientes...`,
              percent: 50 + Math.round(((idx + 1) / allAccounts.length) * 50),
              created, updated, errors, pendingSales,
            })
          }
        }

      } catch (e) {
        errorMessage = String(e)
        send('error', { message: errorMessage })
      }

      const duration = Date.now() - startTime
      const status = errorMessage ? 'failed' : errors > 0 ? 'partial' : 'success'

      // Save sync log
      try {
        await adminClient.from('sync_logs').insert({
          status,
          total_processed: created + updated + errors,
          created, updated, errors, pending_sales: pendingSales,
          total_in_flujo: totalCount,
          pages: totalPages,
          duration_ms: duration,
          error_message: errorMessage,
        })
      } catch (e) {
        console.error('Failed to save sync log:', e)
      }

      send('done', {
        success: !errorMessage,
        status,
        created, updated, errors, pendingSales,
        total: created + updated + errors,
        totalInFlujo: totalCount,
        pages: totalPages,
        durationMs: duration,
      })

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
