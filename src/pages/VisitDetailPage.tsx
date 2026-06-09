import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, CheckCircle, XCircle, AlertTriangle, Star, Users, Calendar, Building2, Printer, ClipboardList, ChevronDown, ChevronUp, ImagePlus, X, Image, Send } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Textarea, Input, Select } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { supabase } from '@/lib/supabase'
import { useVisit } from '@/hooks/useVisitsData'
import { useAuthStore } from '@/stores/authStore'
import {
  getVisitTypeLabel, getVisitTypeColor, getStatusLabel, getStatusColor,
  getPriorityColor, getPriorityLabel, formatDate, formatDateShort,
} from '@/utils'
import {
  PREP_OFFICE_ITEMS, PREP_VESSEL_ITEMS, INSPECTION_AREAS,
  defaultInspectionData, inspectionStorageKey,
  type VesselInspectionData, type AreaCheck,
} from '@/data/vesselInspectionConstants'
import type { FindingPriority } from '@/types'

export default function VisitDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { success, error } = useToast()
  const [showAddFinding, setShowAddFinding] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showSubmitFinalModal, setShowSubmitFinalModal] = useState(false)
  const [rejectionNotes, setRejectionNotes] = useState('')
  const [checklistOpen, setChecklistOpen] = useState(false)

  const { visit, findings, loading, error: visitError, approveVisit, rejectVisit, submitVisit, addFinding } = useVisit(id)

  // ── Inspection checklist state ───────────────────────────────────────────────
  const storageKey = id ? inspectionStorageKey(id) : ''
  const [inspection, setInspection] = useState<VesselInspectionData>(() => {
    if (!id) return defaultInspectionData(undefined, undefined)
    const stored = sessionStorage.getItem(inspectionStorageKey(id))
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        return {
          ...defaultInspectionData(undefined, undefined),
          ...parsed,
          visitPhotos: Array.isArray(parsed.visitPhotos) ? parsed.visitPhotos : [],
          attendancePhotos: Array.isArray(parsed.attendancePhotos) ? parsed.attendancePhotos : [],
        }
      } catch { /* ignore */ }
    }
    return defaultInspectionData(undefined, undefined)
  })

  // Seed inspection defaults from visit once loaded (only if no sessionStorage entry)
  useEffect(() => {
    if (!visit || !id) return
    const stored = sessionStorage.getItem(inspectionStorageKey(id))
    if (!stored) {
      setInspection(defaultInspectionData(visit.agenda, visit.summary))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visit?.id])

  // Auto-save to sessionStorage whenever checklist data changes
  useEffect(() => {
    if (storageKey) sessionStorage.setItem(storageKey, JSON.stringify(inspection))
  }, [inspection, storageKey])

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
      <Button variant="outline" size="sm" onClick={() => navigate(-1)}>Kembali</Button>
    </div>
  )

  const canApprove = user && ['SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'OP_HEAD', 'SITE_MGR'].includes(user.role) && visit.status === 'SUBMITTED'
  // Bisa tambah temuan saat kunjungan aktif (APPROVED tapi belum disetujui final / approved_by belum di-set)
  const canAddFinding = user && ['SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'OP_HEAD', 'SITE_MGR', 'PIC'].includes(user.role) && visit.status === 'APPROVED' && !visit.approved_by
  // Creator atau admin bisa submit laporan akhir setelah kunjungan selesai
  const canSubmitFinal = visit.status === 'APPROVED' && !visit.approved_by && user &&
    (visit.created_by === user.id || ['SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'OP_HEAD', 'SITE_MGR'].includes(user.role))
  const isVesselReport = visit.visit_type === 'VESSEL_VISIT' || visit.visit_type === 'OWNER_VISIT'

  // helpers for updating inspection state
  const setPrepOffice = (i: number, patch: Partial<AreaCheck>) =>
    setInspection(p => {
      const arr = [...p.prepOffice]
      arr[i] = { ...arr[i], ...patch }
      return { ...p, prepOffice: arr }
    })

  const setPrepVessel = (i: number, patch: Partial<AreaCheck>) =>
    setInspection(p => {
      const arr = [...p.prepVessel]
      arr[i] = { ...arr[i], ...patch }
      return { ...p, prepVessel: arr }
    })

  const setArea = (i: number, patch: Partial<AreaCheck>) =>
    setInspection(p => {
      const arr = [...p.areas]
      arr[i] = { ...arr[i], ...patch }
      return { ...p, areas: arr }
    })

  const handleSaveChecklist = () => {
    sessionStorage.setItem(storageKey, JSON.stringify(inspection))
    success('Checklist disimpan', 'Data akan otomatis terisi saat cetak laporan')
  }

  const handlePrint = () => {
    sessionStorage.setItem(storageKey, JSON.stringify(inspection))
    navigate(`/visits/${id}/print`)
  }

  return (
    <div className="flex flex-col gap-5 max-w-5xl mx-auto w-full">

      {/* ── Back + actions ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Kembali
        </Button>
        <div className="flex items-center gap-2">
          {isVesselReport && (
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer size={15} /> Cetak Laporan
            </Button>
          )}
          {canSubmitFinal && (
            <Button variant="outline" size="sm" onClick={() => setShowSubmitFinalModal(true)}>
              <Send size={15} /> Submit Laporan Akhir
            </Button>
          )}
          {canApprove && (
            <>
              <Button variant="danger" size="sm" onClick={() => setShowRejectModal(true)}>
                <XCircle size={15} /> Tolak
              </Button>
              <Button size="sm" onClick={() => setShowApproveModal(true)}>
                <CheckCircle size={15} /> Setujui
              </Button>
            </>
          )}
          {canAddFinding && (
            <Button onClick={() => setShowAddFinding(true)}>
              <Plus size={16} /> Tambah Temuan
            </Button>
          )}
        </div>
      </div>

      {/* ── Header card ────────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 flex-wrap mb-3">
            <span className={`badge ${getVisitTypeColor(visit.visit_type)}`}>{getVisitTypeLabel(visit.visit_type)}</span>
            <span className={`badge ${getStatusColor(visit.status)}`}>{getStatusLabel(visit.status)}</span>
            {visit.visit_type === 'OWNER_VISIT' && (
              <span className="badge bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
                <Star size={11} /> Owner Visit – Prioritas Utama
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-[#1B3A6B] mb-1">{visit.reference_no}</h2>
          <p className="text-sm text-gray-500">
            Dibuat oleh {visit.created_by_user?.full_name || '—'} pada {formatDate(visit.created_at)}
          </p>
          {visit.approved_by && (
            <p className="text-xs text-green-600 mt-1">
              Disetujui oleh {visit.approved_by_user?.full_name || '—'} pada {formatDate(visit.approved_at!)}
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-1"><Building2 size={12} />Unit Bisnis</p>
              <p className="text-sm font-semibold">{visit.business_unit?.name || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-1"><Calendar size={12} />Tanggal Kunjungan</p>
              <p className="text-sm font-semibold">{formatDate(visit.visit_date)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Obyek Kunjungan</p>
              <p className="text-sm font-semibold">{visit.vessel?.name || visit.site?.name || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Waktu</p>
              <p className="text-sm font-semibold">{visit.start_time || '—'} – {visit.end_time || '—'}</p>
            </div>
          </div>

          {visit.participants.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-2"><Users size={12} />Peserta Kunjungan</p>
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

          {visit.rejection_notes && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs font-semibold text-red-700 mb-1">Catatan Penolakan</p>
              <p className="text-sm text-red-700">{visit.rejection_notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Checklist Inspeksi Kapal (hanya Vessel/Owner Visit) ─────────────── */}
      {isVesselReport && (
        <Card>
          {/* Header – clickable to expand/collapse */}
          <button
            type="button"
            onClick={() => setChecklistOpen(o => !o)}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors rounded-t-xl"
          >
            <div className="flex items-center gap-2">
              <ClipboardList size={18} className="text-[#1B3A6B]" />
              <span className="font-semibold text-[#1B3A6B]">Checklist Inspeksi Kapal</span>
              <span className="text-xs text-gray-400 font-normal">
                — isi di sini agar laporan cetak otomatis terisi
              </span>
            </div>
            {checklistOpen
              ? <ChevronUp size={18} className="text-gray-400" />
              : <ChevronDown size={18} className="text-gray-400" />}
          </button>

          {checklistOpen && (
            <CardContent className="p-0 border-t border-gray-100">
              <div className="p-6 flex flex-col gap-6">

                {/* ── Section A ──────────────────────────────────────────────── */}
                <div>
                  <p className="text-sm font-semibold text-[#1B3A6B] mb-2">A. Persiapan di Kantor</p>
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 w-8">No.</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Persiapan</th>
                          <th className="px-3 py-2 text-xs font-semibold text-gray-600 text-center w-24">Y / N</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 w-56">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {PREP_OFFICE_ITEMS.map((item, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="px-3 py-2 text-xs text-gray-500 text-center">{i + 1}</td>
                            <td className="px-3 py-2 text-xs text-gray-700">{item}</td>
                            <td className="px-3 py-2">
                              <YNToggle
                                value={inspection.prepOffice[i]?.yn}
                                onChange={yn => setPrepOffice(i, { yn })}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-[#1B3A6B]"
                                value={inspection.prepOffice[i]?.notes}
                                onChange={e => setPrepOffice(i, { notes: e.target.value })}
                                placeholder="Keterangan..."
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ── Section B ──────────────────────────────────────────────── */}
                <div>
                  <p className="text-sm font-semibold text-[#1B3A6B] mb-2">B. Kunjungan di Kapal</p>
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 w-8">No.</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Kegiatan</th>
                          <th className="px-3 py-2 text-xs font-semibold text-gray-600 text-center w-24">Y / N</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 w-56">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {PREP_VESSEL_ITEMS.map((item, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="px-3 py-2 text-xs text-gray-500 text-center">{i + 1}</td>
                            <td className="px-3 py-2 text-xs text-gray-700">{item}</td>
                            <td className="px-3 py-2">
                              <YNToggle
                                value={inspection.prepVessel[i]?.yn}
                                onChange={yn => setPrepVessel(i, { yn })}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-[#1B3A6B]"
                                value={inspection.prepVessel[i]?.notes}
                                onChange={e => setPrepVessel(i, { notes: e.target.value })}
                                placeholder="Keterangan..."
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ── Section C ──────────────────────────────────────────────── */}
                <div>
                  <p className="text-sm font-semibold text-[#1B3A6B] mb-1">C. Pemeriksaan Area Kapal</p>
                  <p className="text-xs text-gray-500 mb-2">Isi Y/N per area dan tambahkan keterangan jika ada temuan/catatan.</p>
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 w-8">No.</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Area / Ruangan</th>
                          <th className="px-3 py-2 text-xs font-semibold text-gray-600 text-center w-24">Y / N</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Keterangan / Temuan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {INSPECTION_AREAS.map((area, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="px-3 py-2 text-xs text-gray-500 text-center">{i + 1}</td>
                            <td className="px-3 py-2 text-xs font-medium text-gray-700">{area}</td>
                            <td className="px-3 py-2">
                              <YNToggle
                                value={inspection.areas[i]?.yn}
                                onChange={yn => setArea(i, { yn })}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <textarea
                                className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-[#1B3A6B] resize-none"
                                rows={2}
                                value={inspection.areas[i]?.notes}
                                onChange={e => setArea(i, { notes: e.target.value })}
                                placeholder="Catatan atau uraian temuan untuk area ini..."
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ── Section D – Diskusi K3LL ────────────────────────────── */}
                <div>
                  <p className="text-sm font-semibold text-[#1B3A6B] mb-1">D. Diskusi K3LL / Lesson Learned</p>
                  <textarea
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#1B3A6B] resize-none"
                    rows={4}
                    value={inspection.discussion}
                    onChange={e => setInspection(p => ({ ...p, discussion: e.target.value }))}
                    placeholder="Topik diskusi K3LL, komentar antusias awak kapal, pemahaman awak kapal terhadap topik diskusi, dll..."
                  />
                </div>

                {/* ── Section E – Keluhan ─────────────────────────────────── */}
                <div>
                  <p className="text-sm font-semibold text-[#1B3A6B] mb-1">E. Keluhan dari Awak Kapal</p>
                  <textarea
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#1B3A6B] resize-none"
                    rows={3}
                    value={inspection.complaints}
                    onChange={e => setInspection(p => ({ ...p, complaints: e.target.value }))}
                    placeholder="Rincian keluhan awak kapal dan departemen yang dituju..."
                  />
                </div>

                {/* ── Section F – Foto Kunjungan ─────────────────────────── */}
                <div>
                  <p className="text-sm font-semibold text-[#1B3A6B] mb-1">F. Foto Selama Kunjungan di Kapal</p>
                  <p className="text-xs text-gray-500 mb-2">Upload satu atau lebih foto dokumentasi kunjungan. Foto akan muncul di laporan cetak.</p>
                  <PhotoPicker
                    photos={inspection.visitPhotos}
                    onAdd={newPhotos => setInspection(p => ({ ...p, visitPhotos: [...p.visitPhotos, ...newPhotos] }))}
                    onRemove={idx => setInspection(p => ({ ...p, visitPhotos: p.visitPhotos.filter((_, i) => i !== idx) }))}
                  />
                </div>

                {/* ── Lampiran 1 – Foto Daftar Hadir ─────────────────────── */}
                <div>
                  <p className="text-sm font-semibold text-[#1B3A6B] mb-1">Lampiran 1: Foto Daftar Hadir</p>
                  <p className="text-xs text-gray-500 mb-2">Upload foto daftar hadir yang sudah ditandatangani secara manual. Bisa lebih dari 1 foto.</p>
                  <PhotoPicker
                    photos={inspection.attendancePhotos}
                    onAdd={newPhotos => setInspection(p => ({ ...p, attendancePhotos: [...p.attendancePhotos, ...newPhotos] }))}
                    onRemove={idx => setInspection(p => ({ ...p, attendancePhotos: p.attendancePhotos.filter((_, i) => i !== idx) }))}
                  />
                </div>

                {/* ── Action buttons ──────────────────────────────────────── */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-400">Data otomatis tersimpan saat diubah. Klik "Cetak Laporan" untuk menghasilkan dokumen laporan kunjungan.</p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleSaveChecklist}>
                      <CheckCircle size={14} /> Simpan Checklist
                    </Button>
                    <Button size="sm" onClick={handlePrint}>
                      <Printer size={14} /> Cetak Laporan
                    </Button>
                  </div>
                </div>

              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* ── Findings ───────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Daftar Temuan ({findings.length})</CardTitle>
          {canAddFinding && (
            <Button size="sm" onClick={() => setShowAddFinding(true)}>
              <Plus size={14} /> Tambah
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {findings.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-gray-400">
              <AlertTriangle size={32} className="mb-2 opacity-40" />
              <p className="text-sm">Belum ada temuan untuk kunjungan ini</p>
              {visit.status === 'DRAFT' && (
                <p className="text-xs mt-1">Kunjungan masih Draft – klik "Mulai Kunjungan" untuk mengaktifkan</p>
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
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Tgl. Open</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Target Closing</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Actual Closing</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">PIC</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {findings.map(f => {
                    const isLateClose = f.status === 'CLOSED' && f.closed_at && f.closed_at > f.target_close_date
                    return (
                    <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/findings/${f.id}`)}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {f.is_owner_finding && <Star size={13} className="text-amber-500 shrink-0" />}
                          <div>
                            <p className="font-medium text-gray-800 text-xs">{f.title}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{f.reference_no}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{f.category}</td>
                      <td className="px-4 py-3">
                        <span className={`badge text-[11px] ${getPriorityColor(f.priority as FindingPriority)}`}>
                          {getPriorityLabel(f.priority as FindingPriority)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge text-[11px] ${getStatusColor(f.status)}`}>
                          {getStatusLabel(f.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{formatDateShort(f.created_at)}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{formatDateShort(f.target_close_date)}</td>
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3 text-xs text-gray-600">{f.assigned_to_user?.full_name || '—'}</td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); navigate(`/findings/${f.id}`) }}>
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
        </CardContent>
      </Card>

      {/* ── Modals ─────────────────────────────────────────────────────────────── */}
      <Modal open={showSubmitFinalModal} onClose={() => setShowSubmitFinalModal(false)} title="Submit Laporan Akhir" size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setShowSubmitFinalModal(false)}>Batal</Button>
          <Button onClick={async () => {
            const result = await submitVisit()
            setShowSubmitFinalModal(false)
            if (!result?.error) success('Laporan disubmit', 'Atasan akan menerima notifikasi untuk persetujuan akhir')
          }}>
            <Send size={15} /> Submit Laporan
          </Button>
        </>}
      >
        <p className="text-sm text-gray-600">
          Kunjungan <strong>{visit.reference_no}</strong> akan disubmit untuk persetujuan akhir oleh atasan.
          Setelah disubmit, temuan tidak dapat ditambahkan lagi.
        </p>
      </Modal>

      <Modal open={showApproveModal} onClose={() => setShowApproveModal(false)} title="Setujui Laporan Kunjungan" size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setShowApproveModal(false)}>Batal</Button>
          <Button onClick={async () => {
            const result = await approveVisit(user!.id)
            setShowApproveModal(false)
            if (!result?.error) success('Laporan disetujui', 'Persetujuan akhir kunjungan berhasil dicatat')
          }}>
            <CheckCircle size={15} /> Setujui
          </Button>
        </>}
      >
        <p className="text-sm text-gray-600">
          Apakah Anda yakin ingin menyetujui laporan kunjungan <strong>{visit.reference_no}</strong>?
        </p>
      </Modal>

      <Modal open={showRejectModal} onClose={() => setShowRejectModal(false)} title="Tolak Laporan Kunjungan" size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setShowRejectModal(false)}>Batal</Button>
          <Button variant="danger" onClick={async () => {
            const result = await rejectVisit(rejectionNotes)
            setShowRejectModal(false)
            setRejectionNotes('')
            if (!result?.error) error('Laporan ditolak', 'Laporan dikembalikan dengan catatan')
          }}>
            <XCircle size={15} /> Tolak
          </Button>
        </>}
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-600">Masukkan catatan alasan penolakan:</p>
          <Textarea value={rejectionNotes} onChange={e => setRejectionNotes(e.target.value)} placeholder="Tuliskan alasan penolakan..." rows={4} />
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
            is_owner_finding: visit.visit_type === 'OWNER_VISIT',
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

// ─── Y/N Toggle component ──────────────────────────────────────────────────────
function YNToggle({ value, onChange }: { value: 'Y' | 'N' | ''; onChange: (v: 'Y' | 'N' | '') => void }) {
  return (
    <div className="flex items-center gap-1 justify-center">
      <button
        type="button"
        onClick={() => onChange(value === 'Y' ? '' : 'Y')}
        className={`w-8 h-7 rounded text-xs font-bold transition-colors ${
          value === 'Y'
            ? 'bg-green-600 text-white'
            : 'bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-700'
        }`}
      >
        Y
      </button>
      <button
        type="button"
        onClick={() => onChange(value === 'N' ? '' : 'N')}
        className={`w-8 h-7 rounded text-xs font-bold transition-colors ${
          value === 'N'
            ? 'bg-red-600 text-white'
            : 'bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-700'
        }`}
      >
        N
      </button>
    </div>
  )
}

// ─── Photo compression (canvas, max 1400px wide, 75% JPEG) ────────────────────
function compressPhoto(file: File): Promise<string> {
  return new Promise(resolve => {
    const img = new window.Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 1400
      const ratio = Math.min(1, MAX / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * ratio)
      canvas.height = Math.round(img.height * ratio)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(objectUrl)
      resolve(canvas.toDataURL('image/jpeg', 0.75))
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve('') }
    img.src = objectUrl
  })
}

// ─── Photo picker component ────────────────────────────────────────────────────
function PhotoPicker({
  photos, onAdd, onRemove,
}: {
  photos: string[]
  onAdd: (base64List: string[]) => void
  onRemove: (idx: number) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setLoading(true)
    const results: string[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      const b64 = await compressPhoto(file)
      if (b64) results.push(b64)
    }
    onAdd(results)
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Thumbnails grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {photos.map((src, idx) => (
            <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
              <img src={src} alt={`foto-${idx + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Hapus foto"
              >
                <X size={12} />
              </button>
              <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[9px] px-1 rounded">
                {idx + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-[#1B3A6B] hover:bg-blue-50/30 transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-[#1B3A6B]', 'bg-blue-50/30') }}
        onDragLeave={e => { e.currentTarget.classList.remove('border-[#1B3A6B]', 'bg-blue-50/30') }}
        onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
      >
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-4 h-4 border-2 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
            Memproses foto...
          </div>
        ) : (
          <>
            <ImagePlus size={22} className="text-gray-400" />
            <p className="text-xs text-gray-500 text-center">
              <span className="font-semibold text-[#1B3A6B]">Klik untuk pilih foto</span> atau drag &amp; drop
            </p>
            <p className="text-[10px] text-gray-400">JPG, PNG – bisa pilih banyak sekaligus</p>
          </>
        )}
      </div>

      {photos.length > 0 && (
        <p className="text-xs text-gray-500">{photos.length} foto terlampir · foto akan muncul di laporan cetak</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  )
}

// ─── Add Finding Modal ─────────────────────────────────────────────────────────
function AddFindingModal({ open, onClose, onSave }: {
  open: boolean
  onClose: () => void
  onSave: (data: { title: string; description: string; category: string; priority: string; assigned_to: string; target_close_date: string }) => Promise<void>
}) {
  const [form, setForm] = useState({
    title: '', description: '', category: '', priority: 'MEDIUM', assigned_to: '', target_close_date: ''
  })
  const [saving, setSaving] = useState(false)
  const [findingCategories, setFindingCategories] = useState<Array<{id: string, name: string}>>([])
  const [picUsers, setPicUsers] = useState<Array<{id: string, full_name: string}>>([])
  useEffect(() => {
    supabase.from('finding_categories').select('id, name').eq('is_active', true)
      .then(({ data }) => { if (data) setFindingCategories(data as Array<{id: string, name: string}>) })
    supabase.from('users').select('id, full_name').in('role', ['PIC', 'OP_HEAD', 'SITE_MGR']).eq('is_active', true)
      .then(({ data }) => { if (data) setPicUsers(data as Array<{id: string, full_name: string}>) })
  }, [])
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  return (
    <Modal open={open} onClose={onClose} title="Tambah Temuan Baru" size="lg"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Batal</Button>
        <Button loading={saving} onClick={async () => {
          if (form.title && form.description && form.category && form.target_close_date) {
            setSaving(true)
            await onSave(form)
            setSaving(false)
          }
        }}>Simpan Temuan</Button>
      </>}
    >
      <div className="flex flex-col gap-4">
        <Input label="Judul Temuan" required value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ringkasan singkat temuan" />
        <Textarea label="Deskripsi Detail" required value={form.description} onChange={e => set('description', e.target.value)} placeholder="Penjelasan lengkap temuan..." rows={4} />
        <div className="grid grid-cols-2 gap-4">
          <Select searchable label="Kategori" required value={form.category} onChange={e => set('category', e.target.value)} placeholder="Pilih kategori"
            options={findingCategories.map(c => ({ value: c.name, label: c.name }))} />
          <Select label="Tingkat Prioritas" required value={form.priority} onChange={e => set('priority', e.target.value)}
            options={[
              { value: 'CRITICAL', label: 'Critical – Kritis' },
              { value: 'HIGH', label: 'High – Tinggi' },
              { value: 'MEDIUM', label: 'Medium – Sedang' },
              { value: 'LOW', label: 'Low – Rendah' },
            ]} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select searchable label="PIC (Penanggung Jawab)" value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} placeholder="Pilih PIC"
            options={picUsers.map(u => ({ value: u.id, label: u.full_name }))} />
          <Input type="date" label="Target Tanggal Closing" required value={form.target_close_date} onChange={e => set('target_close_date', e.target.value)} />
        </div>
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-700">Foto kondisi awal temuan dapat diunggah setelah temuan disimpan, melalui halaman detail temuan.</p>
        </div>
      </div>
    </Modal>
  )
}
