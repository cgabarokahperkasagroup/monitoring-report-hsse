import { useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  ArrowLeft, Edit, Plus, Send, CheckCircle, XCircle, AlertTriangle,
  Clock, FileText, Calendar, User, Ship, ChevronDown, ChevronUp,
  CheckCircle2, Receipt,
} from 'lucide-react'
import {
  usePISKapalStore,
  getPISStatusLabel, getPISStatusColor,
  getPISTemuanLabel, getPISTemuanColor,
  getPISPerusahaanColor,
} from '@/stores/pisKapalStore'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { formatDateShort } from '@/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value || <span className="text-gray-400">—</span>}</p>
    </div>
  )
}

function SectionCard({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon?: React.ElementType }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 pb-3 border-b border-gray-100 flex items-center gap-2">
        {Icon && <Icon size={14} className="text-gray-400" />}
        {title}
      </h3>
      {children}
    </div>
  )
}

// ── Timeline node ─────────────────────────────────────────────────────────────

function TimelineNode({
  type, date, content, isLast,
}: {
  type: 'ORIGIN' | 'PROGRESS' | 'CLOSING' | 'APPROVED' | 'REJECTED'
  date: string
  content: React.ReactNode
  isLast?: boolean
}) {
  const dot: Record<string, string> = {
    ORIGIN: 'bg-[#1B3A6B] ring-blue-100',
    PROGRESS: 'bg-blue-400 ring-blue-50',
    CLOSING: 'bg-amber-400 ring-amber-100',
    APPROVED: 'bg-green-600 ring-green-100',
    REJECTED: 'bg-red-500 ring-red-100',
  }
  const icon: Record<string, string> = {
    ORIGIN: '⚑', PROGRESS: '●', CLOSING: '◉', APPROVED: '✓', REJECTED: '✗',
  }

  return (
    <div className={`relative flex gap-4 ${isLast ? 'pb-0' : 'pb-5'}`}>
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ring-4 z-10 shrink-0 ${dot[type]}`}>
          {icon[type]}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-gray-200 mt-1" />}
      </div>
      <div className="flex-1 pb-1">
        <p className="text-[11px] text-gray-400 mb-1.5">{date}</p>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          {content}
        </div>
      </div>
    </div>
  )
}

// ── Add Progress Modal ────────────────────────────────────────────────────────

function AddProgressModal({
  open, onClose, onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (data: { action_date: string; description: string; action_by: string }) => void
}) {
  const [form, setForm] = useState({ action_date: '', description: '', action_by: '' })
  const s = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }))

  const valid = form.action_date && form.description.trim() && form.action_by.trim()

  return (
    <Modal open={open} onClose={onClose} title="Tambah Update Progress" size="lg"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Batal</Button>
        <Button disabled={!valid} onClick={() => valid && onSave(form)}>
          <Plus size={14} /> Simpan Progress
        </Button>
      </>}
    >
      <div className="flex flex-col gap-4">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
          Progress yang disimpan bersifat <strong>permanen</strong> dan tidak dapat dihapus. Pastikan informasi sudah benar.
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Tindakan <span className="text-red-500">*</span></label>
          <input
            type="date"
            value={form.action_date}
            onChange={e => s('action_date', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pelapor / PIC <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={form.action_by}
            onChange={e => s('action_by', e.target.value)}
            placeholder="Nama orang yang melakukan tindakan"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi Tindakan <span className="text-red-500">*</span></label>
          <textarea
            value={form.description}
            onChange={e => s('description', e.target.value)}
            placeholder="Narasi apa yang dilakukan, kondisi setelah tindakan, kendala yang dihadapi..."
            rows={4}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 resize-none"
          />
        </div>
      </div>
    </Modal>
  )
}

// ── Closing Form Modal ────────────────────────────────────────────────────────

function ClosingFormModal({
  open, onClose, onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (data: { actual_closed_date: string; summary: string; catatan: string; submitted_by: string }) => void
}) {
  const [form, setForm] = useState({ actual_closed_date: '', summary: '', catatan: '', submitted_by: '' })
  const s = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }))

  const valid = form.actual_closed_date && form.summary.trim() && form.submitted_by.trim()

  return (
    <Modal open={open} onClose={onClose} title="Ajukan Closing Finding" size="lg"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Batal</Button>
        <Button disabled={!valid} onClick={() => valid && onSave(form)}>
          <Send size={14} /> Ajukan Closing
        </Button>
      </>}
    >
      <div className="flex flex-col gap-4">
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          Setelah diajukan, status akan berubah menjadi <strong>Process Approval</strong>. Atasan akan mereview sebelum closing disetujui.
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Actual Closed <span className="text-red-500">*</span></label>
          <input
            type="date"
            value={form.actual_closed_date}
            onChange={e => s('actual_closed_date', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Diajukan Oleh <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={form.submitted_by}
            onChange={e => s('submitted_by', e.target.value)}
            placeholder="Nama pengaju closing"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ringkasan Tindakan <span className="text-red-500">*</span></label>
          <textarea
            value={form.summary}
            onChange={e => s('summary', e.target.value)}
            placeholder="Ringkasan lengkap semua tindakan yang telah diambil dari awal hingga selesai..."
            rows={4}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Catatan Tambahan</label>
          <textarea
            value={form.catatan}
            onChange={e => s('catatan', e.target.value)}
            placeholder="Kondisi setelah perbaikan, catatan khusus, dsb..."
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 resize-none"
          />
        </div>
      </div>
    </Modal>
  )
}

// ── Review Closing Modal ──────────────────────────────────────────────────────

function ReviewModal({
  open, decision, onClose, onConfirm,
}: {
  open: boolean
  decision: 'APPROVED' | 'REJECTED'
  onClose: () => void
  onConfirm: (notes: string) => void
}) {
  const [notes, setNotes] = useState('')
  const isApprove = decision === 'APPROVED'

  return (
    <Modal open={open} onClose={onClose}
      title={isApprove ? 'Setujui Closing Finding' : 'Tolak Closing Finding'}
      size="sm"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Batal</Button>
        <Button
          variant={isApprove ? 'primary' : 'danger'}
          disabled={!isApprove && !notes.trim()}
          onClick={() => onConfirm(notes)}
        >
          {isApprove ? <><CheckCircle size={14} /> Setujui</> : <><XCircle size={14} /> Tolak</>}
        </Button>
      </>}
    >
      {isApprove ? (
        <p className="text-sm text-gray-600">
          Anda akan menyetujui pengajuan closing ini. Status finding akan berubah menjadi <strong>Closed</strong>.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-600">Tuliskan alasan penolakan:</p>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Alasan penolakan closing..."
            rows={4}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 resize-none"
          />
        </div>
      )}
    </Modal>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PISKapalDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const backTo = (location.state as { from?: string } | null)?.from ?? '/pis-findings'
  const { getFindingById, addProgress, submitClosing, approveClosing, rejectClosing } = usePISKapalStore()
  const { success, error: showError } = useToast()

  const [showAddProgress, setShowAddProgress] = useState(false)
  const [showClosingForm, setShowClosingForm] = useState(false)
  const [reviewDecision, setReviewDecision] = useState<'APPROVED' | 'REJECTED' | null>(null)
  const [timelineOrder, setTimelineOrder] = useState<'newest' | 'oldest'>('newest')

  const finding = getFindingById(id ?? '')

  if (!finding) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-500">
        <AlertTriangle size={36} className="text-gray-300" />
        <p className="text-sm">Finding tidak ditemukan</p>
        <button onClick={() => navigate(backTo)} className="text-sm text-blue-600 hover:underline">Kembali</button>
      </div>
    )
  }

  const progressEntries = finding.progress_entries ?? []
  const sortedEntries = timelineOrder === 'newest' ? [...progressEntries].reverse() : [...progressEntries]

  const canAddProgress = ['OPEN', 'ON_PROSES', 'REJECTED'].includes(finding.status)
  const canSubmitClosing = finding.status === 'ON_PROSES' && progressEntries.length > 0
  const canReview = finding.status === 'PROCESS_APPROVAL'

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(backTo)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getPISStatusColor(finding.status)}`}>
                {getPISStatusLabel(finding.status)}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getPISPerusahaanColor(finding.perusahaan)}`}>
                {finding.perusahaan}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getPISTemuanColor(finding.temuan)}`}>
                {getPISTemuanLabel(finding.temuan)}
              </span>
            </div>
            <p className="text-xs text-gray-400 font-mono mt-1">{finding.no_ticket}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canReview && (
            <>
              <button
                onClick={() => setReviewDecision('REJECTED')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
              >
                <XCircle size={14} /> Tolak Closing
              </button>
              <button
                onClick={() => setReviewDecision('APPROVED')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-green-700 border border-green-300 rounded-lg hover:bg-green-50"
              >
                <CheckCircle size={14} /> Setujui Closing
              </button>
            </>
          )}
          {canSubmitClosing && (
            <button
              onClick={() => setShowClosingForm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white rounded-lg"
              style={{ backgroundColor: '#1B3A6B' }}
            >
              <Send size={14} /> Ajukan Closing
            </button>
          )}
          {canAddProgress && (
            <button
              onClick={() => setShowAddProgress(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <Plus size={14} /> Tambah Progress
            </button>
          )}
          <button
            onClick={() => navigate(`/pis-findings/${finding.id}/edit`)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Edit size={14} /> Edit
          </button>
        </div>
      </div>

      {/* ── Info Utama ─────────────────────────────────────────────────────── */}
      <SectionCard title="Identitas Finding" icon={FileText}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <InfoRow label="No. Finding" value={`#${finding.no}`} />
          <InfoRow label="Perusahaan" value={
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getPISPerusahaanColor(finding.perusahaan)}`}>
              {finding.perusahaan}
            </span>
          } />
          <InfoRow label="Jenis Temuan" value={
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getPISTemuanColor(finding.temuan)}`}>
              {getPISTemuanLabel(finding.temuan)}
            </span>
          } />
          <InfoRow label="No. Tiket" value={<span className="font-mono text-xs">{finding.no_ticket}</span>} />
          <InfoRow label="Kategori" value={finding.category} />
          <InfoRow label="Status" value={
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getPISStatusColor(finding.status)}`}>
              {getPISStatusLabel(finding.status)}
            </span>
          } />
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Deskripsi / Isi Temuan</p>
          <p className="text-sm text-gray-800 leading-relaxed">{finding.deskripsi}</p>
        </div>
      </SectionCard>

      {/* ── Info Kapal & Personil ───────────────────────────────────────────── */}
      <SectionCard title="Kapal & Personil" icon={Ship}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoRow label="Nama Kapal" value={finding.nama_kapal} />
          <InfoRow label="Fleet Inspector" value={finding.fleet_inspector} />
          <InfoRow label="Operation Head" value={finding.operation_head} />
          <InfoRow label="Person in Charge" value={finding.person_in_charge} />
        </div>
      </SectionCard>

      {/* ── Tanggal & Memo ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SectionCard title="Tanggal" icon={Calendar}>
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Tanggal Open" value={formatDateShort(finding.open_date)} />
            <InfoRow label="Target Closed" value={formatDateShort(finding.target_closed_date)} />
            <InfoRow label="Actual Closed" value={formatDateShort(finding.actual_closed_date)} />
            <InfoRow label="Kode Bulan Open" value={finding.kode_month_open} />
            <InfoRow label="Kode Bulan Closing" value={finding.kode_month_closing} />
            <InfoRow label="Kode Tahun Open" value={finding.kode_year_open} />
          </div>
        </SectionCard>

        <SectionCard title="Memo" icon={FileText}>
          <div className="grid grid-cols-1 gap-4">
            <InfoRow label="Nomor Memo" value={finding.nomor_memo} />
            <InfoRow label="Tanggal Memo" value={formatDateShort(finding.tanggal_memo)} />
          </div>
        </SectionCard>
      </div>

      {/* ── Catatan Tindak Lanjut ───────────────────────────────────────────── */}
      <SectionCard title="Catatan Tindak Lanjut" icon={FileText}>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Kendala / Action Plan</p>
            <p className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3 leading-relaxed">
              {finding.kendala_action_plan || <span className="text-gray-400">—</span>}
            </p>
          </div>
          {finding.approval_note && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Catatan Approval</p>
              <p className="text-sm text-gray-800 bg-green-50 border border-green-100 rounded-lg p-3 leading-relaxed">
                {finding.approval_note}
              </p>
            </div>
          )}
          {finding.reject_note && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Catatan Reject</p>
              <p className="text-sm text-gray-800 bg-red-50 border border-red-100 rounded-lg p-3 leading-relaxed">
                {finding.reject_note}
              </p>
            </div>
          )}
        </div>
      </SectionCard>

      {/* ── Pending Invoice ─────────────────────────────────────────────────── */}
      <SectionCard title="Pending Invoice" icon={Receipt}>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-default">
            <input type="checkbox" checked={finding.pending_invoice_sistem} readOnly className="w-4 h-4 rounded" />
            <span className="text-sm text-gray-700">Pending Invoice Sistem</span>
          </label>
          <label className="flex items-center gap-2 cursor-default">
            <input type="checkbox" checked={finding.pending_invoice_finance} readOnly className="w-4 h-4 rounded" />
            <span className="text-sm text-gray-700">Pending Invoice Finance</span>
          </label>
        </div>
      </SectionCard>

      {/* ── Closing Request Card ────────────────────────────────────────────── */}
      {finding.closing_request && (
        <div className={`rounded-xl shadow-sm border p-5 ${
          finding.status === 'CLOSED' ? 'bg-green-50 border-green-200' :
          finding.status === 'PROCESS_APPROVAL' ? 'bg-amber-50 border-amber-200' :
          'bg-gray-50 border-gray-200'
        }`}>
          <h3 className="text-sm font-semibold mb-4 pb-3 border-b flex items-center gap-2 border-current/20">
            {finding.status === 'CLOSED' ? (
              <><CheckCircle2 size={14} className="text-green-700" /><span className="text-green-800">Finding Telah Closed</span></>
            ) : finding.status === 'PROCESS_APPROVAL' ? (
              <><Clock size={14} className="text-amber-700" /><span className="text-amber-800">Pengajuan Closing – Menunggu Approval</span></>
            ) : (
              <><XCircle size={14} className="text-red-700" /><span className="text-red-800">Closing Ditolak</span></>
            )}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Actual Closed Date</p>
              <p className="text-sm font-medium">{formatDateShort(finding.closing_request.actual_closed_date)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Diajukan Oleh</p>
              <p className="text-sm font-medium">{finding.closing_request.submitted_by}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Waktu Pengajuan</p>
              <p className="text-sm font-medium">{formatDateShort(finding.closing_request.submitted_at.split('T')[0])}</p>
            </div>
          </div>
          <div className="mt-3 p-3 bg-white/60 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Ringkasan Tindakan</p>
            <p className="text-sm text-gray-800 leading-relaxed">{finding.closing_request.summary}</p>
          </div>
          {finding.closing_request.catatan && (
            <div className="mt-3 p-3 bg-white/60 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Catatan Tambahan</p>
              <p className="text-sm text-gray-800 leading-relaxed">{finding.closing_request.catatan}</p>
            </div>
          )}
          {finding.closing_request.review_decision === 'REJECTED' && finding.closing_request.rejection_notes && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-600 mb-1 font-semibold">Alasan Penolakan</p>
              <p className="text-sm text-red-700">{finding.closing_request.rejection_notes}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Progress Timeline ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <User size={14} className="text-gray-400" />
            Timeline Progress
          </h3>
          <button
            onClick={() => setTimelineOrder(o => o === 'newest' ? 'oldest' : 'newest')}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
          >
            {timelineOrder === 'newest'
              ? <><ChevronDown size={13} />Terbaru di atas</>
              : <><ChevronUp size={13} />Terlama di atas</>
            }
          </button>
        </div>

        <div className="mt-2">
          {/* Closing approved node (newest first) */}
          {finding.status === 'CLOSED' && timelineOrder === 'newest' && (
            <TimelineNode type="APPROVED" date={finding.closing_request?.reviewed_at?.split('T')[0] ?? ''} content={
              <div>
                <p className="text-sm font-semibold text-green-700">Closing Disetujui</p>
                <p className="text-xs text-gray-500 mt-1">Finding resmi ditutup (Closed)</p>
              </div>
            } />
          )}

          {/* Closing submitted node (newest first) */}
          {finding.closing_request && finding.status === 'PROCESS_APPROVAL' && timelineOrder === 'newest' && (
            <TimelineNode type="CLOSING" date={finding.closing_request.submitted_at.split('T')[0]} content={
              <div>
                <p className="text-sm font-semibold text-amber-700">Closing Diajukan</p>
                <p className="text-xs text-gray-500 mt-1">oleh {finding.closing_request.submitted_by} · menunggu approval</p>
              </div>
            } />
          )}

          {/* Rejected closing node (newest first) */}
          {finding.closing_request?.review_decision === 'REJECTED' && timelineOrder === 'newest' && (
            <TimelineNode type="REJECTED" date={finding.closing_request.reviewed_at?.split('T')[0] ?? ''} content={
              <div>
                <p className="text-sm font-semibold text-red-700">Closing Ditolak</p>
                {finding.closing_request.rejection_notes && (
                  <p className="text-xs text-gray-500 mt-1">{finding.closing_request.rejection_notes}</p>
                )}
              </div>
            } />
          )}

          {/* Progress entries */}
          {sortedEntries.map((entry, i) => (
            <TimelineNode
              key={entry.id}
              type="PROGRESS"
              date={`${formatDateShort(entry.action_date)} · dicatat ${formatDateShort(entry.created_at.split('T')[0])}`}
              content={
                <div>
                  <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                    <User size={11} /> {entry.action_by}
                  </p>
                  <p className="text-sm text-gray-800 leading-relaxed">{entry.description}</p>
                </div>
              }
            />
          ))}

          {/* Origin node */}
          <TimelineNode
            type="ORIGIN"
            date={formatDateShort(finding.open_date)}
            isLast={timelineOrder === 'oldest'
              ? !finding.closing_request && finding.status !== 'CLOSED'
              : true
            }
            content={
              <div>
                <p className="text-sm font-semibold text-[#1B3A6B]">Finding Dibuka</p>
                <p className="text-xs text-gray-500 mt-1">
                  {getPISTemuanLabel(finding.temuan)} · {finding.nama_kapal}
                </p>
              </div>
            }
          />

          {/* Closing approved node (oldest first) */}
          {finding.status === 'CLOSED' && timelineOrder === 'oldest' && (
            <TimelineNode type="APPROVED" isLast date={finding.closing_request?.reviewed_at?.split('T')[0] ?? ''} content={
              <div>
                <p className="text-sm font-semibold text-green-700">Closing Disetujui</p>
                <p className="text-xs text-gray-500 mt-1">Finding resmi ditutup (Closed)</p>
              </div>
            } />
          )}

          {/* Empty state */}
          {progressEntries.length === 0 && finding.status === 'OPEN' && (
            <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700">
              Belum ada progress entry. Klik <strong>Tambah Progress</strong> untuk mencatat tindakan pertama.
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <AddProgressModal
        open={showAddProgress}
        onClose={() => setShowAddProgress(false)}
        onSave={(data) => {
          addProgress(finding.id, data)
          setShowAddProgress(false)
          success('Progress ditambahkan', 'Status finding diperbarui')
        }}
      />

      <ClosingFormModal
        open={showClosingForm}
        onClose={() => setShowClosingForm(false)}
        onSave={(data) => {
          submitClosing(finding.id, data)
          setShowClosingForm(false)
          success('Closing diajukan', 'Menunggu persetujuan atasan')
        }}
      />

      {reviewDecision && (
        <ReviewModal
          open={!!reviewDecision}
          decision={reviewDecision}
          onClose={() => setReviewDecision(null)}
          onConfirm={(notes) => {
            if (reviewDecision === 'APPROVED') {
              approveClosing(finding.id)
              success('Closing disetujui', 'Finding resmi ditutup')
            } else {
              rejectClosing(finding.id, notes)
              showError('Closing ditolak', 'Finding kembali ke status On Proses')
            }
            setReviewDecision(null)
          }}
        />
      )}
    </div>
  )
}
