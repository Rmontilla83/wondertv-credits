'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // Effect 1: Listen to auth state changes (ONLY set user, no async DB calls)
  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log('[Auth]', _event, session?.user?.email ?? 'no user')
        setUser(session?.user ?? null)
        if (!session?.user) {
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Effect 2: When user changes, fetch profile SEPARATELY (not inside onAuthStateChange)
  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    let cancelled = false
    const supabase = createClient()

    console.log('[Auth] Fetching profile for', user.email)
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return
        console.log('[Auth] Profile result:', data?.role ?? 'null', error?.message ?? 'ok')
        setProfile(data ?? null)
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [user])

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    window.location.href = '/login'
  }

  const refreshProfile = async () => {
    if (!user) return
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (data) setProfile(data)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
