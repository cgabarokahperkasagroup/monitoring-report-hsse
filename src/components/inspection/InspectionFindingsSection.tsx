import { useState } from 'react'
import {
  Plus, Send, CheckCircle, XCircle, AlertTriangle, Clock,
  Calendar, User, ImageIcon, ChevronDown, ChevronUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input, Textarea, Select } from '@/components/ui/input'
import { FileUpload } from '@/components/ui/file-upload'
import { useToast } from '@/components/ui/toast'
import { useAuthStore } from '@/stores/authStore'
import {
  getPriorityColor, getPriorityLabel, getStatusColor, getStatusLabel,
  getActionTypeLabel, getActionTypeColor, formatDate, formatDateShort, formatDateTime
} from '@/utils'
import type { InspectionFinding, InspectionFindingProgress, FindingPriority, FindingStatus, ActionType } from '@/types'
import { cn } from '@/lib/utils'

const actionTypeOptions = [
  { value: 'INSPECTION', label: 'Pengecekan / Inspeksi' },
  { value: 'COORDINATION', label: 'Koordinasi / Komunikasi' },
  { value: 'REPAIR', label: 'Perbaikan / Pengerjaan' },
  { value: 'MONITORING', label: 'Monitoring / Pantauan' },
  { value: 'TESTING', label: 'Pengujian / Testing' },
  { value: 'FINAL_VERIFY', label: 'Verifikasi Akhir' },
  { value: 'OTHER', label: 'Lain-lain' },
]

const priorityOptions = [
  { value: 'CRITICAL', label: 'Kritis' },
  { value: 'HIGH', label: 'Tinggi' },
  { value: 'MEDIUM', label: 'Sedang' },
  { value: 'LOW', label: 'Rendah' },
]

interface Props {
  initialFindings: InspectionFinding[]
  canAdd?: boolean
}

