import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Star, Plus, Send, CheckCircle, XCircle, AlertTriangle, Clock, User, Calendar, Building2, ImageIcon, ChevronDown, ChevronUp } from 'lucide-react'
import { FileUpload } from '@/components/ui/file-upload'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Input, Textarea, Select } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { mockFindings } from '@/data/mockData'
import { useAuthStore } from '@/stores/authStore'
import {
  getPriorityColor, getPriorityLabel, getStatusColor, getStatusLabel,
  getActionTypeLabel, getActionTypeColor, formatDate, formatDateTime
} from '@/utils'
import type { FindingPriority, ActionType } from '@/types'
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

export default function FindingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { success, error: showError } = useToast()
  const [timelineOrder, setTimelineOrder] = useState<'newest' | 'oldest'>('newest')
  const [showAddProgress, setShowAddProgress] = useState(false)
  const [showClosingForm, setShowClosingForm] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewDecision, setReviewDecision] = useState<'APPROVED' | 'REJECTED' | null>(null)
  const [rejectionNotes, setRejectionNotes] = useState('')

  const [finding, setFinding] = useState(() => mockFindings.find(f => f.id === id))

  if (!finding) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertTriangle size={40} className="text-gray-400" />
      <p className="text-gray-500 text-sm">Temuan tidak ditemukan</p>
      <Button variant="outline" size="sm" onClick={() => navigate('/findings')}>Kembali</Button>
    </div>
  )

  const canAddProgress = user && ['SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'OP_HEAD', 'SITE_MGR', 'PIC', 'STAFF_HSSE'].includes(user.role)
    && ['OPEN', 'IN_PROGRESS', 'OVERDUE'].includes(finding.status)
  const canSubmitClosing = canAddProgress && (finding.progress_entries?.length ?? 0) > 0
  const canReview = user && ['SUPER_ADMIN', 'MANAGEMENT', 'OP_HEAD', 'SITE_MGR', 'ADMIN', 'HEAD_HSSE'].includes(user.role)
    && finding.status === 'PENDING_APPROVAL'

  const progressEntries = finding.progress_entries || []
  const sortedEntries = timelineOrder === 'newest' ? [...progressEntries].reverse() : [...progressEntries]

  const daysLeft = Math.ceil((new Date(finding.target_close_date).getTime() - Date.now()) / 86400000)

  return (
    <div className="flex flex-col gap-5 max-w-4xl mx-auto w-full">
      {/* Back + actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Kembali
        </Button>
        <div className="flex items-center gap-2">
          {canReview && (
            <>
              <Button variant="danger" size="sm" onClick={() => { setReviewDecision('REJECTED'); setShowReviewModal(true) }}>
                <XCircle size={15} /> Tolak Closing
              </Button>
              <Button size="sm" onClick={() => { setReviewDecision('APPROVED'); setShowReviewModal(true) }}>
                <CheckCircle size={15} /> Setujui Closing
              </Button>
            </>
          )}
          {canAddProgress && (
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
      </div>

      {/* Finding Info Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-3 mb-4">
            {finding.is_owner_finding && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                <Star size={14} className="text-amber-500" />
                <span className="text-xs font-semibold text-amber-700">Owner Visit Finding – Prioritas Utama</span>
              </div>
            )}
          </div>

          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-[#1B3A6B] mb-1">{finding.title}</h2>
              <p className="text-xs font-mono text-gray-500">{finding.reference_no}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`badge ${getStatusColor(finding.status)}`}>{getStatusLabel(finding.status)}</span>
              <span className={`badge ${getPriorityColor(finding.priority as FindingPriority)}`}>{getPriorityLabel(finding.priority as FindingPriority)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500 flex items-center gap-1 mb-1"><Building2 size={11} />Unit Bisnis</p>
              <p className="text-sm font-semibold">{finding.business_unit?.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Kategori</p>
              <p className="text-sm font-semibold">{finding.category}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 flex items-center gap-1 mb-1"><Calendar size={11} />Tanggal Open</p>
              <p className="text-sm font-semibold">{formatDate(finding.created_at)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 flex items-center gap-1 mb-1"><Calendar size={11} />Target Closing</p>
              <div>
                <p className="text-sm font-semibold">{formatDate(finding.target_close_date)}</p>
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
              <p className="text-sm font-semibold">{finding.assigned_to_user?.full_name || '—'}</p>
            </div>
          </div>

          {finding.status === 'OVERDUE' && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertTriangle size={15} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-red-700">Temuan Melewati Batas Waktu</p>
                <p className="text-xs text-red-600 mt-0.5">Temuan ini telah melewati tanggal target closing. Anda masih dapat menambah progress dan mengajukan closing, namun akan tercatat sebagai <strong>raport buruk</strong> dalam penilaian kinerja.</p>
              </div>
            </div>
          )}

          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1.5">Deskripsi Temuan</p>
            <p className="text-sm text-gray-700 leading-relaxed">{finding.description}</p>
          </div>

          {finding.initial_photos && finding.initial_photos.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2 flex items-center gap-1"><ImageIcon size={12} />Foto Kondisi Awal</p>
              <div className="flex gap-2 flex-wrap">
                {finding.initial_photos.map((photo, i) => (
                  <img key={i} src={photo} alt={`Foto ${i + 1}`} className="w-24 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90" />
                ))}
              </div>
            </div>
          )}

          {finding.status === 'CLOSED' && finding.closing_evidence && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1.5"><CheckCircle size={13} />Evidence Closing</p>
              <div className="flex gap-2 flex-wrap">
                {finding.closing_evidence.map((photo, i) => (
                  <img key={i} src={photo} alt={`Evidence ${i + 1}`} className="w-24 h-20 object-cover rounded-lg border border-green-200 cursor-pointer hover:opacity-90" />
                ))}
              </div>
              {finding.closing_notes && <p className="text-xs text-green-700 mt-2">{finding.closing_notes}</p>}
              <p className="text-xs text-green-600 mt-1.5">
                Ditutup oleh <strong>{finding.closed_by_user?.full_name}</strong> pada {formatDate(finding.closed_at)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Approval review section */}
      {finding.status === 'PENDING_APPROVAL' && finding.closing_request && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <Clock size={16} /> Pengajuan Closing – Menunggu Review
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Tanggal Tindakan Selesai</p>
                <p className="text-sm font-semibold">{formatDate(finding.closing_request.action_date)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Diajukan Oleh</p>
                <p className="text-sm font-semibold">{finding.closing_request.submitted_by_user?.full_name}</p>
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg mb-3">
              <p className="text-xs text-gray-500 mb-1">Ringkasan Tindakan</p>
              <p className="text-sm text-gray-700">{finding.closing_request.summary}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg mb-3">
              <p className="text-xs text-gray-500 mb-1">Kondisi Setelah</p>
              <p className="text-sm text-gray-700">{finding.closing_request.condition_after}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2 flex items-center gap-1"><ImageIcon size={12} />Evidence Penutupan</p>
              <div className="flex gap-2 flex-wrap">
                {finding.closing_request.evidence_photos.map((photo, i) => (
                  <img key={i} src={photo} alt={`Evidence ${i + 1}`} className="w-28 h-22 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Timeline Progress Temuan</CardTitle>
            <button
              onClick={() => setTimelineOrder(o => o === 'newest' ? 'oldest' : 'newest')}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              {timelineOrder === 'newest' ? <><ChevronDown size={14} />Terbaru di atas</> : <><ChevronUp size={14} />Terlama di atas</>}
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-2">
          {finding.status === 'CLOSED' && timelineOrder === 'newest' && finding.closing_request?.review_decision === 'APPROVED' && (
            <TimelineNode
              type="CLOSED"
              date={formatDate(finding.closed_at)}
              content={
                <div>
                  <p className="text-sm font-semibold text-green-700">Closing Disetujui</p>
                  <p className="text-xs text-gray-600 mt-1">Disetujui oleh {finding.closed_by_user?.full_name}</p>
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
                  <p className="text-xs text-gray-600 mt-1">oleh {finding.closing_request.submitted_by_user?.full_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{finding.closing_request.evidence_photos.length} foto evidence diunggah</p>
                </div>
              }
            />
          )}

          {sortedEntries.map((entry, i) => (
            <TimelineNode
              key={entry.id}
              type="PROGRESS"
              date={`${formatDate(entry.action_date)} · ${formatDateTime(entry.created_at).split(' ').slice(-1)}`}
              badge={getActionTypeLabel(entry.action_type)}
              badgeColor={getActionTypeColor(entry.action_type)}
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
                  <p className="text-[10px] text-gray-400 mt-1.5">Diisi oleh {entry.created_by_user?.full_name}</p>
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
                <p className="text-xs text-gray-600 mt-1">dari {finding.visit?.reference_no}</p>
                <p className="text-xs text-gray-500 mt-0.5">oleh {finding.created_by_user?.full_name}</p>
              </div>
            }
            isLast
          />

          {finding.status === 'CLOSED' && timelineOrder === 'oldest' && finding.closing_request?.review_decision === 'APPROVED' && (
            <TimelineNode
              type="CLOSED"
              date={formatDate(finding.closed_at)}
              content={
                <div>
                  <p className="text-sm font-semibold text-green-700">Closing Disetujui</p>
                  <p className="text-xs text-gray-600 mt-1">Disetujui oleh {finding.closed_by_user?.full_name}</p>
                </div>
              }
              isLast
            />
          )}

          {progressEntries.length === 0 && finding.status === 'OPEN' && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700">
              Belum ada progress entry. Klik <strong>Tambah Progress</strong> untuk mencatat tindakan pertama.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Progress Modal */}
      <AddProgressModal open={showAddProgress} onClose={() => setShowAddProgress(false)}
        onSave={(data) => {
          const newEntry = {
            id: `prog-${Date.now()}`,
            finding_id: finding.id,
            action_date: data.action_date || new Date().toISOString().split('T')[0],
            action_type: data.action_type as import('@/types').ActionType,
            description: data.description,
            next_steps: data.next_steps || undefined,
            next_action_date: data.next_action_date || undefined,
            created_by: user?.id ?? '',
            created_by_user: user ?? undefined,
            created_at: new Date().toISOString(),
          }
          setFinding(f => f ? {
            ...f,
            status: f.status === 'OPEN' || f.status === 'OVERDUE' ? 'IN_PROGRESS' : f.status,
            progress_entries: [...(f.progress_entries ?? []), newEntry],
          } : f)
          setShowAddProgress(false)
          success('Progress ditambahkan', 'Status temuan diperbarui menjadi In Progress')
        }}
      />

      {/* Closing Form Modal */}
      <ClosingFormModal open={showClosingForm} onClose={() => setShowClosingForm(false)}
        isOverdue={finding.status === 'OVERDUE'}
        onSave={(data) => {
          const closingRequest = {
            id: `close-req-${Date.now()}`,
            finding_id: finding.id,
            action_date: data.action_date || new Date().toISOString().split('T')[0],
            summary: data.summary,
            condition_after: data.condition_after,
            evidence_photos: [],
            submitted_by: user?.id ?? '',
            submitted_by_user: user ?? undefined,
            submitted_at: new Date().toISOString(),
          }
          setFinding(f => f ? { ...f, status: 'PENDING_APPROVAL', closing_request: closingRequest } : f)
          setShowClosingForm(false)
          success('Closing diajukan', 'Atasan akan menerima notifikasi untuk mereview')
        }}
      />

      {/* Review Closing Modal */}
      <Modal open={showReviewModal} onClose={() => setShowReviewModal(false)}
        title={reviewDecision === 'APPROVED' ? 'Setujui Closing Temuan' : 'Tolak Closing Temuan'}
        size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setShowReviewModal(false)}>Batal</Button>
          <Button variant={reviewDecision === 'APPROVED' ? 'primary' : 'danger'}
            onClick={() => {
              if (reviewDecision === 'APPROVED') {
                setFinding(f => f ? {
                  ...f,
                  status: 'CLOSED',
                  closed_at: new Date().toISOString(),
                  closed_by: user?.id,
                  closed_by_user: user ?? undefined,
                  closing_request: f.closing_request ? {
                    ...f.closing_request,
                    review_decision: 'APPROVED',
                    reviewed_by: user?.id,
                    reviewed_by_user: user ?? undefined,
                    reviewed_at: new Date().toISOString(),
                  } : f.closing_request,
                } : f)
                success('Closing disetujui', 'Temuan ditutup secara resmi')
              } else {
                setFinding(f => f ? {
                  ...f,
                  status: 'IN_PROGRESS',
                  closing_request: f.closing_request ? {
                    ...f.closing_request,
                    review_decision: 'REJECTED',
                    rejection_notes: rejectionNotes,
                    reviewed_by: user?.id,
                    reviewed_by_user: user ?? undefined,
                    reviewed_at: new Date().toISOString(),
                  } : f.closing_request,
                } : f)
                showError('Closing ditolak', 'PIC dapat melanjutkan menambah progress')
              }
              setShowReviewModal(false)
              setRejectionNotes('')
            }}>
            {reviewDecision === 'APPROVED' ? <><CheckCircle size={15} /> Setujui</> : <><XCircle size={15} /> Tolak</>}
          </Button>
        </>}
      >
        {reviewDecision === 'REJECTED' ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-600">Tuliskan alasan penolakan:</p>
            <Textarea value={rejectionNotes} onChange={e => setRejectionNotes(e.target.value)} placeholder="Alasan penolakan..." rows={4} />
          </div>
        ) : (
          <p className="text-sm text-gray-600">Anda telah mereview seluruh timeline progress dan evidence closing. Setujui penutupan temuan ini?</p>
        )}
      </Modal>
    </div>
  )
}

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
  const icons = {
    ORIGIN: '⚑', PROGRESS: '●', PENDING: '◉', CLOSED: '✓', REJECTED: '✗'
  }

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

function AddProgressModal({ open, onClose, onSave }: {
  open: boolean
  onClose: () => void
  onSave: (data: { action_date: string; action_type: string; description: string; next_steps: string; next_action_date: string }) => void
}) {
  const [form, setForm] = useState({ action_date: '', action_type: '', description: '', next_steps: '', next_action_date: '' })
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  return (
    <Modal open={open} onClose={onClose} title="Tambah Progress Entry" size="lg"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Batal</Button>
        <Button onClick={() => { if (form.action_date && form.action_type && form.description) onSave(form) }}>Simpan Progress</Button>
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
        <FileUpload
          label="Foto Progress"
          accept="image/*"
          maxFiles={5}
          maxSizeMB={10}
        />
      </div>
    </Modal>
  )
}

function ClosingFormModal({ open, onClose, onSave, isOverdue }: {
  open: boolean
  onClose: () => void
  onSave: (data: { action_date: string; summary: string; condition_after: string }) => void
  isOverdue?: boolean
}) {
  const [form, setForm] = useState({ action_date: '', summary: '', condition_after: '' })
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  return (
    <Modal open={open} onClose={onClose} title="Ajukan Closing Temuan" size="lg"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Batal</Button>
        <Button onClick={() => { if (form.action_date && form.summary && form.condition_after) onSave(form) }}><Send size={15} /> Ajukan Closing</Button>
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
        <FileUpload
          label="Foto Evidence Closing"
          required
          accept="image/*,.pdf"
          maxFiles={10}
          maxSizeMB={10}
        />
      </div>
    </Modal>
  )
}

