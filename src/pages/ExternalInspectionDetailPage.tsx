import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Shield, Calendar, User, Ship, CheckCircle2,
  AlertTriangle, AlertCircle, Clock, FileText
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { mockExternalInspections } from '@/data/mockData'
import {
  formatDateShort, getInspectionResultLabel, getInspectionResultColor,
  getExternalInspectionTypeLabel, getExternalInspectionTypeColor
} from '@/utils'
import { useAuthStore } from '@/stores/authStore'
import InspectionFindingsSection from '@/components/inspection/InspectionFindingsSection'

const STATUS_LABEL: Record<string, string> = { SCHEDULED: 'Dijadwalkan', COMPLETED: 'Selesai', CANCELLED: 'Dibatalkan' }
const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-800 border-blue-200',
  COMPLETED: 'bg-green-100 text-green-800 border-green-200',
  CANCELLED: 'bg-gray-100 text-gray-600 border-gray-200',
}

function InfoRow({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: React.ElementType }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-gray-50 last:border-0">
      {Icon && <Icon size={15} className="text-gray-400 mt-0.5 shrink-0" />}
      <div className="flex-1">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm text-gray-800 font-medium">{value}</p>
      </div>
    </div>
  )
}

export default function ExternalInspectionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [insp] = useState(() => mockExternalInspections.find(i => i.id === id))

  if (!insp) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle size={40} className="text-gray-300" />
        <p className="text-gray-500">Inspeksi tidak ditemukan.</p>
        <Button variant="outline" onClick={() => navigate('/inspections/external')}>Kembali ke Daftar</Button>
      </div>
    )
  }

  const today = new Date()
  const daysToExpiry = insp.validity_date
    ? Math.ceil((new Date(insp.validity_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null
  const isExpiringSoon = daysToExpiry !== null && daysToExpiry >= 0 && daysToExpiry <= 90
  const isExpired = daysToExpiry !== null && daysToExpiry < 0

  return (
    <div className="flex flex-col gap-5 max-w-5xl mx-auto w-full">

      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/inspections/external')} className="gap-2 self-start">
        <ArrowLeft size={16} /> Kembali
      </Button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#EBF0FA' }}>
              <Shield size={22} style={{ color: '#1B3A6B' }} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-mono">{insp.reference_no}</p>
              <h2 className="text-lg font-bold text-gray-900">Inspeksi Eksternal Kapal</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`badge ${getExternalInspectionTypeColor(insp.inspection_type)} font-semibold`}>
                  {getExternalInspectionTypeLabel(insp.inspection_type)}
                </span>
                <span className={`badge ${STATUS_COLOR[insp.status]}`}>{STATUS_LABEL[insp.status]}</span>
                {insp.result && (
                  <span className={`badge ${getInspectionResultColor(insp.result)}`}>
                    {insp.result === 'SATISFACTORY' ? <CheckCircle2 size={11} className="inline mr-1" /> :
                     insp.result === 'CONDITIONAL' ? <AlertTriangle size={11} className="inline mr-1" /> :
                     <AlertCircle size={11} className="inline mr-1" />}
                    {getInspectionResultLabel(insp.result)}
                  </span>
                )}
              </div>
            </div>
          </div>
          {insp.report_no && (
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
              <FileText size={13} />
              <span>No. Laporan: <strong className="text-gray-700">{insp.report_no}</strong></span>
            </div>
          )}
        </div>

        {/* Key info row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-100">
          <div className="flex items-center gap-2.5">
            <Ship size={16} className="text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Kapal</p>
              <p className="text-sm font-semibold text-gray-800">{insp.vessel?.name}</p>
              <p className="text-xs text-gray-400">{insp.vessel?.vessel_type}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Calendar size={16} className="text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Tanggal Inspeksi</p>
              <p className="text-sm font-semibold text-gray-800">{formatDateShort(insp.inspection_date)}</p>
              {insp.port && <p className="text-xs text-gray-400">{insp.port}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <User size={16} className="text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Lembaga Inspeksi</p>
              <p className="text-sm font-semibold text-gray-800 leading-tight">{insp.inspecting_body}</p>
              {insp.lead_inspector && <p className="text-xs text-gray-400">{insp.lead_inspector}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Clock size={16} className="text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Validitas Sertifikat</p>
              {insp.validity_date ? (
                <>
                  <p className={`text-sm font-semibold ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-amber-600' : 'text-gray-800'}`}>
                    {formatDateShort(insp.validity_date)}
                  </p>
                  <p className={`text-xs ${isExpired ? 'text-red-500' : isExpiringSoon ? 'text-amber-500' : 'text-gray-400'}`}>
                    {isExpired ? `Kadaluarsa ${Math.abs(daysToExpiry!)} hari lalu` :
                     isExpiringSoon ? `Berlaku ${daysToExpiry} hari lagi` :
                     `Berlaku ${daysToExpiry} hari lagi`}
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-400">{insp.status === 'SCHEDULED' ? 'Belum dilaksanakan' : '-'}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Observations Summary */}
      {insp.status === 'COMPLETED' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500">Total Observasi</p>
            <p className="text-3xl font-bold text-[#1B3A6B] mt-1">{insp.total_observations}</p>
          </div>
          <div className="bg-white rounded-xl border border-l-4 border-gray-100 shadow-sm p-4" style={{ borderLeftColor: '#C0392B' }}>
            <p className="text-xs text-gray-500">Critical</p>
            <p className={`text-3xl font-bold mt-1 ${insp.critical_observations > 0 ? 'text-red-700' : 'text-gray-400'}`}>
              {insp.critical_observations}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-l-4 border-gray-100 shadow-sm p-4" style={{ borderLeftColor: '#D35400' }}>
            <p className="text-xs text-gray-500">Major</p>
            <p className={`text-3xl font-bold mt-1 ${insp.major_observations > 0 ? 'text-orange-700' : 'text-gray-400'}`}>
              {insp.major_observations}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-l-4 border-gray-100 shadow-sm p-4" style={{ borderLeftColor: '#C8922A' }}>
            <p className="text-xs text-gray-500">Minor</p>
            <p className={`text-3xl font-bold mt-1 ${insp.minor_observations > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
              {insp.minor_observations}
            </p>
          </div>
        </div>
      )}

      {/* Detail Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Inspection Details */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Detail Inspeksi</h3>
          <div>
            <InfoRow label="Jenis Inspeksi" value={getExternalInspectionTypeLabel(insp.inspection_type)} icon={Shield} />
            <InfoRow label="Lembaga Inspeksi" value={insp.inspecting_body} icon={Shield} />
            <InfoRow label="Lead Inspector" value={insp.lead_inspector} icon={User} />
            <InfoRow label="Lokasi / Pelabuhan" value={insp.port} icon={Ship} />
            <InfoRow label="Nomor Laporan" value={insp.report_no} icon={FileText} />
            <InfoRow label="Tanggal Inspeksi" value={formatDateShort(insp.inspection_date)} icon={Calendar} />
            {insp.validity_date && (
              <InfoRow label="Berlaku Sampai" value={formatDateShort(insp.validity_date)} icon={Clock} />
            )}
            {insp.next_inspection_date && (
              <InfoRow label="Jadwal Inspeksi Berikutnya" value={formatDateShort(insp.next_inspection_date)} icon={Calendar} />
            )}
            <InfoRow label="Dibuat oleh" value={insp.created_by_user?.full_name} icon={User} />
          </div>
        </div>

        {/* Validity Status */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Status Sertifikat</h3>
          {insp.validity_date ? (
            <div className={`p-4 rounded-lg ${isExpired ? 'bg-red-50 border border-red-200' : isExpiringSoon ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                {isExpired ? <AlertCircle size={18} className="text-red-600" /> :
                 isExpiringSoon ? <AlertTriangle size={18} className="text-amber-600" /> :
                 <CheckCircle2 size={18} className="text-green-600" />}
                <p className={`font-semibold text-sm ${isExpired ? 'text-red-700' : isExpiringSoon ? 'text-amber-700' : 'text-green-700'}`}>
                  {isExpired ? 'Sertifikat Kadaluarsa' : isExpiringSoon ? 'Segera Kadaluarsa' : 'Sertifikat Aktif'}
                </p>
              </div>
              <p className={`text-xs ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-amber-600' : 'text-green-600'}`}>
                {isExpired
                  ? `Sertifikat kadaluarsa pada ${formatDateShort(insp.validity_date)} (${Math.abs(daysToExpiry!)} hari lalu). Segera lakukan inspeksi ulang.`
                  : isExpiringSoon
                  ? `Sertifikat akan kadaluarsa pada ${formatDateShort(insp.validity_date)} (${daysToExpiry} hari lagi). Jadwalkan inspeksi ulang.`
                  : `Sertifikat valid hingga ${formatDateShort(insp.validity_date)} (${daysToExpiry} hari lagi).`}
              </p>
              {insp.next_inspection_date && (
                <p className="text-xs text-gray-500 mt-2">Inspeksi berikutnya: {formatDateShort(insp.next_inspection_date)}</p>
              )}
            </div>
          ) : insp.status === 'SCHEDULED' ? (
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-center gap-2 mb-1">
                <Calendar size={16} className="text-blue-600" />
                <p className="font-semibold text-sm text-blue-700">Inspeksi Dijadwalkan</p>
              </div>
              <p className="text-xs text-blue-600">Inspeksi dijadwalkan pada {formatDateShort(insp.inspection_date)}. Belum ada hasil atau sertifikat.</p>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-xs text-gray-500">Tidak ada informasi sertifikat untuk inspeksi ini.</p>
            </div>
          )}

          {/* Observation breakdown visual */}
          {insp.status === 'COMPLETED' && insp.total_observations > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-gray-600 mb-2">Distribusi Observasi</p>
              <div className="space-y-1.5">
                {[
                  { label: 'Critical', count: insp.critical_observations, color: '#C0392B', bg: 'bg-red-500' },
                  { label: 'Major', count: insp.major_observations, color: '#D35400', bg: 'bg-orange-500' },
                  { label: 'Minor', count: insp.minor_observations, color: '#C8922A', bg: 'bg-amber-500' },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-14">{row.label}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${row.bg} rounded-full`}
                        style={{ width: insp.total_observations > 0 ? `${(row.count / insp.total_observations) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 w-4">{row.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {insp.notes && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Catatan Inspeksi</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{insp.notes}</p>
        </div>
      )}

      {/* Actions Taken */}
      {insp.actions_taken && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Tindak Lanjut yang Dilakukan</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{insp.actions_taken}</p>
        </div>
      )}

      {/* Findings */}
      <InspectionFindingsSection
        initialFindings={insp.findings ?? []}
        canAdd={!!(user && ['SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'OP_HEAD'].includes(user.role) && insp.status !== 'CANCELLED')}
      />
    </div>
  )
}