// ──────────────────────────────────────────────────────────
// TimelineNode
// ──────────────────────────────────────────────────────────
function TimelineNode({ type, date, badge, badgeColor, content, isLast }: {
  type: 'ORIGIN' | 'PROGRESS' | 'PENDING' | 'CLOSED' | 'REJECTED'
  date?: string | null
  badge?: string
  badgeColor?: string
  content: React.ReactNode
  isLast?: boolean
}) {
  const dotColors = {
    ORIGIN: 'bg-[#1B3A6B] ring-blue-100',
    PROGRESS: 'bg-gray-400 ring-gray-100',
    PENDING: 'bg-amber-400 ring-amber-100',
    CLOSED: 'bg-green-600 ring-green-100',
    REJECTED: 'bg-red-500 ring-red-100',
  }
  const icons = { ORIGIN: '⚑', PROGRESS: '●', PENDING: '◉', CLOSED: '✓', REJECTED: '✗' }

  return (
    <div className={cn('relative flex gap-4 pb-5', isLast && 'pb-0')}>
      <div className="flex flex-col items-center">
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ring-4 z-10 shrink-0', dotColors[type])}>
          {icons[type]}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-gray-200 mt-1" />}
      </div>
      <div className="flex-1 pb-1">
        {date && <p className="text-[11px] text-gray-400 mb-1.5">{date}</p>}
        {badge && (
          <span className={cn('inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold mb-2', badgeColor)}>
            {badge}
          </span>
        )}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          {content}
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// InspAddProgressModal
// ──────────────────────────────────────────────────────────
function InspAddProgressModal({ open, onClose, onSave }: {
  open: boolean
  onClose: () => void
  onSave: (data: { action_date: string; action_type: string; description: string; next_steps: string; next_action_date: string }) => void
}) {
  const [form, setForm] = useState({ action_date: '', action_type: '', description: '', next_steps: '', next_action_date: '' })
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleClose = () => {
    setForm({ action_date: '', action_type: '', description: '', next_steps: '', next_action_date: '' })
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Tambah Progress Entry" size="lg"
      footer={<>
        <Button variant="ghost" onClick={handleClose}>Batal</Button>
        <Button onClick={() => { if (form.action_date && form.action_type && form.description) { onSave(form); handleClose() } }}>
          Simpan Progress
        </Button>
      </>}
    >
      <div className="flex flex-col gap-4">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
          Progress entry bersifat <strong>immutable</strong> — tidak dapat diubah atau dihapus setelah disimpan. Pastikan informasi sudah benar sebelum menyimpan.
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input type="date" label="Tanggal Tindakan" required value={form.action_date} onChange={e => set('action_date', e.target.value)}
            hint="Boleh berbeda dari tanggal pengisian (backdated)" />
          <Select label="Jenis Tindakan" required value={form.action_type} onChange={e => set('action_type', e.target.value)}
            placeholder="Pilih jenis tindakan" options={actionTypeOptions} />
        </div>
        <Textarea label="Deskripsi Tindakan" required value={form.description} onChange={e => set('description', e.target.value)}
          placeholder="Narasi singkat apa yang dilakukan, oleh siapa, kondisi setelah tindakan..." rows={4} />
        <Textarea label="Rencana Tindak Lanjut" value={form.next_steps} onChange={e => set('next_steps', e.target.value)}
          placeholder="Rencana tindakan berikutnya..." rows={2} />
        <Input type="date" label="Target Tindakan Berikutnya" value={form.next_action_date} onChange={e => set('next_action_date', e.target.value)}
          hint="Opsional – jika diisi dan terlewat, sistem akan mengirim reminder" />
        <FileUpload label="Foto Progress" accept="image/*" maxFiles={5} maxSizeMB={10} />
      </div>
    </Modal>
  )
}

// ──────────────────────────────────────────────────────────
// InspClosingFormModal
// ──────────────────────────────────────────────────────────
function InspClosingFormModal({ open, onClose, onSave, isOverdue }: {
  open: boolean
  onClose: () => void
  onSave: (data: { action_date: string; summary: string; condition_after: string }) => void
  isOverdue?: boolean
}) {
  const [form, setForm] = useState({ action_date: '', summary: '', condition_after: '' })
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleClose = () => {
    setForm({ action_date: '', summary: '', condition_after: '' })
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Ajukan Closing Temuan" size="lg"
      footer={<>
        <Button variant="ghost" onClick={handleClose}>Batal</Button>
        <Button onClick={() => { if (form.action_date && form.summary && form.condition_after) { onSave(form); handleClose() } }}>
          <Send size={15} /> Ajukan Closing
        </Button>
      </>}
    >
      <div className="flex flex-col gap-4">
        {isOverdue && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            <p className="font-semibold mb-1">Perhatian: Temuan Melewati Batas Target</p>
            <p>Temuan ini diajukan closing <strong>setelah melewati tanggal target closing</strong>. Closing tetap dapat diproses, namun akan dicatat sebagai <strong>raport buruk</strong> dan memengaruhi penilaian kinerja tim.</p>
          </div>
        )}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          Setelah diajukan, status temuan berubah menjadi <strong>PENDING APPROVAL</strong>. Atasan akan mereview seluruh timeline dan evidence sebelum menyetujui.
        </div>
        <Input type="date" label="Tanggal Penyelesaian Akhir" required value={form.action_date} onChange={e => set('action_date', e.target.value)} />
        <Textarea label="Ringkasan Tindakan Keseluruhan" required value={form.summary} onChange={e => set('summary', e.target.value)}
          placeholder="Ringkasan lengkap semua tindakan yang telah diambil dari awal hingga selesai..." rows={4} />
        <Textarea label="Kondisi Setelah Perbaikan/Penyelesaian" required value={form.condition_after} onChange={e => set('condition_after', e.target.value)}
          placeholder="Deskripsi kondisi obyek setelah perbaikan selesai..." rows={3} />
        <FileUpload label="Foto Evidence Closing" required accept="image/*,.pdf" maxFiles={10} maxSizeMB={10} />
      </div>
    </Modal>
  )
}

// ──────────────────────────────────────────────────────────
// InspReviewModal
// ──────────────────────────────────────────────────────────
function InspReviewModal({ open, onClose, decision, onSave }: {
  open: boolean
  onClose: () => void
  decision: 'APPROVED' | 'REJECTED' | null
  onSave: (rejectionNotes: string) => void
}) {
  const [rejectionNotes, setRejectionNotes] = useState('')

  const handleClose = () => {
    setRejectionNotes('')
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose}
      title={decision === 'APPROVED' ? 'Setujui Closing Temuan' : 'Tolak Closing Temuan'}
      size="sm"
      footer={<>
        <Button variant="ghost" onClick={handleClose}>Batal</Button>
        <Button variant={decision === 'APPROVED' ? 'primary' : 'danger'}
          onClick={() => { onSave(rejectionNotes); handleClose() }}>
          {decision === 'APPROVED' ? <><CheckCircle size={15} /> Setujui</> : <><XCircle size={15} /> Tolak</>}
        </Button>
      </>}
    >
      {decision === 'REJECTED' ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-600">Tuliskan alasan penolakan:</p>
          <Textarea value={rejectionNotes} onChange={e => setRejectionNotes(e.target.value)} placeholder="Alasan penolakan..." rows={4} />
        </div>
      ) : (
        <p className="text-sm text-gray-600">Anda telah mereview seluruh timeline progress dan evidence closing. Setujui penutupan temuan ini?</p>
      )}
    </Modal>
  )
}

