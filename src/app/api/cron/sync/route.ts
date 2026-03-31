import crypto from 'crypto'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max for Vercel cron

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

async function loginFlujoTV(): Promise<string> {
  const username = process.env.FLUJO_USERNAME
  const password = process.env.FLUJO_PASSWORD
  if (!username || !password) throw new Error('FLUJO_USERNAME o FLUJO_PASSWORD no configuradas')

  const path = '/api/v1/magis/signin'
  const body = JSON.stringify({ username, password })
  const xSign = generateXSign(path, 'POST', body)

  const res = await fetch(`${FLUJO_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'x-lang': 'xby',
      'x-sign': xSign,
    },
    body,
  })

  if (!res.ok) throw new Error(`Flujo TV login HTTP error: ${res.status}`)

  const data = await res.json()
  if (data.code !== 200 || !data.data?.token) {
    throw new Error(`Flujo TV login failed: ${data.msg || JSON.stringify(data)}`)
  }

  return data.data.token
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
  n = n.replace(/\*/g, '')
  n = n.replace(/[\w.-]+@[\w.-]+\.\w+/gi, '')
  n = n.replace(/\b\w+\d+\w*gmail\w*\b\s*(com)?/gi, '')
  n = n.replace(/\b\w+@\w+/gi, '')
  n = n.replace(/\b[a-zA-Z]+\d{2,}\w*\b/g, '')
  n = n.replace(/\b(?:nombre|name|usuario|user|correo|email|telefono|phone|cel|movil|whatsapp|wa|plan)\s*[:=\-]?\s*/gi, '')
  n = n.replace(/\$\s?\d+(?:\.\d+)?/g, '')
  n = n.replace(/\b\d{4}[-/]\d{2}[-/]\d{2}\b/g, '')
  n = n.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑüÜ\s'-]/g, ' ')
  n = n.replace(/\s{2,}/g, ' ').trim()
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

export async function GET(request: NextRequest) {
  // Verify the request comes from Vercel Cron
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let token: string
  let created = 0
  let updated = 0
  let errors = 0
  let pendingSales = 0
  let totalCount = 0
  let totalPages = 0

  try {
    // Step 1: Login to Flujo TV for fresh token
    token = await loginFlujoTV()
    console.log('[CRON SYNC] Login exitoso, token obtenido')

    // Resolve assigned_by: first admin
    const { data: admin } = await adminClient
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .single()
    const assignedBy = admin?.id || null

    // Step 2: Fetch all pages and upsert client data
    const firstPage = await fetchFlujoPage(1, token)
    if (firstPage.code !== 200) {
      throw new Error(`Token inválido después del login (código ${firstPage.code})`)
    }

    totalPages = firstPage.data.total_pages
    totalCount = firstPage.data.count
    const allAccounts: FlujoAccount[] = [...firstPage.data.data]

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
    }

    console.log(`[CRON SYNC] ${allAccounts.length} cuentas descargadas de ${totalPages} páginas`)

    // Step 3: Upsert clients (data only, no sale detection)
    for (const account of allAccounts) {
      const { name, phone, email } = parseRemark(account.remark)
      const status = account.status === '1' ? 'active' : 'inactive'

      const { data: existing } = await adminClient
        .from('clients')
        .select('id, flujo_credits, phone, email, flujo_end_date, flujo_login')
        .eq('flujo_cust_id', account.cust_id)
        .maybeSingle()

      if (existing) {
        // Detect sale: end_date extended = client was recharged
        if (existing.flujo_end_date && account.end_date && account.end_date > existing.flujo_end_date) {
          const oldEnd = new Date(existing.flujo_end_date)
          const newEnd = new Date(account.end_date)
          const diffMonths = Math.max(1, Math.round((newEnd.getTime() - oldEnd.getTime()) / (30.44 * 24 * 60 * 60 * 1000)))
          const dedupKey = `Venta auto: ${account.login_name} ${existing.flujo_end_date} → ${account.end_date}`

          const { data: existingSale } = await adminClient
            .from('credit_assignments')
            .select('id')
            .eq('notes', dedupKey)
            .maybeSingle()

          if (!existingSale) {
            const clientId = existing.id
            const { error: saleError } = await adminClient
              .from('credit_assignments')
              .insert({
                client_id: clientId,
                assigned_by: assignedBy,
                quantity: diffMonths,
                period_start: new Date().toISOString().split('T')[0],
                is_courtesy: false,
                payment_status: 'pending',
                notes: dedupKey,
              })
            if (!saleError) pendingSales++
          }
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
        const { error } = await adminClient
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
        if (error) { errors++; console.error('Insert error:', error.message) }
        else created++
      }
    }

    console.log(`[CRON SYNC] ${pendingSales} ventas detectadas por cambio de fecha de expiración`)

  } catch (e) {
    const duration = Date.now() - startTime
    const errorMessage = String(e)
    console.error('[CRON SYNC] Error:', errorMessage)

    try {
      await adminClient.from('sync_logs').insert({
        status: 'failed',
        total_processed: created + updated + errors,
        created, updated, errors, pending_sales: pendingSales,
        total_in_flujo: totalCount,
        pages: totalPages,
        duration_ms: duration,
        error_message: errorMessage,
      })
    } catch { /* ignore */ }

    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }

  const duration = Date.now() - startTime
  const status = errors > 0 ? 'partial' : 'success'

  try {
    await adminClient.from('sync_logs').insert({
      status,
      total_processed: created + updated + errors,
      created, updated, errors, pending_sales: pendingSales,
      total_in_flujo: totalCount,
      pages: totalPages,
      duration_ms: duration,
      error_message: null,
    })
  } catch (e) {
    console.error('Failed to save sync log:', e)
  }

  const result = {
    success: true, status, created, updated, errors, pendingSales,
    total: created + updated + errors,
    totalInFlujo: totalCount,
    pages: totalPages,
    durationMs: duration,
  }

  console.log('[CRON SYNC] Completado:', result)
  return NextResponse.json(result)
}
