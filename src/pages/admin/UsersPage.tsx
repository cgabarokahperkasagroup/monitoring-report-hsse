// @ts-nocheck
import { useState, useEffect } from 'react'
import { Plus, Search, Edit, UserX, UserCheck, Key, Eye, EyeOff, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input, Select } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { supabase, supabaseClient } from '@/lib/supabase'
import { getRoleLabel, getRoleColor } from '@/utils'
import type { UserRole } from '@/types'

type DBUser = {
  id: string
  full_name: string
  email: string
  role: UserRole
  is_active: boolean
  must_change_password: boolean
  user_business_units: Array<{ business_unit_id: string }>
}
type DBBusinessUnit = { id: string; code: string; name: string }

// Extracts a human-readable error from a Supabase Edge Function invoke result.
// For non-2xx responses supabase-js returns a FunctionsHttpError whose body is on
// `error.context` (a Response), not on `data`, so we read it there too.
async function resolveFunctionError(data: any, error: any): Promise<string> {
  if (data?.error) return data.error
  const ctx = error?.context
  if (ctx && typeof ctx.json === 'function') {
    try {
      const body = await ctx.clone().json()
      if (body?.error) return body.error
    } catch { /* body not JSON */ }
  }
  return error?.message ?? 'Terjadi kesalahan'
}

export default function UsersPage() {
  const { success, error: showError } = useToast()
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('ALL')
  const [showAddUser, setShowAddUser] = useState(false)
  const [showEditUser, setShowEditUser] = useState(false)
  const [showResetPw, setShowResetPw] = useState(false)
  const [showDeleteUser, setShowDeleteUser] = useState(false)
  const [selectedUser, setSelectedUser] = useState<DBUser | null>(null)
  const [users, setUsers] = useState<DBUser[]>([])
  const [businessUnits, setBusinessUnits] = useState<DBBusinessUnit[]>([])

  async function loadData() {
    const [{ data: userData }, { data: buData }] = await Promise.all([
      supabase.from('users').select('id, full_name, email, role, is_active, must_change_password, user_business_units(business_unit_id)'),
      supabase.from('business_units').select('id, code, name').eq('is_active', true),
    ])
    if (userData) setUsers(userData as unknown as DBUser[])
    if (buData) setBusinessUnits(buData as unknown as DBBusinessUnit[])
  }

  useEffect(() => { loadData() }, [])

  const filtered = users.filter(u => {
    const matchSearch = !search || u.full_name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = filterRole === 'ALL' || u.role === filterRole
    return matchSearch && matchRole
  })

  async function handleToggleActive(u: DBUser) {
    const newActive = !u.is_active
    const { data: { session } } = await supabaseClient.auth.getSession()
    const token = session?.access_token
    if (!token) { showError('Gagal mengubah status akun', 'Sesi tidak ditemukan, silakan login ulang'); return }

    const { data, error } = await supabaseClient.functions.invoke('admin-update-user', {
      body: { user_id: u.id, is_active: newActive },
      headers: { Authorization: `Bearer ${token}` },
    })
    if (error || data?.error) {
      showError('Gagal mengubah status akun', await resolveFunctionError(data, error))
      return
    }
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: newActive } : x))
    success(newActive ? 'Akun diaktifkan' : 'Akun disuspend', u.full_name)
  }

  function openReset(u: DBUser) {
    setSelectedUser(u)
    setShowResetPw(true)
  }

  function closeReset() {
    setShowResetPw(false)
    setSelectedUser(null)
  }

  function openDelete(u: DBUser) {
    setSelectedUser(u)
    setShowDeleteUser(true)
  }

  function closeDelete() {
    setShowDeleteUser(false)
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
          const count = users.filter(u => u.role === role).length
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
                      {(u.user_business_units?.length ?? 0) === 0 ? (
                        <span className="text-gray-400 italic">Semua BU</span>
                      ) : (
                        (u.user_business_units || []).slice(0, 2).map(ub => businessUnits.find(b => b.id === ub.business_unit_id)?.code).join(', ') +
                        ((u.user_business_units?.length ?? 0) > 2 ? ` +${(u.user_business_units?.length ?? 0) - 2}` : '')
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
                          onClick={() => handleToggleActive(u)}>
                          {u.is_active ? <UserX size={13} className="text-red-500" /> : <UserCheck size={13} className="text-green-600" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openDelete(u)} title="Hapus pengguna">
                          <Trash2 size={13} className="text-red-400 hover:text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">Tidak ada pengguna yang cocok</td></tr>
                )}
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
        businessUnits={businessUnits}
        onSaved={() => {
          success(selectedUser ? 'Pengguna diperbarui' : 'Pengguna berhasil dibuat', '')
          setShowAddUser(false); setShowEditUser(false); setSelectedUser(null)
          loadData()
        }}
        onError={(msg) => showError('Gagal menyimpan', msg)}
      />

      {/* Reset Password Modal */}
      {selectedUser && showResetPw && (
        <ResetPasswordModal
          open={showResetPw}
          user={selectedUser}
          onClose={closeReset}
          onSaved={() => {
            success('Password berhasil direset', `Password baru telah disetel untuk ${selectedUser.full_name}`)
            closeReset()
          }}
          onError={(msg) => showError('Gagal reset password', msg)}
        />
      )}

      {/* Delete User Modal */}
      {selectedUser && showDeleteUser && (
        <DeleteUserModal
          open={showDeleteUser}
          user={selectedUser}
          onClose={closeDelete}
          onDeleted={() => {
            setUsers(prev => prev.filter(u => u.id !== selectedUser.id))
            success('Pengguna dihapus', selectedUser.full_name)
            closeDelete()
          }}
          onError={(msg) => showError('Gagal menghapus pengguna', msg)}
        />
      )}
    </div>
  )
}

