import type { UserRole, FindingStatus, FindingPriority, VisitStatus, VisitType, ActionType } from '@/types'

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    SUPER_ADMIN: 'Super Admin',
    ADMIN: 'Admin Sistem',
    MANAGEMENT: 'Direksi / Owner',
    HEAD_HSSE: 'Head HSSE Corporate',
    STAFF_HSSE: 'Staff HSSE',
    OP_HEAD: 'Operation Head',
    SITE_MGR: 'Site Manager',
    PIC: 'PIC',
    VIEWER: 'Viewer',
  }
  return labels[role] || role
}

export function getRoleColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    SUPER_ADMIN: 'bg-purple-100 text-purple-800',
    ADMIN: 'bg-blue-100 text-blue-800',
    MANAGEMENT: 'bg-amber-100 text-amber-800',
    HEAD_HSSE: 'bg-red-100 text-red-800',
    STAFF_HSSE: 'bg-orange-100 text-orange-800',
    OP_HEAD: 'bg-navy-light/10 text-navy-primary',
    SITE_MGR: 'bg-green-100 text-green-800',
    PIC: 'bg-teal-100 text-teal-800',
    VIEWER: 'bg-gray-100 text-gray-700',
  }
  return colors[role] || 'bg-gray-100 text-gray-700'
}

export function getStatusLabel(status: FindingStatus | VisitStatus): string {
  const labels: Record<string, string> = {
    OPEN: 'Terbuka',
    IN_PROGRESS: 'Dalam Proses',
    PENDING_APPROVAL: 'Menunggu Approval',
    CLOSED: 'Selesai',
    OVERDUE: 'Melewati Batas',
    DRAFT: 'Draft',
    SUBMITTED: 'Disubmit',
    APPROVED: 'Disetujui',
    REJECTED: 'Ditolak',
  }
  return labels[status] || status
}

export function getStatusColor(status: FindingStatus | VisitStatus): string {
  const colors: Record<string, string> = {
    OPEN: 'bg-orange-100 text-orange-800 border-orange-200',
    IN_PROGRESS: 'bg-blue-100 text-blue-800 border-blue-200',
    PENDING_APPROVAL: 'bg-amber-100 text-amber-800 border-amber-200',
    CLOSED: 'bg-green-100 text-green-800 border-green-200',
    OVERDUE: 'bg-red-100 text-red-800 border-red-200',
    DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
    SUBMITTED: 'bg-blue-100 text-blue-800 border-blue-200',
    APPROVED: 'bg-green-100 text-green-800 border-green-200',
    REJECTED: 'bg-red-100 text-red-800 border-red-200',
  }
  return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200'
}

export function getPriorityLabel(priority: FindingPriority): string {
  const labels: Record<FindingPriority, string> = {
    CRITICAL: 'Kritis',
    HIGH: 'Tinggi',
    MEDIUM: 'Sedang',
    LOW: 'Rendah',
  }
  return labels[priority]
}

export function getPriorityColor(priority: FindingPriority): string {
  const colors: Record<FindingPriority, string> = {
    CRITICAL: 'bg-red-100 text-red-800 border-red-200',
    HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
    MEDIUM: 'bg-amber-100 text-amber-800 border-amber-200',
    LOW: 'bg-green-100 text-green-800 border-green-200',
  }
  return colors[priority]
}

export function getVisitTypeLabel(type: VisitType): string {
  const labels: Record<VisitType, string> = {
    OWNER_VISIT: 'Owner Visit',
    VESSEL_VISIT: 'Vessel Visit',
    SITE_VISIT: 'Site Visit',
  }
  return labels[type]
}

export function getVisitTypeColor(type: VisitType): string {
  const colors: Record<VisitType, string> = {
    OWNER_VISIT: 'bg-amber-100 text-amber-800 border-amber-200',
    VESSEL_VISIT: 'bg-blue-100 text-blue-800 border-blue-200',
    SITE_VISIT: 'bg-green-100 text-green-800 border-green-200',
  }
  return colors[type]
}

