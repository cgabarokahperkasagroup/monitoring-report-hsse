import { useState } from 'react'
import { Eye, EyeOff, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { useAuthStore } from '@/stores/authStore'
import { supabaseClient } from '@/lib/supabase'
import { getRoleLabel, getRoleColor } from '@/utils'

export default function ProfilePage() {
  const { user } = useAuthStore()
  const { success, error } = useToast()
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSavePw = async () => {
    if (!user) return
    if (!currentPw || !newPw || !confirmPw) { error('Lengkapi semua field password'); return }
    if (newPw !== confirmPw) { error('Konfirmasi password tidak cocok'); return }
    if (newPw.length < 8) { error('Password minimal 8 karakter'); return }
    if (newPw === currentPw) { error('Password baru harus berbeda dari password saat ini'); return }
    setSaving(true)
    // 1. Verifikasi password saat ini dengan re-autentikasi
    const { error: signInErr } = await supabaseClient.auth.signInWithPassword({
      email: user.email,
      password: currentPw,
    })
    if (signInErr) {
      setSaving(false)
      error('Password saat ini salah')
      return
    }
    // 2. Perbarui ke password baru
    const { error: updateErr } = await supabaseClient.auth.updateUser({ password: newPw })
    setSaving(false)
    if (updateErr) {
      error('Gagal memperbarui password', updateErr.message)
      return
    }
    success('Password berhasil diperbarui', 'Silakan gunakan password baru untuk login berikutnya')
    setCurrentPw(''); setNewPw(''); setConfirmPw('')
  }

  if (!user) return null

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informasi Akun</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-[#1B3A6B] flex items-center justify-center text-white text-2xl font-bold">
              {user.full_name.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">{user.full_name}</h3>
              <p className="text-sm text-gray-500">{user.email}</p>
              <span className={`badge text-xs mt-1 ${getRoleColor(user.role)}`}>{getRoleLabel(user.role)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Status Akun</p>
              <p className={`text-sm font-semibold ${user.is_active ? 'text-green-700' : 'text-red-600'}`}>
                {user.is_active ? 'Aktif' : 'Nonaktif'}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Role</p>
              <p className="text-sm font-semibold">{getRoleLabel(user.role)}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg col-span-2">
              <p className="text-xs text-gray-500 mb-1">Scope Akses (Unit Bisnis)</p>
              <p className="text-sm font-semibold">
                {user.business_units.length === 0 ? 'Semua Unit Bisnis' : `${user.business_units.length} Unit Bisnis`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>Ubah Password</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Input
                type={showPw ? 'text' : 'password'}
                label="Password Saat Ini"
                required
                value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
                placeholder="Masukkan password saat ini"
              />
            </div>
            <Input
              type={showPw ? 'text' : 'password'}
              label="Password Baru"
              required
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              placeholder="Minimal 8 karakter"
              hint="Gunakan kombinasi huruf besar, kecil, angka, dan simbol"
            />
            <Input
              type={showPw ? 'text' : 'password'}
              label="Konfirmasi Password Baru"
              required
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              placeholder="Ulangi password baru"
              error={confirmPw && newPw !== confirmPw ? 'Password tidak cocok' : undefined}
            />
            <div className="flex items-center gap-2">
              <input type="checkbox" id="showpw" checked={showPw} onChange={e => setShowPw(e.target.checked)} className="rounded" />
              <label htmlFor="showpw" className="text-sm text-gray-600 cursor-pointer">Tampilkan password</label>
            </div>
            <Button onClick={handleSavePw} loading={saving} className="w-fit">
              <Save size={16} /> Simpan Password Baru
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Session & Security Info */}
      <Card>
        <CardHeader>
          <CardTitle>Keamanan Sesi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 text-sm text-gray-600">
            <p>• Sesi aktif akan otomatis berakhir setelah <strong>8 jam</strong> tidak aktif</p>
            <p>• Login gagal <strong>5 kali berturut-turut</strong> akan mengunci akun selama 15 menit</p>
            <p>• Seluruh aktivitas login dan logout dicatat dalam audit log</p>
            <p>• Hubungi Admin Sistem untuk reset password atau masalah akses</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