// ─── Reset Password Modal ─────────────────────────────────────────────────────

function ResetPasswordModal({ open, user, onClose, onSaved, onError }: {
  open: boolean
  user: DBUser
  onClose: () => void
  onSaved: () => void
  onError: (msg: string) => void
}) {
  const [loading, setLoading] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function resetForm() {
    setNewPassword('')
    setConfirmPassword('')
    setShowPw(false)
    setShowConfirm(false)
    setErrors({})
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  async function handleSave() {
    const e: Record<string, string> = {}
    if (!newPassword) e.newPassword = 'Password baru wajib diisi'
    else if (newPassword.length < 6) e.newPassword = 'Minimal 6 karakter'
    if (!confirmPassword) e.confirmPassword = 'Konfirmasi password wajib diisi'
    else if (newPassword !== confirmPassword) e.confirmPassword = 'Password tidak cocok'
    if (Object.keys(e).length) { setErrors(e); return }

    setLoading(true)
    const { data: { session } } = await supabaseClient.auth.getSession()
    const token = session?.access_token
    if (!token) { onError('Sesi tidak ditemukan, silakan login ulang'); setLoading(false); return }

    const { data, error } = await supabaseClient.functions.invoke('admin-reset-password', {
      body: { user_id: user.id, new_password: newPassword },
      headers: { Authorization: `Bearer ${token}` },
    })
    setLoading(false)
    if (error || data?.error) {
      onError(await resolveFunctionError(data, error))
      return
    }
    resetForm()
    onSaved()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Reset Password Pengguna" size="sm"
      footer={<>
        <Button variant="ghost" onClick={handleClose} disabled={loading}>Batal</Button>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
        </Button>
      </>}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="w-9 h-9 rounded-full bg-[#1B3A6B] flex items-center justify-center text-white text-sm font-bold shrink-0">
            {user.full_name.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{user.full_name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Password Baru <span className="text-red-500">*</span></label>
          <div className="relative">
            <input type={showPw ? 'text' : 'password'} value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setErrors(p => { const n = {...p}; delete n.newPassword; return n }) }}
              placeholder="Minimal 6 karakter"
              className={`w-full px-3 py-2 pr-10 text-sm rounded-lg border bg-white outline-none transition-all placeholder:text-gray-400 focus:ring-2
                ${errors.newPassword ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : 'border-gray-300 focus:border-[#1B3A6B] focus:ring-[#1B3A6B]/20'}`}
            />
            <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errors.newPassword && <p className="text-xs text-red-600">{errors.newPassword}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Konfirmasi Password <span className="text-red-500">*</span></label>
          <div className="relative">
            <input type={showConfirm ? 'text' : 'password'} value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setErrors(p => { const n = {...p}; delete n.confirmPassword; return n }) }}
              placeholder="Ulangi password baru"
              className={`w-full px-3 py-2 pr-10 text-sm rounded-lg border bg-white outline-none transition-all placeholder:text-gray-400 focus:ring-2
                ${errors.confirmPassword ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : 'border-gray-300 focus:border-[#1B3A6B] focus:ring-[#1B3A6B]/20'}`}
            />
            <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-xs text-red-600">{errors.confirmPassword}</p>}
        </div>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          Password baru akan langsung aktif. Pengguna akan diminta mengganti password saat login berikutnya.
        </div>
      </div>
    </Modal>
  )
}

