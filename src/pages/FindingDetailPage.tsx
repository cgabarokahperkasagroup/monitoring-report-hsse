import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Star, Plus, Send, CheckCircle, XCircle, AlertTriangle, Clock, User, Calendar, Building2, ImageIcon, ChevronDown, ChevronUp, Camera } from 'lucide-react'
import { FileUpload } from '@/components/ui/file-upload'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input, Textarea, Select } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { useFinding } from '@/hooks/useFindingsData'
import { useAuthStore } from '@/stores/authStore'
import { uploadPhotos } from '@/lib/supabase'
import {
  getPriorityColor, getPriorityLabel, getStatusColor, getStatusLabel,
  getActionTypeLabel, getActionTypeColor, formatDate, formatDateTime
} from '@/utils'
import type { FindingPriority, FindingProgressEntry } from '@/types'
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
  const [addProgressWithClosing, setAddProgressWithClosing] = useState(false)
  const [showClosingOnly, setShowClosingOnly] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [showInitialPhotoModal, setShowInitialPhotoModal] = useState(false)
  const [reviewDecision, setReviewDecision] = useState<'APPROVED' | 'REJECTED' | null>(null)
  const [rejectionNotes, setRejectionNotes] = useState('')
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null)

  const { finding, loading, addProgress, submitClosing, approveClosing, rejectClosing, updateInitialPhotos } = useFinding(id)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!finding) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertTriangle size={40} className="text-gray-400" />
      <p className="text-gray-500 text-sm">Temuan tidak ditemukan</p>
      <Button variant="outline" size="sm" onClick={() => navigate('/findings')}>Kembali</Button>
    </div>
  )

  const canAddProgress = user && ['SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'OP_HEAD', 'SITE_MGR', 'PIC', 'STAFF_HSSE'].includes(user.role)
    && ['OPEN', 'IN_PROGRESS', 'OVERDUE'].includes(finding.status)
  const canUploadInitialPhoto = canAddProgress
  const canSubmitClosing = canAddProgress
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
          {canUploadInitialPhoto && (
            <Button variant="outline" size="sm" onClick={() => setShowInitialPhotoModal(true)}>
              <Camera size={15} /> Foto Kondisi Awal
            </Button>
          )}
          {canAddProgress && (
            <Button variant="outline" size="sm" onClick={() => setShowAddProgress(true)}>
              <Plus size={15} /> Tambah Progress
            </Button>
          )}
          {canSubmitClosing && finding.status !== 'PENDING_APPROVAL' && (
            <Button size="sm" onClick={() => {
              if (progressEntries.length > 0) {
                setShowClosingOnly(true)
              } else {
                setAddProgressWithClosing(true)
                setShowAddProgress(true)
              }
            }}>
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

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500 flex items-center gap-1"><ImageIcon size={12} />Foto Kondisi Awal</p>
              {canUploadInitialPhoto && (
                <button
                  onClick={() => setShowInitialPhotoModal(true)}
                  className="text-xs text-[#1B3A6B] hover:underline flex items-center gap-1"
                >
                  <Camera size={11} /> Tambah Foto
                </button>
              )}
            </div>
            {finding.initial_photos && finding.initial_photos.length > 0 ? (
              <div className="flex gap-2 flex-wrap">
                {finding.initial_photos.map((photo, i) => (
                  <img
                    key={i}
                    src={photo}
                    alt={`Foto ${i + 1}`}
                    className="w-24 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90"
                    onClick={() => setLightbox({ photos: finding.initial_photos!, index: i })}
                  />
                ))}
              </div>
            ) : (
              <div
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed ${canUploadInitialPhoto ? 'border-gray-300 cursor-pointer hover:border-[#1B3A6B]/50 hover:bg-[#1B3A6B]/5' : 'border-gray-200 bg-gray-50'}`}
                onClick={() => canUploadInitialPhoto && setShowInitialPhotoModal(true)}
              >
                <Camera size={20} className="text-gray-300" />
                <p className="text-xs text-gray-400">
                  {canUploadInitialPhoto ? 'Klik untuk unggah foto kondisi awal temuan' : 'Belum ada foto kondisi awal'}
                </p>
              </div>
            )}
          </div>

          {finding.status === 'CLOSED' && finding.closing_evidence && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1.5"><CheckCircle size={13} />Evidence Closing</p>
              <div className="flex gap-2 flex-wrap">
                {finding.closing_evidence.map((photo, i) => (
                  <img key={i} src={photo} alt={`Evidence ${i + 1}`} className="w-24 h-20 object-cover rounded-lg border border-green-200 cursor-pointer hover:opacity-90"
                    onClick={() => setLightbox({ photos: finding.closing_evidence!, index: i })} />
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
                  <img key={i} src={photo} alt={`Evidence ${i + 1}`} className="w-28 h-22 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90"
                    onClick={() => setLightbox({ photos: finding.closing_request!.evidence_photos, index: i })} />
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

          {sortedEntries.map((entry, _i) => (
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
                        <img key={pi} src={p} alt="" className="w-20 h-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90"
                          onClick={() => setLightbox({ photos: entry.photos!, index: pi })} />
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

      {/* Initial Photo Upload Modal */}
      <InitialPhotoModal
        open={showInitialPhotoModal}
        onClose={() => setShowInitialPhotoModal(false)}
        onSave={async (files) => {
          const { urls, error: upErr } = await uploadPhotos('finding-photos', `findings/${id}/initial`, files)
          if (upErr) { showError('Gagal mengunggah', upErr); return }
          const result = await updateInitialPhotos(urls)
          if (result?.error) { showError('Gagal menyimpan', result.error); return }
          setShowInitialPhotoModal(false)
          success('Foto diunggah', `${urls.length} foto kondisi awal berhasil disimpan`)
        }}
      />

      {/* Add Progress Modal */}
      <AddProgressModal open={showAddProgress} onClose={() => { setShowAddProgress(false); setAddProgressWithClosing(false) }}
        isOverdue={finding.status === 'OVERDUE'}
        initialWithClosing={addProgressWithClosing}
        onSave={async (data) => {
          let photoUrls: string[] = []
          if (data.photos.length > 0) {
            const { urls, error: upErr } = await uploadPhotos('finding-photos', `findings/${id}/progress`, data.photos)
            if (upErr) { showError('Gagal mengunggah foto', upErr); return }
            photoUrls = urls
          }
          const progressResult = await addProgress({
            action_date: data.action_date || new Date().toISOString().split('T')[0],
            action_type: data.action_type,
            description: data.description,
            photos: photoUrls,
            next_steps: data.next_steps || undefined,
            next_action_date: data.next_action_date || undefined,
            created_by: user?.id ?? '',
          })
          if (progressResult?.error) { showError('Gagal menyimpan progress', progressResult.error); return }

          if (data.closing) {
            let evidenceUrls: string[] = []
            if (data.closing.evidenceFiles.length > 0) {
              const { urls, error: upErr } = await uploadPhotos('finding-photos', `findings/${id}/closing`, data.closing.evidenceFiles)
              if (upErr) { showError('Gagal mengunggah foto closing', upErr); return }
              evidenceUrls = urls
            }
            const closingResult = await submitClosing({
              action_date: data.closing.closing_date || new Date().toISOString().split('T')[0],
              summary: data.closing.summary,
              condition_after: data.closing.condition_after,
              evidence_photos: evidenceUrls,
              submitted_by: user?.id ?? '',
            })
            if (closingResult?.error) { showError('Gagal mengajukan closing', closingResult.error); return }
            setShowAddProgress(false)
            setAddProgressWithClosing(false)
            success('Closing diajukan', 'Progress tersimpan dan atasan akan menerima notifikasi untuk mereview')
          } else {
            setShowAddProgress(false)
            setAddProgressWithClosing(false)
            success('Progress ditambahkan', 'Status temuan diperbarui menjadi In Progress')
          }
        }}
      />

      {/* Closing Only Modal (pakai data progress terakhir) */}
      <ClosingOnlyModal
        open={showClosingOnly}
        onClose={() => setShowClosingOnly(false)}
        lastEntry={progressEntries[progressEntries.length - 1]}
        isOverdue={finding.status === 'OVERDUE'}
        onSave={async ({ condition_after, evidenceFiles }) => {
          let evidenceUrls: string[] = []
          if (evidenceFiles.length > 0) {
            const { urls, error: upErr } = await uploadPhotos('finding-photos', `findings/${id}/closing`, evidenceFiles)
            if (upErr) { showError('Gagal mengunggah foto closing', upErr); return }
            evidenceUrls = urls
          }
          const last = progressEntries[progressEntries.length - 1]
          const closingResult = await submitClosing({
            action_date: last.action_date,
            summary: last.description,
            condition_after,
            evidence_photos: evidenceUrls,
            submitted_by: user?.id ?? '',
          })
          if (closingResult?.error) { showError('Gagal mengajukan closing', closingResult.error); return }
          setShowClosingOnly(false)
          success('Closing diajukan', 'Atasan akan menerima notifikasi untuk mereview')
        }}
      />

      {/* Photo Lightbox */}
      {lightbox && (
        <PhotoLightbox
          photos={lightbox.photos}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}

      {/* Review Closing Modal */}
      <Modal open={showReviewModal} onClose={() => setShowReviewModal(false)}
        title={reviewDecision === 'APPROVED' ? 'Setujui Closing Temuan' : 'Tolak Closing Temuan'}
        size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setShowReviewModal(false)}>Batal</Button>
          <Button variant={reviewDecision === 'APPROVED' ? 'primary' : 'danger'}
            onClick={async () => {
              if (reviewDecision === 'APPROVED') {
                const result = await approveClosing(user?.id ?? '')
                if (!result?.error) success('Closing disetujui', 'Temuan ditutup secara resmi')
              } else {
                const result = await rejectClosing(user?.id ?? '', rejectionNotes)
                if (!result?.error) showError('Closing ditolak', 'PIC dapat melanjutkan menambah progress')
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

function PhotoLightbox({ photos, index: initialIndex, onClose }: {
  photos: string[]
  index: number
  onClose: () => void
}) {
  const [index, setIndex] = useState(initialIndex)
  const prev = () => setIndex(i => (i - 1 + photos.length) % photos.length)
  const next = () => setIndex(i => (i + 1) % photos.length)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setIndex(i => (i - 1 + photos.length) % photos.length)
      if (e.key === 'ArrowRight') setIndex(i => (i + 1) % photos.length)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [photos.length, onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative flex items-center gap-3 max-w-4xl w-full px-4" onClick={e => e.stopPropagation()}>
        {photos.length > 1 && (
          <button
            onClick={prev}
            className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-xl transition-colors"
          >
            ‹
          </button>
        )}
        <div className="flex-1 flex flex-col items-center gap-3">
          <img
            src={photos[index]}
            alt={`Foto ${index + 1}`}
            className="max-h-[75vh] max-w-full rounded-xl object-contain shadow-2xl"
          />
          {photos.length > 1 && (
            <p className="text-white/60 text-xs">{index + 1} / {photos.length}</p>
          )}
        </div>
        {photos.length > 1 && (
          <button
            onClick={next}
            className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-xl transition-colors"
          >
            ›
          </button>
        )}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-0 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white text-sm transition-colors"
        >
          ✕
        </button>
      </div>
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

function InitialPhotoModal({ open, onClose, onSave }: {
  open: boolean
  onClose: () => void
  onSave: (files: File[]) => Promise<void>
}) {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)

  const handleSave = async () => {
    if (files.length === 0) return
    setUploading(true)
    await onSave(files)
    setUploading(false)
    setFiles([])
  }

  return (
    <Modal open={open} onClose={onClose} title="Unggah Foto Kondisi Awal" size="md"
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={uploading}>Batal</Button>
        <Button onClick={handleSave} disabled={files.length === 0 || uploading}>
          {uploading ? 'Mengunggah...' : <><Camera size={15} /> Simpan Foto</>}
        </Button>
      </>}
    >
      <div className="flex flex-col gap-4">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
          Unggah foto yang menunjukkan kondisi awal / kondisi saat temuan ditemukan. Foto ini bersifat permanen dan tidak dapat dihapus setelah disimpan.
        </div>
        <FileUpload
          label="Foto Kondisi Awal"
          accept="image/*"
          maxFiles={10}
          maxSizeMB={10}
          onChange={setFiles}
        />
      </div>
    </Modal>
  )
}

function ClosingOnlyModal({ open, onClose, onSave, lastEntry, isOverdue }: {
  open: boolean
  onClose: () => void
  lastEntry: FindingProgressEntry | undefined
  isOverdue?: boolean
  onSave: (data: { condition_after: string; evidenceFiles: File[] }) => void
}) {
  const [condition_after, setConditionAfter] = useState('')
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([])

  useEffect(() => {
    if (open) {
      setConditionAfter(lastEntry?.description ?? '')
      setEvidenceFiles([])
    }
  }, [open, lastEntry?.description])

  const valid = condition_after.trim() !== ''

  return (
    <Modal open={open} onClose={onClose} title="Ajukan Closing Temuan" size="lg"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Batal</Button>
        <Button onClick={() => valid && onSave({ condition_after, evidenceFiles })} disabled={!valid}>
          <Send size={15} /> Ajukan Closing
        </Button>
      </>}
    >
      <div className="flex flex-col gap-4">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
          Form diisi otomatis dari <strong>progress terakhir</strong>. Periksa dan sesuaikan jika perlu.
        </div>

        {/* Preview progress terakhir */}
        {lastEntry && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Data dari Progress Terakhir</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-[11px] text-gray-400 mb-0.5">Tanggal Penyelesaian</p>
                <p className="text-sm font-semibold text-gray-700">{formatDate(lastEntry.action_date)}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-[11px] text-gray-400 mb-0.5">Jenis Tindakan</p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getActionTypeColor(lastEntry.action_type)}`}>
                  {getActionTypeLabel(lastEntry.action_type)}
                </span>
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-[11px] text-gray-400 mb-0.5">Ringkasan Tindakan</p>
              <p className="text-sm text-gray-700">{lastEntry.description}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4 pl-4 border-l-2 border-amber-300">
          {isOverdue && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              <p className="font-semibold mb-1">Temuan Melewati Batas Target</p>
              <p>Closing akan dicatat sebagai <strong>raport buruk</strong> dan memengaruhi penilaian kinerja.</p>
            </div>
          )}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            Setelah diajukan, status berubah menjadi <strong>PENDING APPROVAL</strong> dan atasan akan menerima notifikasi.
          </div>
          <Textarea label="Kondisi Setelah Perbaikan" required value={condition_after}
            onChange={e => setConditionAfter(e.target.value)}
            placeholder="Deskripsi kondisi objek setelah perbaikan selesai..." rows={3} />
          <FileUpload label="Foto Evidence Closing" accept="image/*,.pdf" maxFiles={10} maxSizeMB={10} onChange={setEvidenceFiles} />
        </div>
      </div>
    </Modal>
  )
}

function AddProgressModal({ open, onClose, onSave, isOverdue, initialWithClosing }: {
  open: boolean
  onClose: () => void
  isOverdue?: boolean
  initialWithClosing?: boolean
  onSave: (data: {
    action_date: string; action_type: string; description: string
    next_steps: string; next_action_date: string; photos: File[]
    closing?: { summary: string; condition_after: string; closing_date: string; evidenceFiles: File[] }
  }) => void
}) {
  const [form, setForm] = useState({ action_date: '', action_type: '', description: '', next_steps: '', next_action_date: '' })
  const [photos, setPhotos] = useState<File[]>([])
  const [withClosing, setWithClosing] = useState(false)
  const [condition_after, setConditionAfter] = useState('')
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([])
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (open) setWithClosing(!!initialWithClosing)
  }, [open, initialWithClosing])

  const progressValid = form.action_date && form.action_type && form.description
  const closingValid = !withClosing || condition_after.trim() !== ''

  const handleSave = () => {
    if (!progressValid || !closingValid) return
    onSave({
      ...form, photos,
      closing: withClosing ? {
        closing_date: form.action_date,
        summary: form.description,
        condition_after,
        evidenceFiles,
      } : undefined,
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={initialWithClosing ? 'Ajukan Closing Temuan' : 'Tambah Progress Entry'} size="lg"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Batal</Button>
        <Button onClick={handleSave} disabled={!progressValid || !closingValid}>
          {withClosing ? <><Send size={15} /> {initialWithClosing ? 'Ajukan Closing' : 'Simpan & Ajukan Closing'}</> : 'Simpan Progress'}
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
        <FileUpload label="Foto Progress" accept="image/*" maxFiles={5} maxSizeMB={10} onChange={setPhotos} />

        {/* Toggle closing */}
        {!initialWithClosing && (
          <div
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border cursor-pointer select-none transition-colors',
              withClosing ? 'bg-amber-50 border-amber-300' : 'bg-gray-50 border-gray-200 hover:border-gray-300'
            )}
            onClick={() => setWithClosing(v => !v)}
          >
            <div className={cn('w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
              withClosing ? 'bg-amber-500 border-amber-500' : 'border-gray-300 bg-white')}>
              {withClosing && <span className="text-white text-[11px] font-bold leading-none">✓</span>}
            </div>
            <div>
              <p className={cn('text-sm font-semibold', withClosing ? 'text-amber-800' : 'text-gray-700')}>
                Langsung Ajukan Closing
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Tandai ini jika tindakan di atas adalah penyelesaian terakhir temuan
              </p>
            </div>
          </div>
        )}

        {withClosing && (
          <div className="flex flex-col gap-4 pl-4 border-l-2 border-amber-300">
            {isOverdue && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                <p className="font-semibold mb-1">Temuan Melewati Batas Target</p>
                <p>Closing akan dicatat sebagai <strong>raport buruk</strong> dan memengaruhi penilaian kinerja.</p>
              </div>
            )}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              Setelah diajukan, status berubah menjadi <strong>PENDING APPROVAL</strong> dan atasan akan menerima notifikasi.
            </div>

            {/* Preview data yang diambil dari progress */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-[11px] text-gray-400 mb-0.5">Tanggal Penyelesaian</p>
                <p className="text-sm font-semibold text-gray-700">{form.action_date || '—'}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Dari tanggal tindakan</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 col-span-1">
                <p className="text-[11px] text-gray-400 mb-0.5">Ringkasan Tindakan</p>
                <p className="text-sm text-gray-700 line-clamp-2">{form.description || '—'}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Dari deskripsi tindakan</p>
              </div>
            </div>

            <Textarea label="Kondisi Setelah Perbaikan" required value={condition_after}
              onChange={e => setConditionAfter(e.target.value)}
              placeholder="Deskripsi kondisi objek setelah perbaikan selesai..." rows={2} />
            <FileUpload label="Foto Evidence Closing" accept="image/*,.pdf" maxFiles={10} maxSizeMB={10} onChange={setEvidenceFiles} />
          </div>
        )}
      </div>
    </Modal>
  )
}


