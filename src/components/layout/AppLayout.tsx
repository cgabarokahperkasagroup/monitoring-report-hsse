import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom'
import { Bell, AlertCircle, CheckCircle2, Info, AlertTriangle, Settings, LogOut, ChevronDown } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationsData } from '@/hooks/useNotificationsData'
import { useRef, useState, useEffect } from 'react'
import { formatDateTime, getRoleLabel } from '@/utils'

// ─── Page metadata ────────────────────────────────────────────────────────────

interface PageMeta {
  title: string
  subtitle?: string
  breadcrumb: { label: string; to?: string }[]
}

const pageMeta: { pattern: RegExp; meta: PageMeta }[] = [
  {
    pattern: /^\/dashboard$/,
    meta: {
      title: 'Dashboard',
      subtitle: 'Sistem Monitoring HSSE – Barokah Perkasa Group',
      breadcrumb: [],
    },
  },
  {
    pattern: /^\/visits\/new$/,
    meta: {
      title: 'Buat Kunjungan Baru',
      subtitle: 'Tambahkan laporan kunjungan baru',
      breadcrumb: [{ label: 'Kunjungan', to: '/visits' }, { label: 'Buat Baru' }],
    },
  },
  {
    pattern: /^\/visits\/[^/]+$/,
    meta: {
      title: 'Detail Kunjungan',
      subtitle: 'Informasi lengkap kunjungan',
      breadcrumb: [{ label: 'Kunjungan', to: '/visits' }, { label: 'Detail' }],
    },
  },
  {
    pattern: /^\/visits$/,
    meta: {
      title: 'Daftar Kunjungan',
      subtitle: 'Kelola seluruh kunjungan manajemen',
      breadcrumb: [{ label: 'Kunjungan' }],
    },
  },
  {
    pattern: /^\/findings\/my-findings$/,
    meta: {
      title: 'Temuan Saya',
      subtitle: 'Temuan yang ditugaskan kepada Anda',
      breadcrumb: [{ label: 'Temuan', to: '/findings' }, { label: 'Ditugaskan ke Saya' }],
    },
  },
  {
    pattern: /^\/findings\/[^/]+$/,
    meta: {
      title: 'Detail Temuan',
      subtitle: 'Informasi lengkap dan riwayat tindakan',
      breadcrumb: [{ label: 'Temuan', to: '/findings' }, { label: 'Detail' }],
    },
  },
  {
    pattern: /^\/findings$/,
    meta: {
      title: 'Daftar Temuan',
      subtitle: 'Kelola temuan dari seluruh kunjungan',
      breadcrumb: [{ label: 'Temuan' }],
    },
  },
  {
    pattern: /^\/vessel-compliance$/,
    meta: {
      title: 'Kepatuhan Kunjungan Kapal',
      subtitle: 'Monitor kewajiban kunjungan kapal per Operation Head',
      breadcrumb: [{ label: 'Kepatuhan Kapal' }],
    },
  },
  {
    pattern: /^\/owner-findings$/,
    meta: {
      title: 'Owner Visit Findings',
      subtitle: 'Temuan prioritas dari kunjungan Owner/Direksi',
      breadcrumb: [{ label: 'Temuan', to: '/findings' }, { label: 'Owner Visit' }],
    },
  },
  {
    pattern: /^\/reports$/,
    meta: {
      title: 'Laporan & Export',
      subtitle: 'Generate dan download laporan',
      breadcrumb: [{ label: 'Laporan' }],
    },
  },
  {
    pattern: /^\/notifications$/,
    meta: {
      title: 'Notifikasi',
      subtitle: 'Pusat notifikasi dan alert sistem',
      breadcrumb: [{ label: 'Notifikasi' }],
    },
  },
  {
    pattern: /^\/admin\/users$/,
    meta: {
      title: 'Manajemen Pengguna',
      subtitle: 'Kelola akun dan hak akses pengguna',
      breadcrumb: [{ label: 'Admin' }, { label: 'Pengguna' }],
    },
  },
  {
    pattern: /^\/admin\/master-data$/,
    meta: {
      title: 'Master Data',
      subtitle: 'Kelola BU, Fleet, Kapal, Site, dan Kategori Temuan',
      breadcrumb: [{ label: 'Admin' }, { label: 'Master Data' }],
    },
  },
  {
    pattern: /^\/inspections\/internal\/new$/,
    meta: {
      title: 'Buat Inspeksi Internal',
      subtitle: 'Isi form checklist inspeksi internal kapal',
      breadcrumb: [{ label: 'Inspeksi Kapal' }, { label: 'Inspeksi Internal', to: '/inspections/internal' }, { label: 'Buat Baru' }],
    },
  },
  {
    pattern: /^\/inspections\/internal\/[^/]+$/,
    meta: {
      title: 'Detail Inspeksi Internal',
      subtitle: 'Hasil dan temuan inspeksi internal kapal',
      breadcrumb: [{ label: 'Inspeksi Kapal' }, { label: 'Inspeksi Internal', to: '/inspections/internal' }, { label: 'Detail' }],
    },
  },
  {
    pattern: /^\/inspections\/internal$/,
    meta: {
      title: 'Inspeksi Internal Kapal',
      subtitle: 'Riwayat dan hasil inspeksi internal armada kapal',
      breadcrumb: [{ label: 'Inspeksi Kapal' }, { label: 'Inspeksi Internal' }],
    },
  },
  {
    pattern: /^\/inspections\/external\/new$/,
    meta: {
      title: 'Buat Inspeksi Eksternal',
      subtitle: 'Catat hasil inspeksi SIRE, BIRE, Vetting PSA, IMCA, atau lainnya',
      breadcrumb: [{ label: 'Inspeksi Kapal' }, { label: 'Inspeksi Eksternal', to: '/inspections/external' }, { label: 'Buat Baru' }],
    },
  },
  {
    pattern: /^\/inspections\/external\/[^/]+$/,
    meta: {
      title: 'Detail Inspeksi Eksternal',
      subtitle: 'Hasil inspeksi SIRE / BIRE / Vetting PSA / IMCA',
      breadcrumb: [{ label: 'Inspeksi Kapal' }, { label: 'Inspeksi Eksternal', to: '/inspections/external' }, { label: 'Detail' }],
    },
  },
  {
    pattern: /^\/inspections\/external$/,
    meta: {
      title: 'Inspeksi Eksternal Kapal',
      subtitle: 'Riwayat inspeksi SIRE, BIRE, Vetting PSA, dan IMCA',
      breadcrumb: [{ label: 'Inspeksi Kapal' }, { label: 'Inspeksi Eksternal' }],
    },
  },
  {
    pattern: /^\/profile$/,
    meta: {
      title: 'Pengaturan Profil',
      subtitle: 'Ubah password dan preferensi akun',
      breadcrumb: [{ label: 'Profil' }],
    },
  },
]