// ─── Delete User Modal ────────────────────────────────────────────────────────

function DeleteUserModal({ open, user, onClose, onDeleted, onError }: {
  open: boolean
  user: DBUser
  onClose: () => void
  onDeleted: () => void
  onError: (msg: string) => void
}) {
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const { data: { session } } = await supabaseClient.auth.getSession()
    const token = session?.access_token
    if (!token) { onError('Sesi tidak ditemukan, silakan login ulang'); setLoading(false); return }

    const { data, error } = await supabaseClient.functions.invoke('admin-delete-user', {
      body: { user_id: user.id },
      headers: { Authorization: `Bearer ${token}` },
    })
    setLoading(false)
    if (error || data?.error) {
      onError(await resolveFunctionError(data, error))
      return
    }
    onDeleted()
  }

  return (
    <Modal open={open} onClose={onClose} title="Hapus Pengguna" size="sm"
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={loading}>Batal</Button>
        <Button onClick={handleDelete} disabled={loading}
          className="!bg-red-600 hover:!bg-red-700 !text-white">
          {loading ? 'Menghapus...' : 'Ya, Hapus Pengguna'}
        </Button>
      </>}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-sm font-bold shrink-0">
            {user.full_name.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{user.full_name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </div>
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          <p className="font-semibold mb-1">Tindakan ini tidak dapat dibatalkan!</p>
          <p>Akun pengguna ini beserta semua data terkait akan dihapus secara permanen dari sistem.</p>
        </div>
      </div>
    </Modal>
  )
}

// ─── Add / Edit User Modal ────────────────────────────────────────────────────

