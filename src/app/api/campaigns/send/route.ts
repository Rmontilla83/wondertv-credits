import { createClient as createAdminClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY no configurado')
  return new Resend(key)
}
const FROM_EMAIL = process.env.FROM_EMAIL || 'Wonder TV <flujo@wondertv.live>'

function getSegmentQuery(segment: string) {
  const now = new Date()
  const base = { status_filter: null as string | null, date_from: null as string | null, date_to: null as string | null }

  switch (segment) {
    case 'expiring_7d':
      return { ...base, status_filter: 'active', date_from: now.toISOString(), date_to: new Date(now.getTime() + 7 * 86400000).toISOString() }
    case 'expiring_14d':
      return { ...base, status_filter: 'active', date_from: now.toISOString(), date_to: new Date(now.getTime() + 14 * 86400000).toISOString() }
    case 'expiring_30d':
      return { ...base, status_filter: 'active', date_from: now.toISOString(), date_to: new Date(now.getTime() + 30 * 86400000).toISOString() }
    case 'inactive':
      return { ...base, status_filter: 'inactive' }
    case 'active':
      return { ...base, status_filter: 'active' }
    case 'all':
    default:
      return base
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { campaignId, customRecipients } = body

  if (!campaignId) {
    return NextResponse.json({ error: 'campaignId requerido' }, { status: 400 })
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get campaign
  const { data: campaign, error: campError } = await adminClient
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single()

  if (campError || !campaign) {
    return NextResponse.json({ error: 'Campana no encontrada' }, { status: 404 })
  }

  // Use custom recipients from frontend if provided, otherwise query by segment
  let clients: { id?: string; name: string; email: string; flujo_login?: string; flujo_end_date?: string }[]

  if (customRecipients && Array.isArray(customRecipients) && customRecipients.length > 0) {
    clients = customRecipients
  } else {
    let query = adminClient
      .from('clients')
      .select('id, name, email, flujo_login, flujo_end_date, status')
      .not('email', 'is', null)

    if (campaign.segment === 'custom' && campaign.custom_client_ids?.length) {
      query = query.in('id', campaign.custom_client_ids)
    } else {
      const seg = getSegmentQuery(campaign.segment)
      if (seg.status_filter) query = query.eq('status', seg.status_filter)
      if (seg.date_from && seg.date_to) {
        query = query.gte('flujo_end_date', seg.date_from).lte('flujo_end_date', seg.date_to)
      }
    }

    const { data } = await query
    clients = data || []
  }

  if (clients.length === 0) {
    return NextResponse.json({ error: 'No hay destinatarios' }, { status: 400 })
  }

  // Mark campaign as sending
  await adminClient
    .from('campaigns')
    .update({ status: 'sending', total_recipients: clients.length })
    .eq('id', campaignId)

  let sentCount = 0
  let failedCount = 0

  for (const client of clients) {
    // Replace template variables
    const daysLeft = client.flujo_end_date
      ? Math.ceil((new Date(client.flujo_end_date as string).getTime() - Date.now()) / 86400000)
      : null

    const html = campaign.html_content
      .replace(/\{nombre\}/g, client.name || 'Cliente')
      .replace(/\{usuario\}/g, client.flujo_login || '')
      .replace(/\{dias\}/g, String(daysLeft ?? ''))
      .replace(/\{email\}/g, client.email || '')

    const subject = campaign.subject
      .replace(/\{nombre\}/g, client.name || 'Cliente')
      .replace(/\{dias\}/g, String(daysLeft ?? ''))

    try {
      const resend = getResend()
      const { data: emailResult, error: emailError } = await resend.emails.send({
        from: FROM_EMAIL,
        to: client.email!,
        subject,
        html,
      })

      if (client.id) {
        await adminClient.from('campaign_emails').insert({
          campaign_id: campaignId,
          client_id: client.id,
          email: client.email,
          status: emailError ? 'failed' : 'sent',
          resend_id: emailResult?.id || null,
          error_message: emailError?.message || null,
        })
      }

      if (emailError) failedCount++
      else sentCount++
    } catch (e) {
      failedCount++
      if (client.id) {
        await adminClient.from('campaign_emails').insert({
          campaign_id: campaignId,
          client_id: client.id,
          email: client.email,
          status: 'failed',
          error_message: String(e),
        })
      }
    }
  }

  // Update campaign status
  const finalStatus = failedCount === clients.length ? 'failed' : 'sent'
  await adminClient
    .from('campaigns')
    .update({
      status: finalStatus,
      sent_count: sentCount,
      failed_count: failedCount,
      sent_at: new Date().toISOString(),
    })
    .eq('id', campaignId)

  return NextResponse.json({
    success: true,
    sentCount,
    failedCount,
    total: clients.length,
  })
}