export function getActionTypeLabel(type: ActionType): string {
  const labels: Record<ActionType, string> = {
    INSPECTION: 'Pengecekan / Inspeksi',
    COORDINATION: 'Koordinasi / Komunikasi',
    REPAIR: 'Perbaikan / Pengerjaan',
    MONITORING: 'Monitoring / Pantauan',
    TESTING: 'Pengujian / Testing',
    FINAL_VERIFY: 'Verifikasi Akhir',
    OTHER: 'Lain-lain',
  }
  return labels[type]
}

export function getActionTypeColor(type: ActionType): string {
  const colors: Record<ActionType, string> = {
    INSPECTION: 'bg-purple-100 text-purple-700',
    COORDINATION: 'bg-blue-100 text-blue-700',
    REPAIR: 'bg-orange-100 text-orange-700',
    MONITORING: 'bg-teal-100 text-teal-700',
    TESTING: 'bg-indigo-100 text-indigo-700',
    FINAL_VERIFY: 'bg-green-100 text-green-700',
    OTHER: 'bg-gray-100 text-gray-700',
  }
  return colors[type]
}

export function formatDate(date: string | undefined, fallback = '-'): string {
  if (!date) return fallback
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(date))
}

export function formatDateShort(date: string | undefined, fallback = '-'): string {
  if (!date) return fallback
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date))
}

export function formatDateTime(date: string | undefined, fallback = '-'): string {
  if (!date) return fallback
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(date))
}

export function getDaysDiff(target: string): number {
  const now = new Date()
  const targetDate = new Date(target)
  return Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function canCreateVisit(role: UserRole, visitType: string): boolean {
  if (role === 'SUPER_ADMIN') return true
  if (visitType === 'OWNER_VISIT') return role === 'MANAGEMENT'
  if (visitType === 'VESSEL_VISIT') return ['MANAGEMENT', 'OP_HEAD', 'ADMIN'].includes(role)
  if (visitType === 'SITE_VISIT') return ['MANAGEMENT', 'SITE_MGR', 'PIC', 'ADMIN'].includes(role)
  return false
}

export function canApprove(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'MANAGEMENT', 'OP_HEAD', 'SITE_MGR', 'ADMIN'].includes(role)
}

import type { ExternalInspectionType, InspectionResult } from '@/types'

export function getExternalInspectionTypeLabel(type: ExternalInspectionType): string {
  const labels: Record<ExternalInspectionType, string> = {
    SIRE: 'SIRE',
    BIRE: 'BIRE',
    VETTING_PSA: 'Vetting PSA',
    IMCA: 'IMCA',
    OTHER: 'Lainnya',
  }
  return labels[type] || type
}

export function getExternalInspectionTypeColor(type: ExternalInspectionType): string {
  const colors: Record<ExternalInspectionType, string> = {
    SIRE: 'bg-blue-100 text-blue-800 border-blue-200',
    BIRE: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    VETTING_PSA: 'bg-purple-100 text-purple-800 border-purple-200',
    IMCA: 'bg-teal-100 text-teal-800 border-teal-200',
    OTHER: 'bg-gray-100 text-gray-700 border-gray-200',
  }
  return colors[type] || 'bg-gray-100 text-gray-700 border-gray-200'
}

export function getInspectionResultLabel(result: InspectionResult | undefined): string {
  if (!result) return '-'
  const labels: Record<InspectionResult, string> = {
    SATISFACTORY: 'Satisfactory',
    CONDITIONAL: 'Conditional',
    UNSATISFACTORY: 'Unsatisfactory',
  }
  return labels[result]
}

export function getInspectionResultColor(result: InspectionResult | undefined): string {
  if (!result) return 'bg-gray-100 text-gray-500 border-gray-200'
  const colors: Record<InspectionResult, string> = {
    SATISFACTORY: 'bg-green-100 text-green-800 border-green-200',
    CONDITIONAL: 'bg-amber-100 text-amber-800 border-amber-200',
    UNSATISFACTORY: 'bg-red-100 text-red-800 border-red-200',
  }
  return colors[result]
}
