import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import { mockUsers, DEMO_CREDENTIALS } from '@/data/mockData'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: async (email: string, password: string) => {
        const cred = DEMO_CREDENTIALS[email as keyof typeof DEMO_CREDENTIALS]
        if (!cred || cred.password !== password) {
          return { success: false, error: 'Email atau password salah' }
        }
        const user = mockUsers.find(u => u.id === cred.userId)
        if (!user || !user.is_active) {
          return { success: false, error: 'Akun tidak aktif atau tidak ditemukan' }
        }
        set({ user, isAuthenticated: true })
        return { success: true }
      },
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: 'auth-storage' }
  )
)
