import { create } from 'zustand'
import type { PISFinding, PISFindingStatus, PISPerusahaan, PISProgressEntry, PISClosingRequest } from '@/types'
import { mockPISFindings } from '@/data/pisKapalData'

interface PISKapalState {
  findings: PISFinding[]
  isLoading: boolean

  addFinding: (data: Omit<PISFinding, 'id' | 'created_at' | 'updated_at'>) => void
  updateFinding: (id: string, data: Partial<PISFinding>) => void
  deleteFinding: (id: string) => void
  getFindingById: (id: string) => PISFinding | undefined
  addProgress: (id: string, data: Omit<PISProgressEntry, 'id' | 'created_at'>) => void
  submitClosing: (id: string, data: Omit<PISClosingRequest, 'id' | 'submitted_at' | 'review_decision' | 'rejection_notes' | 'reviewed_at'>) => void
  approveClosing: (id: string) => void
  rejectClosing: (id: string, notes: string) => void
}

export const usePISKapalStore = create<PISKapalState>((set, get) => ({
  findings: mockPISFindings,
  isLoading: false,

  addFinding: (data) => {
    const now = new Date().toISOString().split('T')[0]
    const newFinding: PISFinding = {
      ...data,
      id: `pis-${Date.now()}`,
      created_at: now,
      updated_at: now,
    }
    set(s => ({ findings: [...s.findings, newFinding] }))
  },

  updateFinding: (id, data) => {
    set(s => ({
      findings: s.findings.map(f =>
        f.id === id ? { ...f, ...data, updated_at: new Date().toISOString().split('T')[0] } : f
      ),
    }))
  },

  deleteFinding: (id) => {
    set(s => ({ findings: s.findings.filter(f => f.id !== id) }))
  },

  getFindingById: (id) => get().findings.find(f => f.id === id),

  addProgress: (id, data) => {
    const now = new Date().toISOString()
    const entry: PISProgressEntry = { ...data, id: `prog-${Date.now()}`, created_at: now }
    set(s => ({
      findings: s.findings.map(f => {
        if (f.id !== id) return f
        const nextStatus: PISFindingStatus = f.status === 'OPEN' ? 'ON_PROSES' : f.status
        return {
          ...f,
          status: nextStatus,
          progress_entries: [...(f.progress_entries ?? []), entry],
          updated_at: now.split('T')[0],
        }
      }),
    }))
  },

  submitClosing: (id, data) => {
    const now = new Date().toISOString()
    const closing: PISClosingRequest = { ...data, id: `close-${Date.now()}`, submitted_at: now }
    set(s => ({
      findings: s.findings.map(f =>
        f.id === id
          ? { ...f, status: 'PROCESS_APPROVAL', closing_request: closing, updated_at: now.split('T')[0] }
          : f
      ),
    }))
  },

  approveClosing: (id) => {
    const now = new Date().toISOString()
    set(s => ({
      findings: s.findings.map(f => {
        if (f.id !== id || !f.closing_request) return f
        return {
          ...f,
          status: 'CLOSED',
          actual_closed_date: f.closing_request.actual_closed_date,
          closing_request: {
            ...f.closing_request,
            review_decision: 'APPROVED',
            reviewed_at: now,
          },
          updated_at: now.split('T')[0],
        }
      }),
    }))
  },

  rejectClosing: (id, notes) => {
    const now = new Date().toISOString()
    set(s => ({
      findings: s.findings.map(f => {
        if (f.id !== id || !f.closing_request) return f
        return {
          ...f,
          status: 'ON_PROSES',
          closing_request: {
            ...f.closing_request,
            review_decision: 'REJECTED',
            rejection_notes: notes,
            reviewed_at: now,
          },
          updated_at: now.split('T')[0],
        }
      }),
    }))
  },
}))

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
