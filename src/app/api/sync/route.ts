import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

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

  // Try to extract email
  const emailMatch = remark.match(/[\w.-]+@[\w.-]+\.\w+/i)
  const email = emailMatch ? emailMatch[0].replace(/([a-z])([A-Z])/g, '$1.$2').toLowerCase() : null

  // Try to extract phone (various formats)
  const phoneMatch = remark.match(/(?:\+?\d{1,3}[\s-]?)?\(?\d{3,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g)
  const phone = phoneMatch ? phoneMatch[0] : null

  // Name is the remaining text after removing email and phone
  let name = remark
  if (email) name = name.replace(emailMatch![0], '')
  if (phone) name = name.replace(phone, '')
  // Clean up the name
  name = name.replace(/[,.\-/|]+/g, ' ').replace(/\s+/g, ' ').trim()
  // Remove common suffixes like "usa", "ve", country names at the end
  name = name.replace(/\b(usa|ve|es|cl|ca|ae|otro|otra|cuenta|amigo|amiga|de|prima|primo)\b\s*$/gi, '').trim()

  if (!name) name = remark.substring(0, 50)

  return { name, phone, email }
}

export async function POST(request: NextRequest) {
  // Verify the request comes from an authenticated admin/operator
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'operator'].includes(profile.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await request.json()
  const accounts: FlujoAccount[] = body.accounts
  const dashboardData = body.dashboard

  if (!accounts || !Array.isArray(accounts)) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let created = 0
  let updated = 0
  let errors = 0

  for (const account of accounts) {
    const { name, phone, email } = parseRemark(account.remark)
    const status = account.status === '1' ? 'active' : 'inactive'

    // Check if client already exists by flujo_cust_id
    const { data: existing } = await adminClient
      .from('clients')
      .select('id')
      .eq('flujo_cust_id', account.cust_id)
      .maybeSingle()

    if (existing) {
      // Update existing client
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
      // Create new client
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
          created_by: user.id,
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
    total: accounts.length,
    dashboard: dashboardData ?? null,
  })
}
