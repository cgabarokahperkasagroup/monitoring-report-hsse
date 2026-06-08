import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, ClipboardList, AlertTriangle, Ship, Star, FileBarChart2,
  Bell, Users, Database, ChevronDown, ChevronRight,
  ClipboardCheck, Shield, CalendarDays, MessageSquareX
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/types'

interface NavItem {
  label: string
  icon: React.ElementType
  to?: string
  children?: NavItem[]
  minRole?: UserRole[]
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  {
    label: 'Manajemen Visit', icon: ClipboardList,
    children: [
      { label: 'Visit', icon: ClipboardList, to: '/visits' },
      { label: 'Temuan', icon: AlertTriangle, to: '/findings' },
      { label: 'Performance Operation Visit', icon: Ship, to: '/vessel-compliance', minRole: ['SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'OP_HEAD', 'VIEWER'] },
      { label: 'Owner Visit Findings', icon: Star, to: '/owner-findings', minRole: ['SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'OP_HEAD', 'SITE_MGR'] },
    ]
  },
  {
    label: 'Inspeksi Kapal', icon: ClipboardCheck,
    minRole: ['SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'HEAD_HSSE', 'OP_HEAD', 'VIEWER'],
    children: [
      { label: 'Rencana & Realisasi', icon: CalendarDays, to: '/inspections/schedule', minRole: ['SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'HEAD_HSSE', 'OP_HEAD', 'VIEWER'] },
      { label: 'Inspeksi Internal', icon: ClipboardCheck, to: '/inspections/internal', minRole: ['SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'HEAD_HSSE', 'OP_HEAD', 'VIEWER'] },
      { label: 'Inspeksi Eksternal', icon: Shield, to: '/inspections/external', minRole: ['SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'HEAD_HSSE', 'OP_HEAD', 'VIEWER'] },
    ]
  },
  {
    label: 'Monitoring NFB & Vetting', icon: MessageSquareX,
    minRole: ['SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'HEAD_HSSE', 'OP_HEAD', 'VIEWER'],
    to: '/nfb-vetting',
  },
  { label: 'Laporan & Export', icon: FileBarChart2, to: '/reports', minRole: ['SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'HEAD_HSSE', 'OP_HEAD', 'SITE_MGR', 'VIEWER'] },
  { label: 'Notifikasi', icon: Bell, to: '/notifications' },
  {
    label: 'Admin', icon: Database,
    minRole: ['SUPER_ADMIN'],
    children: [
      { label: 'Pengguna', icon: Users, to: '/admin/users', minRole: ['SUPER_ADMIN'] },
      { label: 'Master Data', icon: Database, to: '/admin/master-data', minRole: ['SUPER_ADMIN'] },
    ]
  },
]

function canAccess(item: NavItem, role: UserRole): boolean {
  if (!item.minRole) return true
  return item.minRole.includes(role)
}

function NavItemComponent({ item, role }: { item: NavItem; role: UserRole }) {
  const location = useLocation()
  const locationState = location.state as { from?: string } | null

  const isChildActive = (childTo: string) => {
    if (locationState?.from) return locationState.from === childTo
    return location.pathname.startsWith(childTo)
  }

  const hasActiveChild = item.children?.some(c => c.to && isChildActive(c.to))
  const [open, setOpen] = useState(hasActiveChild ?? false)

  useEffect(() => {
    if (hasActiveChild) setOpen(true)
  }, [location.pathname, hasActiveChild])

  if (!canAccess(item, role)) return null

  if (item.children) {
    const visibleChildren = item.children.filter(c => canAccess(c, role))
    if (visibleChildren.length === 0) return null

    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            'sidebar-link w-full justify-between',
            hasActiveChild && 'sidebar-link-parent-active'
          )}
        >
          <div className="flex items-center gap-3">
            <item.icon size={18} />
            <span>{item.label}</span>
          </div>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {open && (
          <div className="ml-4 mt-1 flex flex-col gap-0.5 pl-3 border-l border-white/20">
            {visibleChildren.map(child => (
              <NavLink
                key={child.to}
                to={child.to!}
                className={() => cn(
                  'sidebar-link text-xs py-2 gap-2',
                  isChildActive(child.to!) && 'active'
                )}
              >
                <child.icon size={14} className="shrink-0" />
                <span>{child.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <NavLink
      to={item.to!}
      className={({ isActive }) => cn('sidebar-link', isActive && 'active')}
    >
      <item.icon size={18} />
      <span>{item.label}</span>
    </NavLink>
  )
}

export function Sidebar() {
  const { user } = useAuthStore()

  if (!user) return null

  return (
    <aside className="w-64 h-screen sticky top-0 flex-shrink-0 flex flex-col" style={{ backgroundColor: '#1B3A6B' }}>
      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="BPG" className="h-9 w-9 object-contain brightness-0 invert shrink-0" />
          <div>
            <p className="text-white font-bold text-sm leading-tight">Barokah Perkasa</p>
            <p className="text-blue-200 text-xs">Group</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {navItems.map((item, idx) => (
          <NavItemComponent key={idx} item={item} role={user.role} />
        ))}
      </nav>
    </aside>
  )
}
