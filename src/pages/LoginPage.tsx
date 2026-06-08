import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, CheckSquare, Square } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

const DEMO_ACCOUNTS = [
  { email: 'superadmin@barokah.co.id', role: 'Super Admin' },
  { email: 'direktur@barokah.co.id',   role: 'Direksi / Management' },
  { email: 'admin@barokah.co.id',      role: 'Admin' },
  { email: 'head.hsse@barokah.co.id',  role: 'Head HSSE Corporate' },
  { email: 'hse1@barokah.co.id',       role: 'Staff HSSE' },
  { email: 'ophead1@barokah.co.id',    role: 'Operation Head' },
  { email: 'sitemgr@barokah.co.id',    role: 'Site Manager' },
  { email: 'pic1@barokah.co.id',       role: 'PIC' },
  { email: 'viewer@barokah.co.id',     role: 'Viewer' },
]

// ─── Decorative dashboard mockup shown on the right panel ────────────────────

function DashboardMockup() {
  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ fontSize: 0 }}>
        {/* Mockup top bar */}
        <div className="bg-gray-100 px-4 py-2.5 flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          <div className="ml-3 flex-1 bg-white rounded-full h-4 opacity-60" />
        </div>

        <div className="flex" style={{ fontSize: '1rem' }}>
          {/* Sidebar mockup */}
          <div className="w-12 bg-[#1B3A6B] flex flex-col items-center py-4 gap-3 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="BPG" className="w-6 h-6 object-contain" />
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`w-5 h-1 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/30'}`} />
            ))}
          </div>

          {/* Content mockup */}
          <div className="flex-1 bg-gray-50 p-3">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="w-28 h-3 bg-gray-800 rounded-full" />
                <div className="w-20 h-2 bg-gray-400 rounded-full mt-1.5" />
              </div>
              <div className="w-7 h-7 rounded-full bg-[#1B3A6B]" />
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { color: '#1B3A6B', val: '24', label: 'Total Kunjungan' },
                { color: '#D35400', val: '8',  label: 'Temuan Aktif' },
                { color: '#1A7A4A', val: '75%', label: 'Achievement' },
              ].map((c, i) => (
                <div key={i} className="bg-white rounded-lg p-2 shadow-sm border-l-2" style={{ borderColor: c.color }}>
                  <div className="text-xs font-bold" style={{ color: c.color }}>{c.val}</div>
                  <div className="text-[8px] text-gray-400 mt-0.5">{c.label}</div>
                </div>
              ))}
            </div>

            {/* Chart area */}
            <div className="grid grid-cols-5 gap-2 mb-3">
              <div className="col-span-3 bg-white rounded-lg p-2 shadow-sm">
                <div className="w-16 h-2 bg-gray-200 rounded-full mb-2" />
                {/* Fake line chart */}
                <svg viewBox="0 0 100 40" className="w-full h-10">
                  <polyline
                    points="0,35 15,25 30,30 45,15 60,20 75,10 90,18 100,12"
                    fill="none" stroke="#1B3A6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  />
                  <polyline
                    points="0,35 15,25 30,30 45,15 60,20 75,10 90,18 100,12"
                    fill="url(#grad)" stroke="none"
                  />
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1B3A6B" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#1B3A6B" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className="col-span-2 bg-white rounded-lg p-2 shadow-sm">
                <div className="w-10 h-2 bg-gray-200 rounded-full mb-2" />
                {/* Fake pie */}
                <div className="flex items-center justify-center">
                  <svg viewBox="0 0 40 40" className="w-10 h-10">
                    <circle cx="20" cy="20" r="15" fill="none" stroke="#1A7A4A" strokeWidth="6" strokeDasharray="60 40" strokeDashoffset="0" />
                    <circle cx="20" cy="20" r="15" fill="none" stroke="#D35400" strokeWidth="6" strokeDasharray="25 75" strokeDashoffset="-60" />
                    <circle cx="20" cy="20" r="15" fill="none" stroke="#C0392B" strokeWidth="6" strokeDasharray="15 85" strokeDashoffset="-85" />
                    <circle cx="20" cy="20" r="8" fill="white" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Table rows */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-2 py-1.5 border-b border-gray-100">
                <div className="w-12 h-2 bg-gray-300 rounded-full" />
                <div className="flex-1 h-2 bg-gray-200 rounded-full" />
                <div className="w-8 h-2 bg-gray-200 rounded-full" />
                <div className="w-10 h-2 bg-gray-200 rounded-full" />
              </div>
              {[
                { color: '#D35400', w1: 60, w2: 30 },
                { color: '#1A7A4A', w1: 45, w2: 25 },
                { color: '#C8922A', w1: 70, w2: 35 },
                { color: '#1A7A4A', w1: 50, w2: 28 },
              ].map((row, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1.5 border-b border-gray-50 last:border-0">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: row.color + '30' }}>
                    <div className="w-1.5 h-1.5 rounded-full m-auto mt-[3px]" style={{ backgroundColor: row.color }} />
                  </div>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full" style={{ width: `${row.w1}%` }} />
                  <div className="h-3 rounded-full px-1.5 text-[6px] font-bold flex items-center" style={{ backgroundColor: row.color + '20', color: row.color }}>
                    {i === 0 ? 'Open' : i === 2 ? 'Overdue' : 'Closed'}
                  </div>
                  <div className="w-8 h-2 bg-gray-100 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Login Page ───────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [remember, setRemember] = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Email dan password wajib diisi'); return }
    setLoading(true)
    const result = await login(email, password)
    setLoading(false)
    if (result.success) navigate('/dashboard')
    else setError(result.error || 'Login gagal. Periksa kembali email dan password Anda.')
  }

  return (
    <div className="min-h-screen flex bg-white">

      {/* ── Left: form panel ─────────────────────────────────────────────────── */}
      <div className="flex flex-col w-full lg:w-[45%] px-8 sm:px-14 py-10 relative">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-12">
          <img src="/logo.png" alt="BPG" className="h-11 w-11 object-contain shrink-0" />
          <div>
            <p className="font-bold text-[#1B3A6B] text-sm leading-tight">Barokah Perkasa Group</p>
            <p className="text-gray-400 text-xs">Sistem Monitoring HSSE</p>
          </div>
        </div>

        {/* Form area */}
        <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Selamat Datang Kembali</h1>
          <p className="text-sm text-gray-500 mb-8">Masukkan email dan password untuk mengakses sistem.</p>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-5">
              <AlertCircle size={15} className="text-red-600 shrink-0" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@barokah.co.id"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#1B3A6B]/15 outline-none transition-all placeholder:text-gray-400"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <button type="button" className="text-xs font-medium text-[#1B3A6B] hover:underline">
                  Lupa Password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full px-3.5 py-2.5 pr-11 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#1B3A6B]/15 outline-none transition-all placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <button
              type="button"
              onClick={() => setRemember(!remember)}
              className="flex items-center gap-2 w-fit"
            >
              {remember
                ? <CheckSquare size={16} className="text-[#1B3A6B]" />
                : <Square size={16} className="text-gray-300" />
              }
              <span className="text-sm text-gray-600">Ingat Saya</span>
            </button>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all shadow-sm hover:shadow-md hover:opacity-90 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed mt-1"
              style={{ backgroundColor: '#1B3A6B' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Memproses…
                </span>
              ) : 'Masuk'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 shrink-0">Demo Akun (password: admin123)</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map(acc => (
                <button
                  key={acc.email}
                  onClick={() => { setEmail(acc.email); setPassword('admin123') }}
                  className="text-left px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 hover:border-[#1B3A6B]/40 hover:bg-blue-50 transition-all group"
                >
                  <p className="text-xs font-semibold text-[#1B3A6B] leading-tight">{acc.role}</p>
                  <p className="text-[10px] text-gray-400 truncate mt-0.5">{acc.email.split('@')[0]}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-10">
          <p className="text-xs text-gray-400">© 2025 Barokah Perkasa Group</p>
          <a href="#" className="text-xs text-gray-400 hover:text-gray-600 hover:underline">Kebijakan Privasi</a>
        </div>
      </div>

      {/* ── Right: showcase panel ─────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col flex-1 relative overflow-hidden p-12 justify-between"
        style={{ backgroundColor: '#1B3A6B' }}
      >
        {/* Decorative circles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, white, transparent)' }} />
          <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, white, transparent)' }} />
          <div className="absolute top-1/2 right-1/4 w-48 h-48 rounded-full border border-white/10" />
          <div className="absolute top-1/3 right-1/3 w-72 h-72 rounded-full border border-white/5" />
        </div>

        {/* Tagline */}
        <div className="relative">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4" style={{ backgroundColor: '#C8922A', color: 'white' }}>
            Sistem Monitoring HSSE
          </span>
          <h2 className="text-3xl font-bold text-white leading-snug max-w-md">
            Kelola visit, inspeksi, dan temuan HSSE secara terpadu.
          </h2>
          <p className="text-blue-200 text-sm mt-3 max-w-sm leading-relaxed">
            Platform real-time untuk mencatat, mengelola, dan memonitor seluruh kegiatan HSSE armada dan unit bisnis Barokah Perkasa Group.
          </p>
        </div>

        {/* Dashboard mockup card */}
        <div className="relative flex-1 flex items-center">
          <div className="w-full transform rotate-0 transition-transform">
            <DashboardMockup />
          </div>
        </div>

        {/* Stats row at bottom */}
        <div className="relative grid grid-cols-3 gap-4">
          {[
            { label: 'Unit Bisnis',     value: '8' },
            { label: 'Armada Kapal',    value: '3+' },
            { label: 'Jenis Inspeksi',  value: '5' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
              <p className="text-xl font-bold" style={{ color: '#C8922A' }}>{s.value}</p>
              <p className="text-blue-200 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
