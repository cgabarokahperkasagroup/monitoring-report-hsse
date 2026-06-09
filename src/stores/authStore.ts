import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import { supabase, supabaseClient } from '@/lib/supabase'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  initSession: () => Promise<void>
}

async function fetchUserProfile(authId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*, user_business_units(business_unit_id)')
    .eq('id', authId)
    .single()
  if (error || !data) return null
  return {
    ...(data as any),
    business_units: ((data as any).user_business_units ?? []).map((ub: any) => ub.business_unit_id),
  } as User
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password })
        if (error || !data.user) {
          return { success: false, error: error?.message || 'Login gagal' }
        }
        const profile = await fetchUserProfile(data.user.id)
        if (!profile) {
          await supabaseClient.auth.signOut()
          return { success: false, error: 'Profil pengguna tidak ditemukan di sistem' }
        }
        if (!profile.is_active) {
          await supabaseClient.auth.signOut()
          return { success: false, error: 'Akun tidak aktif. Hubungi administrator.' }
        }
        set({ user: profile, isAuthenticated: true })
        return { success: true }
      },

      logout: async () => {
        await supabaseClient.auth.signOut()
        set({ user: null, isAuthenticated: false })
      },

      initSession: async () => {
        const { data: { session } } = await supabaseClient.auth.getSession()
        if (!session?.user) return
        const profile = await fetchUserProfile(session.user.id)
        if (profile && profile.is_active) {
          set({ user: profile, isAuthenticated: true })
        } else {
          await supabaseClient.auth.signOut()
          set({ user: null, isAuthenticated: false })
        }
      },
    }),
    { name: 'auth-storage' }
  )
)
