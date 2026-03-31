import { createClient as createAdminClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const DELAY_MS = 150 // Rate limit between emails
const BATCH_TIME_LIMIT = 50000 // Stop 10s before Vercel's 60s timeout

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY no configurado')
  return new Resend(key)
}
const FROM_EMAIL = process.env.FROM_EMAIL || 'Wonder TV <hola@wondertv.live>'

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

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
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

  // Determine recipients: first call gets them from request, continuation calls get remaining from DB
  let clients: { id?: string; name: string; email: string; flujo_login?: string; flujo_end_date?: string }[]
  const isContinuation = campaign.status === 'sending'

  if (isContinuation) {
    // Get emails already sent for this campaign
    const { data: alreadySent } = await adminClient
      .from('campaign_emails')
      .select('email')
      .eq('campaign_id', campaignId)
    const sentEmails = new Set((alreadySent || []).map(e => e.email?.toLowerCase()))

    // Rebuild original recipient list and filter out already sent
    if (customRecipients && Array.isArray(customRecipients) && customRecipients.length > 0) {
      clients = customRecipients.filter((c: { email: string }) => !sentEmails.has(c.email?.toLowerCase()))
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
      clients = (data || []).filter(c => !sentEmails.has(c.email?.toLowerCase()))
    }
  } else {
    // First call
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
      .update({ status: 'sending', total_recipients: clients.length, sent_count: 0, failed_count: 0 })
      .eq('id', campaignId)
  }

  // If no remaining clients, finalize
  if (clients.length === 0) {
    const { count: sentCount } = await adminClient
      .from('campaign_emails')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('status', 'sent')
    const { count: failedCount } = await adminClient
      .from('campaign_emails')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('status', 'failed')

    await adminClient
      .from('campaigns')
      .update({
        status: (failedCount || 0) === campaign.total_recipients ? 'failed' : 'sent',
        sent_count: sentCount || 0,
        failed_count: failedCount || 0,
        sent_at: new Date().toISOString(),
      })
      .eq('id', campaignId)

    return NextResponse.json({ success: true, done: true, sentCount, failedCount })
  }

  // Send emails until time limit
  const startTime = Date.now()
  let sentCount = campaign.sent_count || 0
  let failedCount = campaign.failed_count || 0
  let processed = 0

  for (let i = 0; i < clients.length; i++) {
    // Check time limit
    if (Date.now() - startTime > BATCH_TIME_LIMIT) break

    const client = clients[i]
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
        headers: {
          'List-Unsubscribe': `<mailto:hola@wondertv.live?subject=Desuscribir%20${encodeURIComponent(client.email!)}>`,
        },
      })

      await adminClient.from('campaign_emails').insert({
        campaign_id: campaignId,
        client_id: client.id || null,
        email: client.email,
        status: emailError ? 'failed' : 'sent',
        resend_id: emailResult?.id || null,
        error_message: emailError?.message || null,
      })

      if (emailError) failedCount++
      else sentCount++
    } catch (e) {
      failedCount++
      await adminClient.from('campaign_emails').insert({
        campaign_id: campaignId,
        client_id: client.id || null,
        email: client.email,
        status: 'failed',
        error_message: String(e),
      })
    }

    processed++

    // Update counts every 10 emails
    if (processed % 10 === 0) {
      await adminClient
        .from('campaigns')
        .update({ sent_count: sentCount, failed_count: failedCount })
        .eq('id', campaignId)
    }

    // Rate limit
    if (i < clients.length - 1 && Date.now() - startTime < BATCH_TIME_LIMIT) {
      await sleep(DELAY_MS)
    }
  }

  // Update counts after this batch
  await adminClient
    .from('campaigns')
    .update({ sent_count: sentCount, failed_count: failedCount })
    .eq('id', campaignId)

  const remaining = clients.length - processed

  if (remaining > 0) {
    // More to send — tell frontend to call again
    return NextResponse.json({
      success: true,
      done: false,
      sentCount,
      failedCount,
      processed,
      remaining,
      total: campaign.total_recipients,
    })
  }

  // All done
  const finalStatus = failedCount === campaign.total_recipients ? 'failed' : 'sent'
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
    done: true,
    sentCount,
    failedCount,
    total: campaign.total_recipients,
  })
}
