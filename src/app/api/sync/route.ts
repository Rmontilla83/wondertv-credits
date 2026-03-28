import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Simple sync key for bookmarklet auth (since cookies aren't available cross-origin)
const SYNC_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-16) ?? ''

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Sync-Key',
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

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

export async function POST(request: NextRequest) {
  // Auth: either sync key (cross-origin bookmarklet) or same-origin session cookie
  const syncKey = request.headers.get('x-sync-key')
  const isSameOrigin = request.headers.get('origin') === null ||
    request.headers.get('origin') === request.nextUrl.origin

  if (!isSameOrigin && (!syncKey || syncKey !== SYNC_KEY)) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 403, headers: corsHeaders() }
    )
  }

  const body = await request.json()
  const accounts: FlujoAccount[] = body.accounts
  const dashboardData = body.dashboard

  if (!accounts || !Array.isArray(accounts)) {
    return NextResponse.json(
      { error: 'Datos inválidos' },
      { status: 400, headers: corsHeaders() }
    )
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let created = 0
  let updated = 0
  let errors = 0
  let pendingSales = 0

  for (const account of accounts) {
    const { name, phone, email } = parseRemark(account.remark)
    const status = account.status === '1' ? 'active' : 'inactive'

    const { data: existing } = await adminClient
      .from('clients')
      .select('id, flujo_credits, phone, email')
      .eq('flujo_cust_id', account.cust_id)
      .maybeSingle()

    if (existing) {
      const oldCredits = existing.flujo_credits ?? 0
      const newCredits = account.credit
      const delta = newCredits - oldCredits

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

  return NextResponse.json(
    {
      success: true,
      created,
      updated,
      errors,
      pendingSales,
      total: accounts.length,
      dashboard: dashboardData ?? null,
    },
    { headers: corsHeaders() }
  )
}
