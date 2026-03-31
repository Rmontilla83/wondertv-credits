import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// 9 ventas: de 311 → 302 créditos
const SALES = [
  { login: 'Trino29',        qty: 1, date: '2026-03-28' },
  { login: 'NANDAGON66',     qty: 1, date: '2026-03-28' },
  { login: 'Carlosm010',     qty: 1, date: '2026-03-28' },
  { login: 'Carlosm010',     qty: 1, date: '2026-03-28' },
  { login: 'Carlosm010',     qty: 1, date: '2026-03-28' },
  { login: 'Wondercesar',    qty: 1, date: '2026-03-28' },
  { login: 'mesch68',        qty: 1, date: '2026-03-29' },
  { login: 'radys04',        qty: 1, date: '2026-03-31' },
  { login: 'EMeinhard23',    qty: 1, date: '2026-03-31' },
]

export async function GET() {
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: admin } = await adminClient
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .limit(1)
    .single()
  const assignedBy = admin?.id || null

  // 1. Borrar todas las credit_assignments
  const { count: deleted } = await adminClient
    .from('credit_assignments')
    .delete({ count: 'exact' })
    .gte('created_at', '1970-01-01')

  // 2. Borrar credit_purchases y crear una sola de 311
  await adminClient
    .from('credit_purchases')
    .delete()
    .gte('created_at', '1970-01-01')

  const { error: purchaseError } = await adminClient
    .from('credit_purchases')
    .insert({
      purchased_by: assignedBy,
      quantity: 311,
      total_cost_usd: 311.00,
      payment_method: 'zelle',
      payment_reference: 'Balance inicial - migración',
    })

  if (purchaseError) {
    return NextResponse.json({ error: `Error creando compra: ${purchaseError.message}` }, { status: 500 })
  }

  // 3. Mapear login → client_id
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

  // 4. Insertar las 9 ventas pendientes
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

  // 5. Verificar balance final
  const { data: balance } = await adminClient
    .from('credit_balance')
    .select('*')
    .single()

  return NextResponse.json({
    success: true,
    deleted,
    created,
    balance: balance?.available_credits,
    errors: errors.length > 0 ? errors : undefined,
    message: `Eliminadas ${deleted} ventas. Creadas ${created} ventas pendientes. Balance: ${balance?.available_credits} créditos disponibles.`,
  })
}
