import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ClipboardCheck, Calendar, User, Ship, CheckCircle2,
  AlertTriangle, AlertCircle, Printer
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useInternalInspection } from '@/hooks/useInternalInspectionsData'
import {
  formatDateShort, getInspectionResultLabel, getInspectionResultColor,
  getStatusLabel, getStatusColor
} from '@/utils'
import { useAuthStore } from '@/stores/authStore'
import InspectionFindingsSection from '@/components/inspection/InspectionFindingsSection'

function ResultBadge({ result }: { result: string | undefined }) {
  if (!result) return <span className="badge bg-gray-100 text-gray-500 border-gray-200">Belum Dinilai</span>
  const color = getInspectionResultColor(result as never)
  const label = getInspectionResultLabel(result as never)
  const icon = result === 'SATISFACTORY' ? <CheckCircle2 size={12} /> : result === 'CONDITIONAL' ? <AlertTriangle size={12} /> : <AlertCircle size={12} />
  return <span className={`badge ${color}`}>{icon} {label}</span>
}

export default function InternalInspectionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const {
    inspection: insp, loading,
    addFindingProgress, submitFindingClosing, approveFindingClosing, rejectFindingClosing,
  } = useInternalInspection(id)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!insp) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle size={40} className="text-gray-300" />
        <p className="text-gray-500">Inspeksi tidak ditemukan.</p>
        <Button variant="outline" onClick={() => navigate('/inspections/internal')}>Kembali ke Daftar</Button>
      </div>
    )
  }

  const satisfactoryRate = insp.total_items_checked > 0
    ? Math.round((insp.items_satisfactory / insp.total_items_checked) * 100)
    : 0

  return (
    <div className="flex flex-col gap-5 max-w-5xl mx-auto w-full">

      {/* Back + Action */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/inspections/internal')} className="gap-2">
          <ArrowLeft size={16} /> Kembali
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2 no-print">
            <Printer size={15} /> Cetak
          </Button>
        </div>
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#EBF0FA' }}>
              <ClipboardCheck size={22} style={{ color: '#1B3A6B' }} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-mono">{insp.reference_no}</p>
              <h2 className="text-lg font-bold text-gray-900">Inspeksi Internal Kapal</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`badge ${getStatusColor(insp.status as never)}`}>{getStatusLabel(insp.status as never)}</span>
                <ResultBadge result={insp.result} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-100">
          <div className="flex items-center gap-2.5">
            <Ship size={16} className="text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Kapal</p>
              <p className="text-sm font-semibold text-gray-800">{insp.vessel?.name}</p>
              <p className="text-xs text-gray-500">{insp.vessel?.vessel_type}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Calendar size={16} className="text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Tanggal Inspeksi</p>
              <p className="text-sm font-semibold text-gray-800">{formatDateShort(insp.inspection_date)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <User size={16} className="text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Lead Inspektor</p>
              <p className="text-sm font-semibold text-gray-800">{insp.lead_inspector}</p>
              {insp.inspectors.length > 1 && (
                <p className="text-xs text-gray-500">+{insp.inspectors.length - 1} lainnya</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <User size={16} className="text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Dibuat oleh</p>
              <p className="text-sm font-semibold text-gray-800">{insp.created_by_user?.full_name || insp.created_by}</p>
              {insp.approved_at && (
                <p className="text-xs text-green-600">Disetujui {formatDateShort(insp.approved_at)}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      {insp.total_items_checked > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500">Total Item Diperiksa</p>
            <p className="text-3xl font-bold text-[#1B3A6B] mt-1">{insp.total_items_checked}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500">Satisfactory</p>
            <p className="text-3xl font-bold text-green-700 mt-1">{insp.items_satisfactory}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500">Deficient</p>
            <p className="text-3xl font-bold text-orange-600 mt-1">{insp.items_deficient}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500">Tingkat Kepatuhan</p>
            <p className={`text-3xl font-bold mt-1 ${satisfactoryRate >= 80 ? 'text-green-700' : satisfactoryRate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
              {satisfactoryRate}%
            </p>
            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${satisfactoryRate}%`, backgroundColor: satisfactoryRate >= 80 ? '#1A7A4A' : satisfactoryRate >= 60 ? '#C8922A' : '#C0392B' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Inspectors */}
      {insp.inspectors.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Tim Inspektor</h3>
          <div className="flex flex-wrap gap-2">
            {insp.inspectors.map((name, i) => (
              <div key={i} className="flex items-center gap-2 bg-blue-50 text-blue-800 px-3 py-1.5 rounded-lg text-sm">
                <User size={13} />
                <span>{name}</span>
                {i === 0 && <span className="text-[10px] bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold ml-1">Lead</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Findings */}
      <InspectionFindingsSection
        initialFindings={insp.findings}
        canAdd={!!(user && ['SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'OP_HEAD'].includes(user.role) && insp.status !== 'DRAFT')}
        findingOps={{
          addProgress: (fId, data) => addFindingProgress(fId, data),
          submitClosing: (fId, data) => submitFindingClosing(fId, data),
          approveClosing: (fId) => approveFindingClosing(fId),
          rejectClosing: (fId, notes) => rejectFindingClosing(fId, notes),
        }}
      />

      {/* Notes */}
      {insp.notes && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Catatan & Rekomendasi</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{insp.notes}</p>
        </div>
      )}
    </div>
  )
}
