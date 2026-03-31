import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const key = request.nextUrl.searchParams.get('key')
  if (cronSecret && key !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized. Use ?key=CRON_SECRET' }, { status: 401 })
  }

  const dryRun = request.nextUrl.searchParams.get('dry') === '1'

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

  // Get all clients with valid end dates
  const { data: clients } = await adminClient
    .from('clients')
    .select('id, flujo_login, flujo_start_date, flujo_end_date, status, name')
    .not('flujo_end_date', 'is', null)
    .not('flujo_start_date', 'is', null)

  if (!clients) {
    return NextResponse.json({ error: 'No se pudieron obtener los clientes' }, { status: 500 })
  }

  const today = new Date()
  const salesPlan: Array<{
    login: string
    name: string
    start: string
    end: string
    months: number
    status: string
  }> = []

  for (const client of clients) {
    const start = new Date(client.flujo_start_date)
    const end = new Date(client.flujo_end_date)

    // Only clients with active or recent service (end_date >= today)
    if (end < today) continue

    const diffMs = end.getTime() - start.getTime()
    const months = Math.max(1, Math.round(diffMs / (30.44 * 24 * 60 * 60 * 1000)))

    salesPlan.push({
      login: client.flujo_login || 'unknown',
      name: client.name || 'Sin nombre',
      start: client.flujo_start_date,
      end: client.flujo_end_date,
      months,
      status: client.status,
    })
  }

  const totalCredits = salesPlan.reduce((sum, s) => sum + s.months, 0)

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      message: `Se crearían ${salesPlan.length} ventas por ${totalCredits} créditos. Créditos restantes: 312 - ${totalCredits} = ${312 - totalCredits}`,
      totalClients: clients.length,
      activeWithService: salesPlan.length,
      totalCredits,
      estimatedRemaining: 312 - totalCredits,
      sales: salesPlan,
    })
  }

  // === EXECUTE ===

  // 1. Delete ALL credit_assignments
  const { error: deleteError, count: deleted } = await adminClient
    .from('credit_assignments')
    .delete({ count: 'exact' })
    .gte('created_at', '1970-01-01')

  if (deleteError) {
    return NextResponse.json({ error: `Error eliminando ventas: ${deleteError.message}` }, { status: 500 })
  }

  // 2. Create new sales for active clients
  let created = 0
  let errors = 0
  const errorDetails: string[] = []

  for (const client of clients) {
    const start = new Date(client.flujo_start_date)
    const end = new Date(client.flujo_end_date)
    if (end < today) continue

    const diffMs = end.getTime() - start.getTime()
    const months = Math.max(1, Math.round(diffMs / (30.44 * 24 * 60 * 60 * 1000)))
    const dedupKey = `Venta auto: ${client.flujo_login} ${client.flujo_start_date} → ${client.flujo_end_date}`

    const { error } = await adminClient
      .from('credit_assignments')
      .insert({
        client_id: client.id,
        assigned_by: assignedBy,
        quantity: months,
        period_start: client.flujo_start_date,
        is_courtesy: false,
        payment_status: 'pending',
        notes: dedupKey,
      })

    if (error) {
      errors++
      errorDetails.push(`${client.flujo_login}: ${error.message}`)
    } else {
      created++
    }
  }

  const createdCredits = salesPlan.reduce((sum, s) => sum + s.months, 0)

  return NextResponse.json({
    success: true,
    deleted,
    created,
    errors,
    totalCredits: createdCredits,
    estimatedRemaining: 312 - createdCredits,
    message: `Eliminadas ${deleted} ventas anteriores. Creadas ${created} ventas por ${createdCredits} créditos. Balance estimado: 312 - ${createdCredits} = ${312 - createdCredits}`,
    ...(errorDetails.length > 0 ? { errorDetails } : {}),
  })
}
