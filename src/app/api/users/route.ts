import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getAuthenticatedAdmin(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return null
  return user
}

// GET /api/users - List all users with auth info
export async function GET(request: NextRequest) {
  const admin = await getAuthenticatedAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const adminClient = getAdminClient()

  // Get profiles
  const { data: profiles, error: profilesError } = await adminClient
    .from('profiles')
    .select('*')
    .order('created_at')

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 })
  }

  // Get auth users for email and status
  const { data: { users: authUsers }, error: authError } = await adminClient.auth.admin.listUsers()

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  // Merge profiles with auth data
  const merged = profiles.map((profile) => {
    const authUser = authUsers.find((u) => u.id === profile.id)
    return {
      ...profile,
      email: authUser?.email ?? '',
      banned: authUser?.banned_until ? true : false,
      last_sign_in: authUser?.last_sign_in_at ?? null,
    }
  })

  return NextResponse.json(merged)
}

// POST /api/users - Create a new user
export async function POST(request: NextRequest) {
  const admin = await getAuthenticatedAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await request.json()
  const { email, password, full_name, role, phone } = body

  if (!email || !password || !full_name || !role) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const adminClient = getAdminClient()

  // Create auth user
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // Update profile with role and phone
  if (authData.user) {
    await adminClient
      .from('profiles')
      .update({ role, full_name, phone: phone || null })
      .eq('id', authData.user.id)
  }

  return NextResponse.json({ success: true, user_id: authData.user?.id })
}

// PATCH /api/users - Update a user
export async function PATCH(request: NextRequest) {
  const admin = await getAuthenticatedAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await request.json()
  const { id, full_name, role, phone, banned } = body

  if (!id) {
    return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 })
  }

  const adminClient = getAdminClient()

  // Update profile
  const profileUpdate: Record<string, unknown> = {}
  if (full_name !== undefined) profileUpdate.full_name = full_name
  if (role !== undefined) profileUpdate.role = role
  if (phone !== undefined) profileUpdate.phone = phone || null

  if (Object.keys(profileUpdate).length > 0) {
    const { error } = await adminClient
      .from('profiles')
      .update(profileUpdate)
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  // Ban/unban user (deactivate/activate)
  if (banned !== undefined) {
    const { error } = await adminClient.auth.admin.updateUserById(id, {
      ban_duration: banned ? '876000h' : 'none',
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