function getPageMeta(pathname: string): PageMeta {
  for (const { pattern, meta } of pageMeta) {
    if (pattern.test(pathname)) return meta
  }
  return { title: 'Monitoring Visit', subtitle: 'Barokah Perkasa Group', breadcrumb: [] }
}

// ─── Notification type icons ───────────────────────────────────────────────────

function NotifIcon({ type }: { type: string }) {
  const base = 'w-7 h-7 rounded-full flex items-center justify-center shrink-0'
  switch (type) {
    case 'FINDING_OVERDUE':
    case 'FINDING_CRITICAL':
      return <div className={`${base} bg-red-100`}><AlertCircle size={14} className="text-red-500" /></div>
    case 'FINDING_CLOSED':
      return <div className={`${base} bg-green-100`}><CheckCircle2 size={14} className="text-green-600" /></div>
    case 'VISIT_SUBMITTED':
    case 'CLOSING_REVIEW':
      return <div className={`${base} bg-amber-100`}><AlertTriangle size={14} className="text-amber-600" /></div>
    default:
      return <div className={`${base} bg-blue-100`}><Info size={14} className="text-blue-500" /></div>
  }
}

// ─── Notification Bell with dropdown ──────────────────────────────────────────

function NotificationBell() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { notifications, unreadCount, markAllRead } = useNotificationsData(user?.id)
  const unread = unreadCount
  const recent = notifications.slice(0, 5)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(prev => !prev)}
        className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Notifikasi</h3>
            {unread > 0 && (
              <span className="text-xs text-white bg-red-500 rounded-full px-2 py-0.5 font-semibold">
                {unread} baru
              </span>
            )}
          </div>

          <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
            {recent.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">Tidak ada notifikasi</p>
            ) : (
              recent.map(n => (
                <div
                  key={n.id}
                  className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-blue-50/40' : ''}`}
                  onClick={() => {
                    setOpen(false)
                    if (n.related_type === 'finding') navigate(`/findings/${n.related_id}`)
                    else if (n.related_type === 'visit') navigate(`/visits/${n.related_id}`)
                    else navigate('/notifications')
                  }}
                >
                  <NotifIcon type={n.type} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs leading-snug ${n.is_read ? 'text-gray-600' : 'text-gray-800 font-medium'}`}>
                      {n.message}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{formatDateTime(n.created_at)}</p>
                  </div>
                  {!n.is_read && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />}
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50">
            <button className="text-xs text-gray-500 hover:text-gray-700" onClick={markAllRead}>Tandai Semua Dibaca</button>
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-[#1B3A6B] hover:underline"
            >
              Lihat Semua →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── User Menu Dropdown ───────────────────────────────────────────────────────

function UserMenu() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLogout = () => {
    setOpen(false)
    logout().then(() => navigate('/login'))
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-2.5 pl-3 border-l border-gray-200 hover:bg-gray-50 rounded-lg px-2 py-1.5 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-[#1B3A6B] flex items-center justify-center text-white text-sm font-bold shrink-0">
          {user?.full_name?.charAt(0) || 'U'}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-xs font-semibold text-gray-800 leading-tight">{user?.full_name}</p>
          <p className="text-[10px] text-gray-500">{user?.email}</p>
        </div>
        <ChevronDown size={14} className={`text-gray-400 transition-transform hidden sm:block ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-800">{getRoleLabel(user?.role ?? 'VIEWER')}</p>
          </div>
          <div className="py-1">
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Settings size={15} className="text-gray-400" />
              Pengaturan Profil
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={15} className="text-red-400" />
              Keluar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── App Layout ───────────────────────────────────────────────────────────────

export function AppLayout() {
  const { pathname } = useLocation()
  const meta = getPageMeta(pathname)

  return (
    <div className="flex h-screen overflow-hidden bg-[#F2F5F9]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between shrink-0 z-10 shadow-sm">
          <div>
            {meta.breadcrumb.length > 0 && (
              <div className="mb-0.5">
                <Breadcrumb items={meta.breadcrumb} />
              </div>
            )}
            <h1 className="text-lg font-bold text-[#1B3A6B] leading-tight">{meta.title}</h1>
            {meta.subtitle && <p className="text-xs text-gray-500 mt-0.5">{meta.subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <UserMenu />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-screen-2xl mx-auto px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
