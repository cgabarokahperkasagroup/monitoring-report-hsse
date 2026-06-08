import { useState } from 'react'
import { Plus, Search, Edit, UserX, UserCheck, Key, Eye, EyeOff } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input, Select } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { mockUsers, mockBusinessUnits, DEMO_CREDENTIALS } from '@/data/mockData'
import { getRoleLabel, getRoleColor } from '@/utils'
import type { UserRole } from '@/types'

export default function UsersPage() {
  const { success } = useToast()
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('ALL')
  const [showAddUser, setShowAddUser] = useState(false)
  const [showEditUser, setShowEditUser] = useState(false)
  const [showResetPw, setShowResetPw] = useState(false)
  const [selectedUser, setSelectedUser] = useState<typeof mockUsers[0] | null>(null)

  const filtered = mockUsers.filter(u => {
    const matchSearch = !search || u.full_name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = filterRole === 'ALL' || u.role === filterRole
    return matchSearch && matchRole
  })

  function openReset(u: typeof mockUsers[0]) {
    setSelectedUser(u)
    setShowResetPw(true)
  }

  function closeReset() {
    setShowResetPw(false)
    setSelectedUser(null)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama atau email..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#1B3A6B]/20 outline-none bg-white"
          />
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:border-[#1B3A6B] outline-none cursor-pointer">
          <option value="ALL">Semua Role</option>
          {(['SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'HEAD_HSSE', 'STAFF_HSSE', 'OP_HEAD', 'SITE_MGR', 'PIC', 'VIEWER'] as UserRole[]).map(r => (
            <option key={r} value={r}>{getRoleLabel(r)}</option>
          ))}
        </select>
        <Button onClick={() => setShowAddUser(true)}>
          <Plus size={16} /> Tambah Pengguna
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 sm:grid-cols-9 gap-2">
        {(['SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'HEAD_HSSE', 'STAFF_HSSE', 'OP_HEAD', 'SITE_MGR', 'PIC', 'VIEWER'] as UserRole[]).map(role => {
          const count = mockUsers.filter(u => u.role === role).length
          return (
            <div key={role} className="bg-white rounded-lg p-3 border border-gray-200 text-center">
              <p className="text-lg font-bold text-[#1B3A6B]">{count}</p>
              <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{getRoleLabel(role)}</p>
            </div>
          )
        })}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600">Pengguna</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Unit Bisnis</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1B3A6B] flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {u.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{u.full_name}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge text-[11px] ${getRoleColor(u.role)}`}>{getRoleLabel(u.role)}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {u.business_units.length === 0 ? (
                        <span className="text-gray-400 italic">Semua BU</span>
                      ) : (
                        u.business_units.slice(0, 2).map(bid => mockBusinessUnits.find(b => b.id === bid)?.code).join(', ') +
                        (u.business_units.length > 2 ? ` +${u.business_units.length - 2}` : '')
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.is_active ? (
                        <span className="flex items-center gap-1.5 text-green-700 text-xs font-semibold">
                          <UserCheck size={13} /> Aktif
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-red-600 text-xs font-semibold">
                          <UserX size={13} /> Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedUser(u); setShowEditUser(true) }}
                          title="Edit pengguna">
                          <Edit size={13} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openReset(u)} title="Reset password">
                          <Key size={13} />
                        </Button>
                        <Button variant="ghost" size="sm" title={u.is_active ? 'Suspend akun' : 'Aktifkan akun'}
                          onClick={() => success(u.is_active ? 'Akun disuspend' : 'Akun diaktifkan', u.full_name)}>
                          {u.is_active ? <UserX size={13} className="text-red-500" /> : <UserCheck size={13} className="text-green-600" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit User Modal */}
      <UserFormModal
        open={showAddUser || showEditUser}
        onClose={() => { setShowAddUser(false); setShowEditUser(false); setSelectedUser(null) }}
        user={selectedUser}
        onSave={() => {
          success(selectedUser ? 'Pengguna diperbarui' : 'Pengguna berhasil dibuat', selectedUser ? '' : 'Akun siap digunakan')
          setShowAddUser(false); setShowEditUser(false); setSelectedUser(null)
        }}
      />

      {/* Reset Password Modal */}
      {selectedUser && (
        <ResetPasswordModal
          open={showResetPw}
          user={selectedUser}
          onClose={closeReset}
          onSave={(newPw) => {
            const cred = DEMO_CREDENTIALS[selectedUser.email as keyof typeof DEMO_CREDENTIALS]
            if (cred) cred.password = newPw
            selectedUser.must_change_password = true
            success('Password berhasil diubah', `Password baru untuk ${selectedUser.full_name} sudah aktif`)
            closeReset()
          }}
        />
      )}
    </div>
  )
}

