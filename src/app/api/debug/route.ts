import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError) {
      return NextResponse.json({ status: 'no_user', error: userError.message })
    }

    if (!user) {
      return NextResponse.json({ status: 'no_user', error: 'no session' })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      status: 'ok',
      user_id: user.id,
      email: user.email,
      profile: profile,
      profile_error: profileError?.message ?? null,
    })
  } catch (err) {
    return NextResponse.json({ status: 'error', error: String(err) })
  }
}
