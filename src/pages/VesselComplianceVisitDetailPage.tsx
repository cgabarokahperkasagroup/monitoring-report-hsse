// @ts-nocheck
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, CheckCircle, XCircle, AlertTriangle, Ship, Calendar, Users, Clock, Eye } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Textarea, Input, Select } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { useVisit } from '@/hooks/useVisitsData'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import {
  getStatusLabel, getStatusColor,
  getPriorityColor, getPriorityLabel,
  formatDate, formatDateShort, getDaysDiff,
} from '@/utils'
import type { FindingPriority } from '@/types'

export default function VesselComplianceVisitDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { success, error } = useToast()

  const [showAddFinding, setShowAddFinding]   = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal]   = useState(false)
  const [rejectionNotes, setRejectionNotes]   = useState('')

  const { visit, findings, loading, error: visitError, approveVisit, rejectVisit, addFinding } = useVisit(id)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!visit) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertTriangle size={40} className="text-gray-400" />
      <p className="text-gray-500 text-sm">Kunjungan tidak ditemukan</p>
      {visitError && <p className="text-xs text-red-500 max-w-sm text-center">{visitError}</p>}
      <Button variant="outline" size="sm" onClick={() => navigate('/vessel-compliance')}>Kembali</Button>
    </div>
  )

  const canApprove = user
    && ['SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'HEAD_HSSE', 'OP_HEAD'].includes(user.role)
    && visit.status === 'SUBMITTED'

  const canAddFinding = user
    && ['SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'OP_HEAD', 'SITE_MGR', 'PIC', 'HEAD_HSSE', 'STAFF_HSSE'].includes(user.role)
    && visit.status === 'APPROVED'

  const vesselName = visit.vessel?.name ?? '—'

  const summaryOpen     = findings.filter(f => f.status === 'OPEN').length
  const summaryProgress = findings.filter(f => f.status === 'IN_PROGRESS').length
  const summaryPending  = findings.filter(f => f.status === 'PENDING_APPROVAL').length
  const summaryClosed   = findings.filter(f => f.status === 'CLOSED').length
  const summaryOverdue  = findings.filter(f => f.status === 'OVERDUE').length

  return (
    <div className="flex flex-col gap-5 max-w-4xl mx-auto w-full">

      {/* ── Back + actions ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/vessel-compliance')} className="gap-2">
          <ArrowLeft size={16} /> Kembali ke Performance Operation Visit
        </Button>
        <div className="flex items-center gap-2">
          {canApprove && (
            <>
              <Button variant="danger" size="sm" onClick={() => setShowRejectModal(true)} className="gap-1.5">
                <XCircle size={15} /> Tolak
              </Button>
              <Button size="sm" onClick={() => setShowApproveModal(true)} className="gap-1.5">
                <CheckCircle size={15} /> Setujui
              </Button>
            </>
          )}
          {canAddFinding && (
            <Button onClick={() => setShowAddFinding(true)} className="gap-1.5">
              <Plus size={16} /> Tambah Temuan
            </Button>
          )}
        </div>
      </div>

      {/* ── Visit detail card ───────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Ship size={15} className="text-[#1B3A6B]" />
                <span className="text-xs font-semibold text-[#1B3A6B] uppercase tracking-wide">Performance Operation Visit</span>
              </div>
              <h2 className="text-xl font-bold text-[#1B3A6B]">{visit.reference_no}</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Dibuat oleh {visit.created_by_user?.full_name || '—'} · {formatDate(visit.created_at)}
              </p>
            </div>
            <span className={`badge shrink-0 ${getStatusColor(visit.status)}`}>{getStatusLabel(visit.status)}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-500 flex items-center gap-1 mb-1"><Ship size={11} />Kapal</p>
              <p className="text-sm font-semibold">{vesselName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 flex items-center gap-1 mb-1"><Calendar size={11} />Tanggal Kunjungan</p>
              <p className="text-sm font-semibold">{formatDate(visit.visit_date)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 flex items-center gap-1 mb-1"><Clock size={11} />Waktu</p>
              <p className="text-sm font-semibold">
                {visit.start_time ? `${visit.start_time}` : '—'}
                {visit.end_time ? ` – ${visit.end_time}` : ''}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Unit Bisnis</p>
              <p className="text-sm font-semibold">{visit.business_unit?.name || '—'}</p>
            </div>
          </div>

          {visit.participants && visit.participants.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-2"><Users size={11} />Peserta Kunjungan</p>
              <div className="flex flex-wrap gap-2">
                {visit.participants.map(p => (
                  <span key={p} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">{p}</span>
                ))}
              </div>
            </div>
          )}

          {visit.agenda && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-1">Agenda / Tujuan</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{visit.agenda}</p>
            </div>
          )}

          {visit.summary && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-1">Ringkasan Hasil Kunjungan</p>
              <p className="text-sm text-gray-700 bg-blue-50 rounded-lg p-3 border border-blue-100">{visit.summary}</p>
            </div>
          )}

          {visit.approved_by && (
            <p className="text-xs text-green-600 mt-3 flex items-center gap-1">
              <CheckCircle size={12} />
              Disetujui oleh {visit.approved_by_user?.full_name || '—'} pada {formatDate(visit.approved_at!)}
            </p>
          )}

          {visit.rejection_notes && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs font-semibold text-red-700 mb-1">Catatan Penolakan</p>
              <p className="text-sm text-red-700">{visit.rejection_notes}</p>
            </div>
          )}

          {visit.status === 'SUBMITTED' && !canApprove && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">Laporan menunggu persetujuan atasan. Setelah disetujui, temuan dapat ditambahkan.</p>
            </div>
          )}

          {visit.status === 'SUBMITTED' && canApprove && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-4">
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">Laporan menunggu persetujuan Anda. Setujui untuk mengaktifkan penambahan temuan.</p>
              </div>
              <Button size="sm" onClick={() => setShowApproveModal(true)} className="shrink-0 gap-1">
                <CheckCircle size={13} /> Setujui Sekarang
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Findings summary chips ──────────────────────────────────────────── */}
      {findings.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {[
            { label: 'Open',     count: summaryOpen,     color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
            { label: 'Progress', count: summaryProgress, color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-100' },
            { label: 'Pending',  count: summaryPending,  color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-100' },
            { label: 'Closed',   count: summaryClosed,   color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-100' },
            { label: 'Overdue',  count: summaryOverdue,  color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-100' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-3 border ${s.border}`}>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.count}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Findings list ───────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Daftar Temuan ({findings.length})</CardTitle>
          {canAddFinding && (
            <Button size="sm" onClick={() => setShowAddFinding(true)} className="gap-1">
              <Plus size={14} /> Tambah
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {findings.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-gray-400 px-4 text-center">
              <AlertTriangle size={32} className="mb-2 opacity-40" />
              <p className="text-sm font-medium">Belum ada temuan untuk kunjungan ini</p>
              {visit.status === 'APPROVED' ? (
                <p className="text-xs mt-1">Klik "Tambah Temuan" untuk mencatat temuan pertama</p>
              ) : (
                <p className="text-xs mt-1">Kunjungan harus disetujui terlebih dahulu sebelum temuan dapat ditambahkan</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600">Temuan</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Kategori</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Prioritas</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Target Closing</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Actual Closing</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">PIC</th>
                    <th className="px-4 py-3 w-20" />
                  </tr>
                </thead>
                <tbody>
                  {findings.map(f => {
                    const isLateClose = f.status === 'CLOSED' && f.closed_at && f.closed_at > f.target_close_date
                    const daysLeft    = getDaysDiff(f.target_close_date)
                    const isNearDue   = daysLeft <= 3 && daysLeft > 0 && f.status !== 'CLOSED'
                    return (
                      <tr key={f.id}
                        className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/findings/${f.id}`, { state: { from: `/vessel-compliance/visit/${id}` } })}
                      >
                        <td className="px-5 py-3.5 max-w-xs">
                          <p className="font-medium text-gray-800 text-xs line-clamp-2">{f.title}</p>
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5">{f.reference_no}</p>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-gray-600">{f.category}</td>
                        <td className="px-4 py-3.5">
                          <span className={`badge text-[11px] ${getPriorityColor(f.priority as FindingPriority)}`}>
                            {getPriorityLabel(f.priority as FindingPriority)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`badge text-[11px] ${getStatusColor(f.status)}`}>
                            {getStatusLabel(f.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-xs text-gray-600">{formatDateShort(f.target_close_date)}</p>
                          {isNearDue && (
                            <p className="text-[10px] text-orange-600 flex items-center gap-1 mt-0.5">
                              <Clock size={9} /> {daysLeft} hari lagi
                            </p>
                          )}
                          {f.status === 'OVERDUE' && (
                            <p className="text-[10px] text-red-600 mt-0.5">
                              Overdue {Math.abs(daysLeft)} hari
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          {f.closed_at ? (
                            <div>
                              <p className={`text-xs ${isLateClose ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                                {formatDateShort(f.closed_at)}
                              </p>
                              {isLateClose && <p className="text-[10px] text-red-500 mt-0.5">Terlambat</p>}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-gray-600">{f.assigned_to_user?.full_name || '—'}</td>
                        <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="sm"
                            onClick={() => navigate(`/findings/${f.id}`, { state: { from: `/vessel-compliance/visit/${id}` } })}
                            className="gap-1 text-xs">
                            <Eye size={13} /> Detail
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <Modal open={showApproveModal} onClose={() => setShowApproveModal(false)}
        title="Setujui Laporan Kunjungan" size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setShowApproveModal(false)}>Batal</Button>
          <Button onClick={async () => {
            const result = await approveVisit(user!.id)
            setShowApproveModal(false)
            if (!result?.error) success('Laporan disetujui', 'Temuan sekarang dapat ditambahkan')
            else error('Gagal menyetujui', result.error)
          }}>
            <CheckCircle size={15} /> Setujui
          </Button>
        </>}
      >
        <p className="text-sm text-gray-600">
          Setujui laporan kunjungan <strong>{visit.reference_no}</strong>? Setelah disetujui, temuan dapat ditambahkan.
        </p>
      </Modal>

      <Modal open={showRejectModal} onClose={() => setShowRejectModal(false)}
        title="Tolak Laporan Kunjungan" size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setShowRejectModal(false)}>Batal</Button>
          <Button variant="danger" onClick={async () => {
            const result = await rejectVisit(rejectionNotes)
            setShowRejectModal(false)
            setRejectionNotes('')
            if (!result?.error) error('Laporan ditolak', 'Dikembalikan dengan catatan penolakan')
          }}>
            <XCircle size={15} /> Tolak
          </Button>
        </>}
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-600">Masukkan catatan alasan penolakan:</p>
          <Textarea value={rejectionNotes} onChange={e => setRejectionNotes(e.target.value)}
            placeholder="Tuliskan alasan penolakan..." rows={4} />
        </div>
      </Modal>

      <AddFindingModal
        open={showAddFinding}
        onClose={() => setShowAddFinding(false)}
        onSave={async (formData) => {
          if (!user) return
          const result = await addFinding({
            ...formData,
            business_unit_id: visit.business_unit_id,
            source_type: visit.visit_type,
            is_owner_finding: false,
            created_by: user.id,
          })
          if (result?.error) { error('Gagal menyimpan', result.error ?? ''); return }
          setShowAddFinding(false)
          success('Temuan ditambahkan', 'PIC akan mendapat notifikasi penugasan')
        }}
      />
    </div>
  )
}

// ─── Add Finding Modal ────────────────────────────────────────────────────────
function AddFindingModal({ open, onClose, onSave }: {
  open: boolean
  onClose: () => void
  onSave: (data: {
    title: string; description: string; category: string; priority: string
    assigned_to: string; target_close_date: string
  }) => Promise<void>
}) {
  const [form, setForm] = useState({
    title: '', description: '', category: '', priority: 'MEDIUM', assigned_to: '', target_close_date: ''
  })
  const [saving, setSaving] = useState(false)
  const [findingCategories, setFindingCategories] = useState<Array<{ id: string; name: string }>>([])
  const [picUsers, setPicUsers] = useState<Array<{ id: string; full_name: string }>>([])

  useEffect(() => {
    supabase.from('finding_categories').select('id, name').eq('is_active', true)
      .then(({ data }) => { if (data) setFindingCategories(data) })
    supabase.from('users').select('id, full_name').in('role', ['PIC', 'OP_HEAD', 'SITE_MGR', 'HEAD_HSSE', 'STAFF_HSSE']).eq('is_active', true)
      .then(({ data }) => { if (data) setPicUsers(data) })
  }, [])

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const valid = form.title && form.description && form.category && form.target_close_date

  return (
    <Modal open={open} onClose={onClose} title="Tambah Temuan Baru" size="lg"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Batal</Button>
        <Button loading={saving} disabled={!valid} onClick={async () => {
          if (!valid) return
          setSaving(true)
          await onSave(form)
          setSaving(false)
          setForm({ title: '', description: '', category: '', priority: 'MEDIUM', assigned_to: '', target_close_date: '' })
        }}>
          Simpan Temuan
        </Button>
      </>}
    >
      <div className="flex flex-col gap-4">
        <Input label="Judul Temuan" required value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder="Ringkasan singkat temuan" />
        <Textarea label="Deskripsi Detail" required value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Penjelasan lengkap temuan..." rows={4} />
        <div className="grid grid-cols-2 gap-4">
          <Select searchable label="Kategori" required value={form.category}
            onChange={e => set('category', e.target.value)}
            placeholder="Pilih kategori"
            options={findingCategories.map(c => ({ value: c.name, label: c.name }))} />
          <Select label="Tingkat Prioritas" required value={form.priority}
            onChange={e => set('priority', e.target.value)}
            options={[
              { value: 'CRITICAL', label: 'Critical – Kritis' },
              { value: 'HIGH',     label: 'High – Tinggi' },
              { value: 'MEDIUM',   label: 'Medium – Sedang' },
              { value: 'LOW',      label: 'Low – Rendah' },
            ]} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select searchable label="PIC (Penanggung Jawab)" value={form.assigned_to}
            onChange={e => set('assigned_to', e.target.value)}
            placeholder="Pilih PIC"
            options={picUsers.map(u => ({ value: u.id, label: u.full_name }))} />
          <Input type="date" label="Target Tanggal Closing" required value={form.target_close_date}
            onChange={e => set('target_close_date', e.target.value)} />
        </div>
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-700">
            Foto kondisi awal dapat diunggah setelah temuan disimpan, melalui halaman detail temuan.
          </p>
        </div>
      </div>
    </Modal>
  )
}
