import type { PISFindingStatus, PISPerusahaan } from '@/types'

// Label & warna badge untuk temuan PIS Kapal.

export function getPISStatusLabel(status: PISFindingStatus): string {
  const labels: Record<PISFindingStatus, string> = {
    CLOSED: 'Closed',
    OPEN: 'Open',
    ON_PROSES: 'On Proses',
    REJECTED: 'Rejected',
    PROCESS_APPROVAL: 'Process Approval',
  }
  return labels[status]
}

export function getPISStatusColor(status: PISFindingStatus): string {
  const colors: Record<PISFindingStatus, string> = {
    CLOSED: 'bg-green-100 text-green-800 border-green-200',
    OPEN: 'bg-orange-100 text-orange-800 border-orange-200',
    ON_PROSES: 'bg-blue-100 text-blue-800 border-blue-200',
    REJECTED: 'bg-red-100 text-red-800 border-red-200',
    PROCESS_APPROVAL: 'bg-amber-100 text-amber-800 border-amber-200',
  }
  return colors[status]
}

export function getPISTemuanLabel(temuan: string): string {
  const labels: Record<string, string> = {
    NEGATIVE_FEEDBACK: 'Negative Feedback',
    VETTING_PLUS: 'Vetting Plus',
    SELF_ASSESSMENT: 'Self Assessment',
  }
  return labels[temuan] || temuan
}

export function getPISTemuanColor(temuan: string): string {
  const colors: Record<string, string> = {
    NEGATIVE_FEEDBACK: 'bg-red-100 text-red-800 border-red-200',
    VETTING_PLUS: 'bg-purple-100 text-purple-800 border-purple-200',
    SELF_ASSESSMENT: 'bg-teal-100 text-teal-800 border-teal-200',
  }
  return colors[temuan] || 'bg-gray-100 text-gray-700 border-gray-200'
}

export function getPISPerusahaanColor(p: PISPerusahaan): string {
  return p === 'ASG'
    ? 'bg-blue-100 text-blue-800 border-blue-200'
    : 'bg-indigo-100 text-indigo-800 border-indigo-200'
}
