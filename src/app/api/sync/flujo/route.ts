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

function parseRemark(remark: string): { name: string; phone: string | null; email: string | null } {
  if (!remark) return { name: 'Sin nombre', phone: null, email: null }

  const emailMatch = remark.match(/[\w.-]+@[\w.-]+\.\w+/i)
  const email = emailMatch ? emailMatch[0].replace(/([a-z])([A-Z])/g, '$1.$2').toLowerCase() : null

  const phoneMatch = remark.match(/(?:\+?\d{1,3}[\s-]?)?\(?\d{3,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g)
  const phone = phoneMatch ? phoneMatch[0] : null

  let name = remark
  if (email) name = name.replace(emailMatch![0], '')
  if (phone) name = name.replace(phone, '')
  name = name.replace(/[,.\-/|]+/g, ' ').replace(/\s+/g, ' ').trim()
  name = name.replace(/\b(usa|ve|es|cl|ca|ae|otro|otra|cuenta|amigo|amiga|de|prima|primo)\b\s*$/gi, '').trim()

  if (!name) name = remark.substring(0, 50)

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

  if (!res.ok) {
    throw new Error(`Flujo TV API error: ${res.status} ${res.statusText}`)
  }

  return res.json()
}

export async function POST(request: NextRequest) {
  // Auth: require sync key or same-origin session
  const syncKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-16) ?? ''
  const reqKey = request.headers.get('x-sync-key')
  const isSameOrigin = request.headers.get('origin') === null ||
    request.headers.get('origin') === request.nextUrl.origin

  if (!isSameOrigin && (!reqKey || reqKey !== syncKey)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  // Get Flujo TV token from body or env
  const body = await request.json().catch(() => ({}))
  const token = body.token || process.env.FLUJO_TOKEN

  if (!token) {
    return NextResponse.json(
      { error: 'Falta el token de Flujo TV. Configura FLUJO_TOKEN en .env.local o envíalo en el body.' },
      { status: 400 }
    )
  }

  // Step 1: Fetch first page to get total_pages
  let firstPage: FlujoPageResponse
  try {
    firstPage = await fetchFlujoPage(1, token)
  } catch (e) {
    return NextResponse.json(
      { error: `Error conectando con Flujo TV: ${String(e)}` },
      { status: 502 }
    )
  }

  if (firstPage.code !== 200) {
    return NextResponse.json(
      { error: `Flujo TV respondió con código ${firstPage.code}. Token posiblemente expirado.`, flujoMsg: firstPage.msg },
      { status: 401 }
    )
  }

  const totalPages = firstPage.data.total_pages
  const totalCount = firstPage.data.count
  const allAccounts: FlujoAccount[] = [...firstPage.data.data]

  // Step 2: Fetch remaining pages in parallel (batches of 4)
  const BATCH_SIZE = 4
  for (let i = 2; i <= totalPages; i += BATCH_SIZE) {
    const batch = []
    for (let p = i; p < i + BATCH_SIZE && p <= totalPages; p++) {
      batch.push(fetchFlujoPage(p, token))
    }

    try {
      const results = await Promise.all(batch)
      for (const res of results) {
        if (res.code === 200) {
          allAccounts.push(...res.data.data)
        }
      }
    } catch (e) {
      return NextResponse.json(
        { error: `Error en página ${i}: ${String(e)}`, partial: allAccounts.length },
        { status: 502 }
      )
    }
  }

  // Step 3: Upsert all accounts into Supabase
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let created = 0
  let updated = 0
  let errors = 0
  let pendingSales = 0

  for (const account of allAccounts) {
    const { name, phone, email } = parseRemark(account.remark)
    const status = account.status === '1' ? 'active' : 'inactive'

    const { data: existing } = await adminClient
      .from('clients')
      .select('id, flujo_credits')
      .eq('flujo_cust_id', account.cust_id)
      .maybeSingle()

    if (existing) {
      const oldCredits = existing.flujo_credits ?? 0
      const newCredits = account.credit
      const delta = newCredits - oldCredits

      // Detect credit increase → auto-create pending sale
      if (delta > 0) {
        const { error: saleError } = await adminClient
          .from('credit_assignments')
          .insert({
            client_id: existing.id,
            quantity: delta,
            period_start: account.start_date ? new Date(account.start_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            period_end: account.end_date ? new Date(account.end_date).toISOString().split('T')[0] : null,
            is_courtesy: false,
            payment_status: 'pending',
            notes: `Auto-detectado: +${delta} créditos en sync`,
          })

        if (saleError) {
          console.error('Pending sale error:', saleError.message)
        } else {
          pendingSales++
        }
      }

      const { error } = await adminClient
        .from('clients')
        .update({
          name,
          phone,
          email,
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

      if (error) {
        errors++
        console.error('Update error:', error.message)
      } else {
        updated++
      }
    } else {
      const { error } = await adminClient
        .from('clients')
        .insert({
          name,
          phone,
          email,
          status,
          flujo_cust_id: account.cust_id,
          flujo_login: account.login_name,
          country: account.country,
          device_info: `${account.login_name} / ${account.password}`,
          flujo_start_date: account.start_date,
          flujo_end_date: account.end_date,
          flujo_credits: account.credit,
          notes: account.remark,
        })

      if (error) {
        errors++
        console.error('Insert error:', error.message)
      } else {
        created++
      }
    }
  }

  return NextResponse.json({
    success: true,
    created,
    updated,
    errors,
    pendingSales,
    total: allAccounts.length,
    totalInFlujo: totalCount,
    pages: totalPages,
  })
}