// ─── Reset Password Modal ─────────────────────────────────────────────────────

function ResetPasswordModal({ open, user, onClose, onSave }: {
  open: boolean
  user: typeof mockUsers[0]
  onClose: () => void
  onSave: (password: string) => void
}) {
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState<{ pw?: string; confirm?: string }>({})

  function handleClose() {
    setPw(''); setConfirm(''); setErrors({})
    onClose()
  }

  function validate() {
    const e: typeof errors = {}
    if (!pw) e.pw = 'Password wajib diisi'
    else if (pw.length < 6) e.pw = 'Minimal 6 karakter'
    if (!confirm) e.confirm = 'Konfirmasi password wajib diisi'
    else if (pw !== confirm) e.confirm = 'Password tidak cocok'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSave() {
    if (validate()) onSave(pw)
  }

  return (
    <Modal open={open} onClose={handleClose} title="Set Password Baru" size="sm"
      footer={<>
        <Button variant="ghost" onClick={handleClose}>Batal</Button>
        <Button onClick={handleSave}>Simpan Password</Button>
      </>}
    >
      <div className="flex flex-col gap-4">
        {/* User info */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="w-9 h-9 rounded-full bg-[#1B3A6B] flex items-center justify-center text-white text-sm font-bold shrink-0">
            {user.full_name.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{user.full_name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </div>

        {/* Password field */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#4A5568]">
            Password Baru <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={pw}
              onChange={e => { setPw(e.target.value); setErrors(p => ({ ...p, pw: undefined })) }}
              placeholder="Minimal 6 karakter"
              className={`w-full px-3 py-2 pr-10 text-sm rounded-lg border bg-white outline-none transition-all placeholder:text-gray-400 focus:ring-2
                ${errors.pw
                  ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                  : 'border-gray-300 focus:border-[#1B3A6B] focus:ring-[#1B3A6B]/20'}`}
            />
            <button type="button" tabIndex={-1}
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errors.pw && <p className="text-xs text-red-600">{errors.pw}</p>}
        </div>

        {/* Confirm password field */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#4A5568]">
            Konfirmasi Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirm}
              onChange={e => { setConfirm(e.target.value); setErrors(p => ({ ...p, confirm: undefined })) }}
              placeholder="Ulangi password baru"
              className={`w-full px-3 py-2 pr-10 text-sm rounded-lg border bg-white outline-none transition-all placeholder:text-gray-400 focus:ring-2
                ${errors.confirm
                  ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                  : 'border-gray-300 focus:border-[#1B3A6B] focus:ring-[#1B3A6B]/20'}`}
            />
            <button type="button" tabIndex={-1}
              onClick={() => setShowConfirm(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errors.confirm && <p className="text-xs text-red-600">{errors.confirm}</p>}
        </div>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          Pengguna akan diminta mengganti password ini saat pertama kali login.
        </div>
      </div>
    </Modal>
  )
}

// ─── Add / Edit User Modal ────────────────────────────────────────────────────

function UserFormModal({ open, onClose, user, onSave }: {
  open: boolean; onClose: () => void; user: typeof mockUsers[0] | null; onSave: () => void
}) {
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    role: user?.role || 'PIC' as UserRole,
    business_units: user?.business_units || [],
    password: '',
    confirm: '',
  })
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = (k: string, v: string) => {
    setForm(p => ({ ...p, [k]: v }))
    setErrors(p => { const n = { ...p }; delete n[k]; return n })
  }

  function handleSave() {
    if (!user) {
      const e: Record<string, string> = {}
      if (!form.password) e.password = 'Password wajib diisi'
      else if (form.password.length < 6) e.password = 'Minimal 6 karakter'
      if (!form.confirm) e.confirm = 'Konfirmasi password wajib diisi'
      else if (form.password !== form.confirm) e.confirm = 'Password tidak cocok'
      if (Object.keys(e).length) { setErrors(e); return }
    }
    onSave()
  }

  return (
    <Modal open={open} onClose={onClose} title={user ? 'Edit Pengguna' : 'Tambah Pengguna Baru'} size="md"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Batal</Button>
        <Button onClick={handleSave}>{user ? 'Simpan Perubahan' : 'Buat Akun'}</Button>
      </>}
    >
      <div className="flex flex-col gap-4">
        <Input label="Nama Lengkap" required value={form.full_name}
          onChange={e => set('full_name', e.target.value)} placeholder="Nama lengkap pengguna" />
        <Input type="email" label="Email" required value={form.email}
          onChange={e => set('email', e.target.value)} placeholder="email@barokah.co.id" disabled={!!user} />
        <Select label="Role" required value={form.role} onChange={e => set('role', e.target.value)}
          options={[
            { value: 'ADMIN', label: 'Admin Sistem' },
            { value: 'MANAGEMENT', label: 'Direksi / Owner' },
            { value: 'HEAD_HSSE', label: 'Head HSSE Corporate' },
            { value: 'STAFF_HSSE', label: 'Staff HSSE' },
            { value: 'OP_HEAD', label: 'Operation Head' },
            { value: 'SITE_MGR', label: 'Site Manager' },
            { value: 'PIC', label: 'PIC' },
            { value: 'VIEWER', label: 'Viewer' },
          ]} />

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">Unit Bisnis (Scope Akses)</label>
          <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
            {mockBusinessUnits.map(bu => (
              <label key={bu.id} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-gray-300 text-[#1B3A6B]"
                  checked={form.business_units.includes(bu.id)}
                  onChange={e => setForm(p => ({
                    ...p,
                    business_units: e.target.checked ? [...p.business_units, bu.id] : p.business_units.filter(id => id !== bu.id)
                  }))}
                />
                <span className="text-sm text-gray-700">{bu.code} – {bu.name}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">Kosongkan untuk akses semua BU (Super Admin / Management)</p>
        </div>

        {/* Password fields — only shown when creating a new user */}
        {!user && (
          <>
            <div className="border-t border-gray-100 pt-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Password Awal</p>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[#4A5568]">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={form.password}
                      onChange={e => set('password', e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className={`w-full px-3 py-2 pr-10 text-sm rounded-lg border bg-white outline-none transition-all placeholder:text-gray-400 focus:ring-2
                        ${errors.password
                          ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                          : 'border-gray-300 focus:border-[#1B3A6B] focus:ring-[#1B3A6B]/20'}`}
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[#4A5568]">
                    Konfirmasi Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input type={showConfirm ? 'text' : 'password'} value={form.confirm}
                      onChange={e => set('confirm', e.target.value)}
                      placeholder="Ulangi password"
                      className={`w-full px-3 py-2 pr-10 text-sm rounded-lg border bg-white outline-none transition-all placeholder:text-gray-400 focus:ring-2
                        ${errors.confirm
                          ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                          : 'border-gray-300 focus:border-[#1B3A6B] focus:ring-[#1B3A6B]/20'}`}
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {errors.confirm && <p className="text-xs text-red-600">{errors.confirm}</p>}
                </div>
              </div>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
              Berikan password ini langsung kepada pengguna (via WA/chat). Pengguna wajib mengganti password saat pertama kali login.
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