// ──────────────────────────────────────────────────────────
// InspAddFindingModal
// ──────────────────────────────────────────────────────────
function InspAddFindingModal({ open, onClose, onSave }: {
  open: boolean
  onClose: () => void
  onSave: (data: { area: string; description: string; priority: string; assigned_to: string; target_close_date: string }) => void
}) {
  const [form, setForm] = useState({ area: '', description: '', priority: '', assigned_to: '', target_close_date: '' })
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleClose = () => {
    setForm({ area: '', description: '', priority: '', assigned_to: '', target_close_date: '' })
    onClose()
  }

  const isValid = form.area && form.description && form.priority && form.target_close_date

  return (
    <Modal open={open} onClose={handleClose} title="Tambah Temuan Baru" size="lg"
      footer={<>
        <Button variant="ghost" onClick={handleClose}>Batal</Button>
        <Button onClick={() => { if (isValid) { onSave(form); handleClose() } }}>
          <Plus size={15} /> Tambah Temuan
        </Button>
      </>}
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Area / Lokasi" required value={form.area} onChange={e => set('area', e.target.value)}
            placeholder="Contoh: Ruang Mesin, Dek Belakang..." />
          <Select label="Prioritas" required value={form.priority} onChange={e => set('priority', e.target.value)}
            placeholder="Pilih prioritas" options={priorityOptions} />
        </div>
        <Textarea label="Deskripsi Temuan" required value={form.description} onChange={e => set('description', e.target.value)}
          placeholder="Deskripsi temuan secara jelas dan spesifik..." rows={4} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="PIC / Assigned To" value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}
            placeholder="Nama penanggung jawab..." />
          <Input type="date" label="Target Closing" required value={form.target_close_date} onChange={e => set('target_close_date', e.target.value)} />
        </div>
        <FileUpload label="Foto Awal (Kondisi Ditemukan)" accept="image/*" maxFiles={5} maxSizeMB={10} />
      </div>
    </Modal>
  )
}