function UserFormModal({ open, onClose, user, businessUnits, onSaved, onError }: {
  open: boolean; onClose: () => void; user: DBUser | null; businessUnits: DBBusinessUnit[]
  onSaved: () => void; onError: (msg: string) => void
}) {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    role: 'PIC' as UserRole,
    business_units: [] as string[],
    password: '',
    confirm: '',
  })
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({
        full_name: user?.full_name || '',
        email: user?.email || '',
        role: user?.role || 'PIC',
        business_units: user?.user_business_units?.map(ub => ub.business_unit_id) || [],
        password: '',
        confirm: '',
      })
      setErrors({})
    }
  }, [open, user])

  const setField = (k: string, v: string) => {
    setForm(p => ({ ...p, [k]: v }))
    setErrors(p => { const n = { ...p }; delete n[k]; return n })
  }

  async function handleSave() {
    const e: Record<string, string> = {}
    if (!form.full_name.trim()) e.full_name = 'Nama wajib diisi'
    if (!form.email.trim()) e.email = 'Email wajib diisi'
    if (!user) {
      if (!form.password) e.password = 'Password wajib diisi'
      else if (form.password.length < 6) e.password = 'Minimal 6 karakter'
      if (!form.confirm) e.confirm = 'Konfirmasi password wajib diisi'
      else if (form.password !== form.confirm) e.confirm = 'Password tidak cocok'
    }
    if (Object.keys(e).length) { setErrors(e); return }

    setLoading(true)
    try {
      const { data: { session } } = await supabaseClient.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Sesi tidak ditemukan, silakan login ulang')

      if (user) {
        const { data, error } = await supabaseClient.functions.invoke('admin-update-user', {
          body: {
            user_id: user.id,
            full_name: form.full_name,
            role: form.role,
            business_units: form.business_units,
          },
          headers: { Authorization: `Bearer ${token}` },
        })
        if (error || data?.error) throw new Error(await resolveFunctionError(data, error))
      } else {
        const { data, error } = await supabaseClient.functions.invoke('admin-create-user', {
          body: {
            email: form.email,
            password: form.password,
            full_name: form.full_name,
            role: form.role,
            business_units: form.business_units,
          },
          headers: { Authorization: `Bearer ${token}` },
        })
        if (error || data?.error) throw new Error(await resolveFunctionError(data, error))
      }
      onSaved()
    } catch (err: any) {
      onError(err.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={user ? 'Edit Pengguna' : 'Tambah Pengguna Baru'} size="md"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Batal</Button>
        <Button onClick={handleSave} disabled={loading}>{loading ? 'Menyimpan...' : user ? 'Simpan Perubahan' : 'Buat Akun'}</Button>
      </>}
    >
      <div className="flex flex-col gap-4">
        <Input label="Nama Lengkap" required value={form.full_name}
          onChange={e => setField('full_name', e.target.value)}
          placeholder="Nama lengkap pengguna"
          error={errors.full_name} />
        <Input type="email" label="Email" required value={form.email}
          onChange={e => setField('email', e.target.value)}
          placeholder="email@barokah.co.id"
          disabled={!!user}
          error={errors.email} />
        <Select label="Role" required value={form.role} onChange={e => setField('role', e.target.value)}
          options={[
            { value: 'SUPER_ADMIN', label: 'Super Admin' },
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
            {businessUnits.map(bu => (
              <label key={bu.id} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-gray-300 text-[#1B3A6B]"
                  checked={form.business_units.includes(bu.id)}
                  onChange={e => setForm(p => ({
                    ...p,
                    business_units: e.target.checked
                      ? [...p.business_units, bu.id]
                      : p.business_units.filter(id => id !== bu.id)
                  }))}
                />
                <span className="text-sm text-gray-700">{bu.code} – {bu.name}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">Kosongkan untuk akses semua BU (Super Admin / Management)</p>
        </div>

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
                      onChange={e => setField('password', e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className={`w-full px-3 py-2 pr-10 text-sm rounded-lg border bg-white outline-none transition-all placeholder:text-gray-400 focus:ring-2
                        ${errors.password ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : 'border-gray-300 focus:border-[#1B3A6B] focus:ring-[#1B3A6B]/20'}`}
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
                      onChange={e => setField('confirm', e.target.value)}
                      placeholder="Ulangi password"
                      className={`w-full px-3 py-2 pr-10 text-sm rounded-lg border bg-white outline-none transition-all placeholder:text-gray-400 focus:ring-2
                        ${errors.confirm ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : 'border-gray-300 focus:border-[#1B3A6B] focus:ring-[#1B3A6B]/20'}`}
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
              Pengguna akan menerima email konfirmasi. Password ini bersifat sementara — pengguna wajib menggantinya saat pertama kali login.
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
