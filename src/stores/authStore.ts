import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import { supabase, supabaseClient } from '@/lib/supabase'

interface AuthState {
  user: User | null
  /** True hanya bila Supabase punya sesi aktif di runtime ini. Tidak pernah dipersist. */
  isAuthenticated: boolean
  /** Sudah memeriksa sesi Supabase sejak halaman dimuat; rute menunggu ini. */
  initialized: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  initSession: () => Promise<void>
  /** Pantau perubahan sesi (kedaluwarsa, logout di tab lain). Mengembalikan fungsi berhenti. */
  listenAuthChanges: () => () => void
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
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      initialized: false,

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
        // Tanpa sesi Supabase, status login dari cache harus dibuang. Sebelumnya
        // fungsi ini langsung return, sehingga pengguna tetap tampak login
        // sementara setiap query berjalan sebagai anon dan RLS mengembalikan kosong.
        if (!session?.user) {
          set({ user: null, isAuthenticated: false, initialized: true })
          return
        }
        // Sesi ada dan cache milik pengguna yang sama: izinkan rute segera, supaya
        // reload di /visits/123 tidak terlempar ke /login sambil menunggu profil.
        if (get().user?.id === session.user.id) set({ isAuthenticated: true, initialized: true })

        const profile = await fetchUserProfile(session.user.id)
        if (profile && profile.is_active) {
          set({ user: profile, isAuthenticated: true, initialized: true })
        } else {
          await supabaseClient.auth.signOut()
          set({ user: null, isAuthenticated: false, initialized: true })
        }
      },

      listenAuthChanges: () => {
        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_OUT' || !session?.user) {
            // Sesi berakhir (refresh token gagal, logout di tab lain, storage dihapus).
            if (get().isAuthenticated) set({ user: null, isAuthenticated: false })
            return
          }
          // Login sebagai pengguna lain di tab lain: ambil ulang profil. Ditunda ke
          // luar callback karena memanggil Supabase di dalamnya bisa deadlock.
          // TOKEN_REFRESHED untuk pengguna yang sama tidak perlu apa-apa.
          if (event === 'SIGNED_IN' && get().user && get().user!.id !== session.user.id) {
            setTimeout(() => void get().initSession(), 0)
          }
        })
        return () => subscription.unsubscribe()
      },
    }),
    {
      name: 'auth-storage',
      // Hanya profil yang dipersist, sebagai cache tampilan. isAuthenticated
      // selalu ditentukan ulang dari sesi Supabase saat halaman dimuat.
      partialize: (state) => ({ user: state.user }),
      // Browser lama masih menyimpan isAuthenticated: true; jangan dipulihkan.
      merge: (persisted, current) => ({
        ...current,
        user: (persisted as Partial<AuthState> | undefined)?.user ?? null,
      }),
    }
  )
)