// ──────────────────────────────────────────────────────────
// InspectionFindingDetailModal
// ──────────────────────────────────────────────────────────
function InspectionFindingDetailModal({ finding: initialFinding, onClose, onUpdate }: {
  finding: InspectionFinding
  onClose: () => void
  onUpdate: (updated: InspectionFinding) => void
}) {
  const { user } = useAuthStore()
  const { success, error: showError } = useToast()
  const [finding, setFinding] = useState(initialFinding)
  const [timelineOrder, setTimelineOrder] = useState<'newest' | 'oldest'>('newest')
  const [showAddProgress, setShowAddProgress] = useState(false)
  const [showClosingForm, setShowClosingForm] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewDecision, setReviewDecision] = useState<'APPROVED' | 'REJECTED' | null>(null)

  const updateFinding = (updated: InspectionFinding) => {
    setFinding(updated)
    onUpdate(updated)
  }

  const canActOnFinding = user &&
    ['SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'OP_HEAD', 'SITE_MGR', 'PIC', 'STAFF_HSSE'].includes(user.role) &&
    ['OPEN', 'IN_PROGRESS', 'OVERDUE'].includes(finding.status)

  const canSubmitClosing = canActOnFinding && (finding.progress_entries?.length ?? 0) > 0

  const canReviewFinding = user &&
    ['SUPER_ADMIN', 'MANAGEMENT', 'OP_HEAD', 'SITE_MGR', 'ADMIN', 'HEAD_HSSE'].includes(user.role) &&
    finding.status === 'PENDING_APPROVAL'

  const progressEntries = finding.progress_entries || []
  const sortedEntries: InspectionFindingProgress[] = timelineOrder === 'newest'
    ? [...progressEntries].reverse()
    : [...progressEntries]

  const daysLeft = Math.ceil((new Date(finding.target_close_date).getTime() - Date.now()) / 86400000)

  return (
    <>
      <Modal open onClose={onClose} title="Detail Temuan Inspeksi" size="xl"
        footer={
          <div className="flex items-center gap-2 w-full">
            <div className="flex items-center gap-2 flex-wrap flex-1">
              {canReviewFinding && (
                <>
                  <Button variant="danger" size="sm" onClick={() => { setReviewDecision('REJECTED'); setShowReviewModal(true) }}>
                    <XCircle size={15} /> Tolak Closing
                  </Button>
                  <Button size="sm" onClick={() => { setReviewDecision('APPROVED'); setShowReviewModal(true) }}>
                    <CheckCircle size={15} /> Setujui Closing
                  </Button>
                </>
              )}
              {canActOnFinding && (
                <Button variant="outline" size="sm" onClick={() => setShowAddProgress(true)}>
                  <Plus size={15} /> Tambah Progress
                </Button>
              )}
              {canSubmitClosing && finding.status !== 'PENDING_APPROVAL' && (
                <Button size="sm" onClick={() => setShowClosingForm(true)}>
                  <Send size={15} /> Ajukan Closing
                </Button>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>Tutup</Button>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          {/* Finding Info */}
          <div>
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-0.5">{finding.area}</p>
                <p className="text-sm font-semibold text-gray-800 leading-snug">{finding.description}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className={`badge ${getStatusColor(finding.status as FindingStatus)}`}>
                  {getStatusLabel(finding.status as FindingStatus)}
                </span>
                <span className={`badge ${getPriorityColor(finding.priority as FindingPriority)}`}>
                  {getPriorityLabel(finding.priority as FindingPriority)}
                </span>
              </div>
            </div>

            {finding.status === 'OVERDUE' && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertTriangle size={15} className="text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-red-700">Temuan Melewati Batas Waktu</p>
                  <p className="text-xs text-red-600 mt-0.5">Temuan ini telah melewati tanggal target closing. Anda masih dapat menambah progress dan mengajukan closing.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-xs text-gray-500 flex items-center gap-1 mb-1"><Calendar size={11} />Tanggal Open</p>
                <p className="text-sm font-semibold">{formatDate(finding.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 flex items-center gap-1 mb-1"><Calendar size={11} />Target Closing</p>
                <div>
                  <p className="text-sm font-semibold">{formatDateShort(finding.target_close_date)}</p>
                  {finding.status !== 'CLOSED' && (
                    <p className={`text-xs mt-0.5 ${daysLeft < 0 ? 'text-red-600' : daysLeft <= 3 ? 'text-orange-600' : 'text-gray-500'}`}>
                      {daysLeft < 0 ? `Overdue ${Math.abs(daysLeft)} hari` : daysLeft === 0 ? 'Jatuh tempo hari ini' : `${daysLeft} hari lagi`}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 flex items-center gap-1 mb-1"><Calendar size={11} />Actual Closing</p>
                {finding.closed_at ? (
                  <div>
                    <p className={`text-sm font-semibold ${finding.closed_at > finding.target_close_date ? 'text-red-600' : 'text-green-700'}`}>
                      {formatDate(finding.closed_at)}
                    </p>
                    {finding.closed_at > finding.target_close_date && (
                      <p className="text-xs text-red-500 mt-0.5">Melewati target</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">—</p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500 flex items-center gap-1 mb-1"><User size={11} />PIC</p>
                <p className="text-sm font-semibold">{finding.assigned_to || '—'}</p>
              </div>
            </div>
          </div>

          {/* Initial Photos */}
          {finding.initial_photos && finding.initial_photos.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2 flex items-center gap-1"><ImageIcon size={12} />Foto Kondisi Awal</p>
              <div className="flex gap-2 flex-wrap">
                {finding.initial_photos.map((photo, i) => (
                  <img key={i} src={photo} alt={`Foto ${i + 1}`} className="w-24 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90" />
                ))}
              </div>
            </div>
          )}

          {/* Closing Evidence (CLOSED) */}
          {finding.status === 'CLOSED' && finding.closing_evidence && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1.5"><CheckCircle size={13} />Evidence Closing</p>
              <div className="flex gap-2 flex-wrap mb-2">
                {finding.closing_evidence.map((photo, i) => (
                  <img key={i} src={photo} alt={`Evidence ${i + 1}`} className="w-24 h-20 object-cover rounded-lg border border-green-200 cursor-pointer hover:opacity-90" />
                ))}
              </div>
              {finding.closing_notes && <p className="text-xs text-green-700">{finding.closing_notes}</p>}
            </div>
          )}

          {/* Pending Approval section */}
          {finding.status === 'PENDING_APPROVAL' && finding.closing_request && (
            <div className="border border-amber-200 bg-amber-50/30 rounded-xl p-4">
              <p className="text-sm font-semibold text-amber-700 flex items-center gap-2 mb-3">
                <Clock size={15} /> Pengajuan Closing – Menunggu Review
              </p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Tanggal Tindakan Selesai</p>
                  <p className="text-sm font-semibold">{formatDate(finding.closing_request.action_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Diajukan Pada</p>
                  <p className="text-sm font-semibold">{formatDateTime(finding.closing_request.submitted_at)}</p>
                </div>
              </div>
              <div className="p-2.5 bg-white border border-gray-200 rounded-lg mb-2.5">
                <p className="text-xs text-gray-500 mb-1">Ringkasan Tindakan</p>
                <p className="text-sm text-gray-700">{finding.closing_request.summary}</p>
              </div>
              <div className="p-2.5 bg-white border border-gray-200 rounded-lg mb-2.5">
                <p className="text-xs text-gray-500 mb-1">Kondisi Setelah</p>
                <p className="text-sm text-gray-700">{finding.closing_request.condition_after}</p>
              </div>
              {finding.closing_request.evidence_photos.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1"><ImageIcon size={12} />Evidence Penutupan</p>
                  <div className="flex gap-2 flex-wrap">
                    {finding.closing_request.evidence_photos.map((photo, i) => (
                      <img key={i} src={photo} alt={`Evidence ${i + 1}`} className="w-24 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Timeline */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">Timeline Progress</p>
              <button
                onClick={() => setTimelineOrder(o => o === 'newest' ? 'oldest' : 'newest')}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                {timelineOrder === 'newest' ? <><ChevronDown size={14} />Terbaru di atas</> : <><ChevronUp size={14} />Terlama di atas</>}
              </button>
            </div>

            <div>
              {finding.status === 'CLOSED' && timelineOrder === 'newest' && finding.closing_request?.review_decision === 'APPROVED' && (
                <TimelineNode
                  type="CLOSED"
                  date={formatDate(finding.closed_at)}
                  content={
                    <div>
                      <p className="text-sm font-semibold text-green-700">Closing Disetujui</p>
                      {finding.progress_entries && (
                        <p className="text-xs text-gray-500 mt-1">Total {finding.progress_entries.length} progress entry tercatat</p>
                      )}
                    </div>
                  }
                />
              )}

              {finding.status === 'PENDING_APPROVAL' && timelineOrder === 'newest' && finding.closing_request && (
                <TimelineNode
                  type="PENDING"
                  date={formatDateTime(finding.closing_request.submitted_at)}
                  content={
                    <div>
                      <p className="text-sm font-semibold text-amber-700">Closing Diajukan</p>
                      <p className="text-xs text-gray-500 mt-0.5">{finding.closing_request.evidence_photos.length} foto evidence diunggah</p>
                    </div>
                  }
                />
              )}

              {sortedEntries.map((entry) => (
                <TimelineNode
                  key={entry.id}
                  type="PROGRESS"
                  date={`${formatDate(entry.action_date)} · ${formatDateTime(entry.created_at).split(' ').slice(-1)}`}
                  badge={getActionTypeLabel(entry.action_type as ActionType)}
                  badgeColor={getActionTypeColor(entry.action_type as ActionType)}
                  content={
                    <div>
                      <p className="text-sm text-gray-800 leading-relaxed">{entry.description}</p>
                      {entry.photos && entry.photos.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {entry.photos.map((p, pi) => (
                            <img key={pi} src={p} alt="" className="w-20 h-16 object-cover rounded-lg border border-gray-200 cursor-pointer" />
                          ))}
                        </div>
                      )}
                      {entry.next_steps && (
                        <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
                          <span className="font-semibold">Rencana lanjut: </span>{entry.next_steps}
                          {entry.next_action_date && <span className="ml-1 text-blue-500">(target: {formatDate(entry.next_action_date)})</span>}
                        </div>
                      )}
                    </div>
                  }
                />
              ))}

              {/* Origin node */}
              <TimelineNode
                type="ORIGIN"
                date={formatDate(finding.created_at)}
                content={
                  <div>
                    <p className="text-sm font-semibold text-[#1B3A6B]">Temuan Ditemukan</p>
                    <p className="text-xs text-gray-500 mt-1">Area: {finding.area}</p>
                  </div>
                }
                isLast={!(finding.status === 'CLOSED' && timelineOrder === 'oldest' && finding.closing_request?.review_decision === 'APPROVED')}
              />

              {finding.status === 'CLOSED' && timelineOrder === 'oldest' && finding.closing_request?.review_decision === 'APPROVED' && (
                <TimelineNode
                  type="CLOSED"
                  date={formatDate(finding.closed_at)}
                  content={
                    <div>
                      <p className="text-sm font-semibold text-green-700">Closing Disetujui</p>
                    </div>
                  }
                  isLast
                />
              )}

              {progressEntries.length === 0 && finding.status === 'OPEN' && (
                <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700">
                  Belum ada progress entry. Klik <strong>Tambah Progress</strong> untuk mencatat tindakan pertama.
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Sub-modals */}
      <InspAddProgressModal
        open={showAddProgress}
        onClose={() => setShowAddProgress(false)}
        onSave={(data) => {
          const newEntry: InspectionFindingProgress = {
            id: `iprg-${Date.now()}`,
            action_date: data.action_date || new Date().toISOString().split('T')[0],
            action_type: data.action_type as ActionType,
            description: data.description,
            next_steps: data.next_steps || undefined,
            next_action_date: data.next_action_date || undefined,
            created_at: new Date().toISOString(),
          }
          const updated = {
            ...finding,
            status: (finding.status === 'OPEN' || finding.status === 'OVERDUE' ? 'IN_PROGRESS' : finding.status) as FindingStatus,
            progress_entries: [...(finding.progress_entries ?? []), newEntry],
          }
          updateFinding(updated)
          success('Progress ditambahkan', 'Status temuan diperbarui menjadi In Progress')
        }}
      />

      <InspClosingFormModal
        open={showClosingForm}
        onClose={() => setShowClosingForm(false)}
        isOverdue={finding.status === 'OVERDUE'}
        onSave={(data) => {
          const updated = {
            ...finding,
            status: 'PENDING_APPROVAL' as FindingStatus,
            closing_request: {
              id: `icreq-${Date.now()}`,
              action_date: data.action_date || new Date().toISOString().split('T')[0],
              summary: data.summary,
              condition_after: data.condition_after,
              evidence_photos: [],
              submitted_at: new Date().toISOString(),
            }
          }
          updateFinding(updated)
          success('Closing diajukan', 'Atasan akan menerima notifikasi untuk mereview')
        }}
      />

      <InspReviewModal
        open={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        decision={reviewDecision}
        onSave={(rejectionNotes) => {
          if (reviewDecision === 'APPROVED') {
            const updated = {
              ...finding,
              status: 'CLOSED' as FindingStatus,
              closed_at: new Date().toISOString(),
              closing_request: finding.closing_request ? {
                ...finding.closing_request,
                review_decision: 'APPROVED' as const,
                reviewed_at: new Date().toISOString(),
              } : finding.closing_request,
            }
            updateFinding(updated)
            success('Closing disetujui', 'Temuan ditutup secara resmi')
          } else {
            const updated = {
              ...finding,
              status: 'IN_PROGRESS' as FindingStatus,
              closing_request: finding.closing_request ? {
                ...finding.closing_request,
                review_decision: 'REJECTED' as const,
                rejection_notes: rejectionNotes,
                reviewed_at: new Date().toISOString(),
              } : finding.closing_request,
            }
            updateFinding(updated)
            showError('Closing ditolak', 'PIC dapat melanjutkan menambah progress')
          }
          setReviewDecision(null)
        }}
      />
    </>
  )
}

// ──────────────────────────────────────────────────────────
// Main: InspectionFindingsSection
// ──────────────────────────────────────────────────────────
export default function InspectionFindingsSection({ initialFindings, canAdd = false }: Props) {
  const { success } = useToast()
  const [findings, setFindings] = useState<InspectionFinding[]>(initialFindings)
  const [selected, setSelected] = useState<InspectionFinding | null>(null)
  const [showAddFinding, setShowAddFinding] = useState(false)

  const handleUpdate = (updated: InspectionFinding) => {
    setFindings(prev => prev.map(f => f.id === updated.id ? updated : f))
    setSelected(updated)
  }

  const openCount = findings.filter(f => ['OPEN', 'IN_PROGRESS', 'OVERDUE'].includes(f.status)).length
  const closedCount = findings.filter(f => f.status === 'CLOSED').length

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Daftar Temuan <span className="text-gray-400 font-normal">({findings.length})</span>
          </h3>
          {findings.length > 0 && (
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1 text-orange-600">
                <AlertTriangle size={12} /> {openCount} aktif
              </span>
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle size={12} /> {closedCount} selesai
              </span>
            </div>
          )}
        </div>
        {canAdd && (
          <Button size="sm" variant="outline" onClick={() => setShowAddFinding(true)}>
            <Plus size={14} /> Tambah Temuan
          </Button>
        )}
      </div>

      {/* Empty state */}
      {findings.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <CheckCircle size={36} className="mx-auto mb-2 text-green-300" />
          <p className="text-sm">Tidak ada temuan — semua item dalam kondisi baik.</p>
        </div>
      ) : (
        /* Table */
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-500 pb-2 pr-3">Area / Temuan</th>
                <th className="text-left text-xs font-semibold text-gray-500 pb-2 pr-3">Prioritas</th>
                <th className="text-left text-xs font-semibold text-gray-500 pb-2 pr-3">Status</th>
                <th className="text-left text-xs font-semibold text-gray-500 pb-2 pr-3">Tgl. Open</th>
                <th className="text-left text-xs font-semibold text-gray-500 pb-2 pr-3">Target Closing</th>
                <th className="text-left text-xs font-semibold text-gray-500 pb-2 pr-3">Actual Closing</th>
                <th className="text-left text-xs font-semibold text-gray-500 pb-2 pr-3">PIC</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {findings.map(f => {
                const isLate = f.closed_at && f.closed_at > f.target_close_date
                return (
                  <tr key={f.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 pr-3 max-w-[200px]">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">{f.area}</p>
                      <p className="text-xs text-gray-700 mt-0.5 line-clamp-2 leading-snug">{f.description}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <span className={`badge text-[10px] ${getPriorityColor(f.priority as FindingPriority)}`}>
                        {getPriorityLabel(f.priority as FindingPriority)}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      <span className={`badge text-[10px] ${getStatusColor(f.status as FindingStatus)}`}>
                        {getStatusLabel(f.status as FindingStatus)}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-xs text-gray-600 whitespace-nowrap">
                      {formatDateShort(f.created_at)}
                    </td>
                    <td className="py-3 pr-3 text-xs text-gray-600 whitespace-nowrap">
                      {formatDateShort(f.target_close_date)}
                    </td>
                    <td className="py-3 pr-3">
                      {f.closed_at ? (
                        <div>
                          <p className={`text-xs font-semibold ${isLate ? 'text-red-600' : 'text-green-700'}`}>
                            {formatDateShort(f.closed_at)}
                          </p>
                          {isLate && <p className="text-[10px] text-red-500">Terlambat</p>}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-xs text-gray-600 whitespace-nowrap">
                      {f.assigned_to || '—'}
                    </td>
                    <td className="py-3">
                      <Button size="sm" variant="ghost" onClick={() => setSelected(f)}>
                        Detail
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <InspectionFindingDetailModal
          finding={selected}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
        />
      )}

      {/* Add Finding Modal */}
      <InspAddFindingModal
        open={showAddFinding}
        onClose={() => setShowAddFinding(false)}
        onSave={(data) => {
          const newFinding: InspectionFinding = {
            id: `insp-find-${Date.now()}`,
            area: data.area,
            description: data.description,
            priority: data.priority as FindingPriority,
            status: 'OPEN',
            assigned_to: data.assigned_to || undefined,
            created_at: new Date().toISOString(),
            target_close_date: data.target_close_date,
          }
          setFindings(prev => [newFinding, ...prev])
          success('Temuan ditambahkan', 'Temuan baru berhasil dicatat')
        }}
      />
    </div>
  )
}
