import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Las 10 ventas reales desde que teníamos 311 créditos hasta 302
const SALES = [
  { login: 'henrryjose1808', qty: 1, date: '2026-03-27' },
  { login: 'Trino29', qty: 1, date: '2026-03-28' },
  { login: 'NANDAGON66', qty: 1, date: '2026-03-28' },
  { login: 'Carlosm010', qty: 1, date: '2026-03-28' },
  { login: 'Carlosm010', qty: 1, date: '2026-03-28' },
  { login: 'Carlosm010', qty: 1, date: '2026-03-28' },
  { login: 'Wondercesar', qty: 1, date: '2026-03-28' },
  { login: 'mesch68', qty: 1, date: '2026-03-29' },
  { login: 'radys04', qty: 1, date: '2026-03-31' },
  { login: 'EMeinhard23', qty: 1, date: '2026-03-31' },
]

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const key = request.nextUrl.searchParams.get('key')
  if (cronSecret && key !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized. Use ?key=CRON_SECRET' }, { status: 401 })
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get first admin for assigned_by
  const { data: admin } = await adminClient
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .limit(1)
    .single()
  const assignedBy = admin?.id || null

  // 1. Delete ALL existing credit_assignments
  const { error: deleteError, count: deleted } = await adminClient
    .from('credit_assignments')
    .delete({ count: 'exact' })
    .gte('created_at', '1970-01-01')

  if (deleteError) {
    return NextResponse.json({ error: `Error eliminando ventas: ${deleteError.message}` }, { status: 500 })
  }

  // 2. Map login → client_id
  const { data: clients } = await adminClient
    .from('clients')
    .select('id, flujo_login')
    .not('flujo_login', 'is', null)

  const loginMap = new Map<string, string>()
  if (clients) {
    for (const c of clients) {
      if (c.flujo_login) loginMap.set(c.flujo_login.toLowerCase(), c.id)
    }
  }

  // 3. Insert the 10 known sales
  let created = 0
  const errors: string[] = []

  for (const sale of SALES) {
    const clientId = loginMap.get(sale.login.toLowerCase())
    if (!clientId) {
      errors.push(`${sale.login}: cliente no encontrado`)
      continue
    }

    const { error } = await adminClient
      .from('credit_assignments')
      .insert({
        client_id: clientId,
        assigned_by: assignedBy,
        quantity: sale.qty,
        period_start: sale.date,
        is_courtesy: false,
        payment_status: 'pending',
        notes: `Venta auto: ${sale.login} +${sale.qty} crédito ${sale.date}`,
      })

    if (error) {
      errors.push(`${sale.login}: ${error.message}`)
    } else {
      created++
    }
  }

  return NextResponse.json({
    success: true,
    deleted,
    created,
    totalSales: SALES.length,
    creditsBefore: 312,
    creditsAfter: 312 - created,
    errors: errors.length > 0 ? errors : undefined,
    message: `Eliminadas ${deleted} ventas anteriores. Creadas ${created} ventas pendientes. Balance: 312 → ${312 - created} créditos.`,
  })
}
