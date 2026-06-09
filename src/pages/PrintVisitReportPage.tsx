import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Printer, ArrowLeft } from 'lucide-react'
import { useVisit } from '@/hooks/useVisitsData'
import { formatDate } from '@/utils'
import {
  PREP_OFFICE_ITEMS, PREP_VESSEL_ITEMS,
  INSPECTION_ROWS_INDEXED,
  defaultInspectionData, inspectionStorageKey,
  type VesselInspectionData,
} from '@/data/vesselInspectionConstants'

// ─── Print styles (inline for cross-browser print compatibility) ───────────────
const S = {
  page: {
    fontFamily: 'Arial, sans-serif',
    fontSize: '9pt',
    color: '#000',
    lineHeight: '1.3',
    /* layar: preview A4 210mm dengan padding sama seperti hasil print */
    width: '210mm',
    maxWidth: '210mm',
    margin: '0 auto',
    padding: '12mm 14mm',
    background: '#fff',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
  formNo: { textAlign: 'right' as const, fontSize: '8pt', marginBottom: '2mm' },
  title: {
    textAlign: 'center' as const, fontWeight: 'bold', fontSize: '11pt',
    textTransform: 'uppercase' as const, marginBottom: '4mm', marginTop: '2mm',
  },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '8.5pt', tableLayout: 'fixed' as const },
  th: {
    border: '1px solid #000', padding: '2mm 2mm', fontWeight: 'bold',
    textAlign: 'center' as const, backgroundColor: '#f0f0f0', verticalAlign: 'middle' as const,
  },
  td: { border: '1px solid #000', padding: '1.5mm 2mm', verticalAlign: 'top' as const, wordBreak: 'break-word' as const },
  tdCenter: {
    border: '1px solid #000', padding: '1.5mm 2mm',
    verticalAlign: 'middle' as const, textAlign: 'center' as const, wordBreak: 'break-word' as const,
  },
  sectionTitle: { fontWeight: 'bold', marginTop: '5mm', marginBottom: '2mm', fontSize: '9pt' },
  italic: { fontStyle: 'italic' as const, fontSize: '7.5pt', wordBreak: 'break-word' as const },
  ynFilled: { fontWeight: 'bold', fontSize: '9pt' },
  notesFilled: { fontWeight: 'bold', fontSize: '8.5pt' },
}

// ─── Helper: Y/N cell content ──────────────────────────────────────────────────
function YNCell({ value }: { value: string }) {
  if (value === 'Y') return <span style={{ fontWeight: 'bold', color: '#155724' }}>Y</span>
  if (value === 'N') return <span style={{ fontWeight: 'bold', color: '#721c24' }}>N</span>
  return null
}

export default function PrintVisitReportPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { visit, findings, loading } = useVisit(id)

  // Read inspection data from sessionStorage (filled in VisitDetailPage)
  const [inspection, setInspection] = useState<VesselInspectionData | null>(null)
  useEffect(() => {
    if (!id || !visit) return
    const stored = sessionStorage.getItem(inspectionStorageKey(id))
    if (stored) {
      try {
        setInspection(JSON.parse(stored))
        return
      } catch { /* ignore */ }
    }
    setInspection(defaultInspectionData(visit.agenda, visit.summary))
  }, [id, visit?.id])

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!visit) return (
    <div className="flex flex-col items-center justify-center h-screen gap-3">
      <p className="text-gray-500">Kunjungan tidak ditemukan</p>
      <button onClick={() => navigate('/visits')} className="text-sm text-blue-600 underline">Kembali</button>
    </div>
  )

  const namaManajemen = visit.created_by_user?.full_name || '—'
  const namaKapal = visit.vessel?.name || visit.site?.name || '—'
  const lokasiKapal = visit.site?.name || visit.vessel?.name || '—'
  const tanggalKunjungan = formatDate(visit.visit_date)

  const discussion = inspection?.discussion || visit.agenda || ''
  const complaints = inspection?.complaints || visit.summary || ''

  // Count how many Y/N are filled for the progress indicator (shown only on screen)
  const filledCount = inspection
    ? [...inspection.prepOffice, ...inspection.prepVessel, ...inspection.areas].filter(a => a.yn !== '').length
    : 0
  const totalCount = PREP_OFFICE_ITEMS.length + PREP_VESSEL_ITEMS.length + INSPECTION_ROWS_INDEXED.filter(r => r.area !== undefined).length

  return (
    <>
      {/* ══ Screen toolbar ════════════════════════════════════════════════════════ */}
      <div className="no-print fixed top-0 left-0 right-0 bg-[#1B3A6B] text-white px-6 py-3 flex items-center justify-between z-50 shadow-lg">
        <button
          onClick={() => navigate(`/visits/${id}`)}
          className="flex items-center gap-2 text-sm hover:text-blue-200 transition-colors"
        >
          <ArrowLeft size={16} /> Kembali & Edit Checklist
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold">{visit.reference_no} — Laporan Kunjungan Manajemen</p>
          <p className="text-xs text-blue-200">
            {filledCount}/{totalCount} item terisi · {filledCount === totalCount ? '✅ Siap cetak' : '⚠️ Ada item belum terisi'}
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-[#C8922A] hover:bg-amber-600 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <Printer size={15} /> Cetak / Simpan PDF
        </button>
      </div>
      <div className="no-print pt-16" />

      {/* ══ Print content ═════════════════════════════════════════════════════════ */}
      <div className="print-area" style={S.page}>

        {/* ─── HALAMAN UTAMA ─────────────────────────────────────────────────── */}
        <div style={S.formNo}>
          <div>FM-MSM-01-06-R02</div>
          <div>FEBRUARI 2024</div>
        </div>

        <div style={S.title}>LAPORAN KUNJUNGAN MANAJEMEN DIATAS KAPAL</div>

        {/* Info header */}
        <table style={S.table}>
          <tbody>
            <tr>
              <td style={{ ...S.td, width: '18%', fontWeight: 'bold' }}>Nama manajemen</td>
              <td style={{ ...S.td, width: '32%' }}>{namaManajemen}</td>
              <td style={{ ...S.td, width: '18%', fontWeight: 'bold' }}>Nama kapal</td>
              <td style={{ ...S.td, width: '32%' }}>{namaKapal}</td>
            </tr>
            <tr>
              <td style={{ ...S.td, fontWeight: 'bold' }}>Tanggal kunjungan</td>
              <td style={S.td}>{tanggalKunjungan}</td>
              <td style={{ ...S.td, fontWeight: 'bold' }}>Lokasi kapal</td>
              <td style={S.td}>{lokasiKapal}</td>
            </tr>
          </tbody>
        </table>

        {/* ─── Section A ─────────────────────────────────────────────────────── */}
        <div style={S.sectionTitle}>A. &nbsp; Persiapan di kantor</div>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={{ ...S.th, width: '6%' }}>No.</th>
              <th style={{ ...S.th, width: '58%' }}>Daftar persiapan</th>
              <th style={{ ...S.th, width: '8%' }}>Y / N</th>
              <th style={S.th}>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {PREP_OFFICE_ITEMS.map((item, i) => {
              const data = inspection?.prepOffice[i]
              return (
                <tr key={i}>
                  <td style={S.tdCenter}>{i + 1}</td>
                  <td style={S.td}>{item}</td>
                  <td style={S.tdCenter}><YNCell value={data?.yn ?? ''} /></td>
                  <td style={S.td}>{data?.notes && <span style={S.notesFilled}>{data.notes}</span>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* ─── Section B ─────────────────────────────────────────────────────── */}
        <div style={S.sectionTitle}>B. &nbsp; Kunjungan di kapal</div>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={{ ...S.th, width: '6%' }}>No.</th>
              <th style={{ ...S.th, width: '58%' }}>Daftar persiapan</th>
              <th style={{ ...S.th, width: '8%' }}>Y / N</th>
              <th style={S.th}>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {PREP_VESSEL_ITEMS.map((item, i) => {
              const data = inspection?.prepVessel[i]
              return (
                <tr key={i}>
                  <td style={S.tdCenter}>{i + 1}</td>
                  <td style={S.td}>{item}</td>
                  <td style={S.tdCenter}><YNCell value={data?.yn ?? ''} /></td>
                  <td style={S.td}>{data?.notes && <span style={S.notesFilled}>{data.notes}</span>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* ─── Section C ─────────────────────────────────────────────────────── */}
        <div style={S.sectionTitle}>C. &nbsp; Memeriksa kapal</div>
        <p style={{ fontSize: '8.5pt', marginBottom: '2mm', fontStyle: 'italic' }}>
          Tolong diamati kebersihan, penerangan, peralatan keselamatan dan pemadam pada setiap tempat atau ruangan di kapal yang dikunjungi,
          hasil pengamatan dicatat pada <strong>Lampiran 2-Status Temuan</strong> di bawah ini.
        </p>

        <table style={S.table}>
          <thead>
            <tr>
              <th style={{ ...S.th, width: '4%' }}>No.</th>
              <th style={{ ...S.th, width: '16%' }}>Tempat / Ruangan di kapal</th>
              <th style={{ ...S.th, width: '6%', fontSize: '7.5pt' }}>Telah diperiksa (Y/N)*</th>
              <th style={{ ...S.th, width: '6%', fontSize: '7.5pt' }}>PIC Kapal</th>
              <th style={{ ...S.th, width: '6%', fontSize: '7.5pt' }}>PIC Darat</th>
              <th style={{ ...S.th, width: '38%' }}>Panduan</th>
              <th style={{ ...S.th, width: '24%' }}>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {INSPECTION_ROWS_INDEXED.map((row, idx) => {
              const areaData = inspection?.areas[row.areaIdx] ?? { yn: '', notes: '' }
              return (
                <tr key={idx}>
                  {/* Area number cell – only on first row of each area */}
                  {row.area !== undefined && (
                    <td style={{ ...S.tdCenter, fontWeight: 'bold' }} rowSpan={row.rowspan}>{row.areaNo}</td>
                  )}
                  {/* Area name cell – only on first row, rowspanned; notes shown below area name */}
                  {row.area !== undefined && (
                    <td style={S.td} rowSpan={row.rowspan}>
                      <div>{row.area}</div>
                      {areaData.notes && (
                        <div style={{ marginTop: '2mm', padding: '1.5mm', background: '#fffbe6', border: '1px solid #f0c040', borderRadius: '2px', fontSize: '8pt', fontWeight: 'bold' }}>
                          {areaData.notes}
                        </div>
                      )}
                    </td>
                  )}
                  {/* Y/N – same value for all sub-rows of this area */}
                  <td style={S.tdCenter}>
                    <YNCell value={areaData.yn} />
                  </td>
                  <td style={S.tdCenter}>{row.pic === 'kapal' ? '✓' : ''}</td>
                  <td style={S.tdCenter}>{row.pic === 'darat' ? '✓' : ''}</td>
                  <td style={{ ...S.td, ...S.italic }}>{row.guidance}</td>
                  {/* Keterangan column: leave blank for sub-rows (already shown in area cell) */}
                  <td style={S.td}></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p style={{ fontSize: '7.5pt', marginTop: '1mm', fontStyle: 'italic' }}>
          * Y jika dilakukan pemeriksaan, N jika tidak dilakukan.
        </p>

        {/* ─── Section D ─────────────────────────────────────────────────────── */}
        <div style={S.sectionTitle}>D. &nbsp; Diskusi K3LL atau 'lesson learned'; Topik diskusi:</div>
        <div style={{ border: '1px solid #000', minHeight: '25mm', padding: '3mm', fontSize: '8.5pt', marginBottom: '4mm' }}>
          <div style={{ fontStyle: 'italic', color: '#777', marginBottom: '2mm', fontSize: '7.5pt' }}>
            Komentar (antusias awak kapal selama berdiskusi, pemahaman awak kapal terhadap topik diskusi, dll).
          </div>
          {discussion && <div style={{ fontWeight: 'bold' }}>{discussion}</div>}
        </div>

        {/* ─── Section E ─────────────────────────────────────────────────────── */}
        <div style={S.sectionTitle}>E. &nbsp; Keluhan dari awak kapal; Keluhan ditujukan kepada departemen</div>
        <div style={{ border: '1px solid #000', minHeight: '20mm', padding: '3mm', fontSize: '8.5pt', marginBottom: '4mm' }}>
          <div style={{ fontStyle: 'italic', color: '#777', fontSize: '7.5pt', marginBottom: '2mm' }}>Rincian keluhan</div>
          {complaints && <div style={{ fontWeight: 'bold' }}>{complaints}</div>}
        </div>

        {/* ─── Section F ─────────────────────────────────────────────────────── */}
        <div style={S.sectionTitle}>F. &nbsp; FOTO SELAMA KUNJUNGAN MANAJEMEN DI KAPAL</div>
        {inspection?.visitPhotos && inspection.visitPhotos.length > 0 ? (
          <div style={{ border: '1px solid #000', padding: '3mm', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3mm' }}>
            {inspection.visitPhotos.map((src, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <img
                  src={src}
                  alt={`Foto kunjungan ${i + 1}`}
                  style={{ width: '100%', maxHeight: '90mm', objectFit: 'cover', border: '1px solid #ccc', display: 'block' }}
                />
                <div style={{ fontSize: '7pt', color: '#555', textAlign: 'center', marginTop: '1mm' }}>
                  Foto {i + 1}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ border: '1px solid #000', minHeight: '60mm', padding: '3mm', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3mm' }}>
            {[1, 2, 3, 4].map(n => (
              <div key={n} style={{ border: '1px dashed #aaa', minHeight: '25mm', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: '8pt' }}>
                Foto {n}
              </div>
            ))}
          </div>
        )}

        {/* ─── Catatan ──────────────────────────────────────────────────────────── */}
        <div style={{ marginTop: '5mm', fontSize: '8pt', fontStyle: 'italic' }}>
          <div style={{ fontWeight: 'bold', fontStyle: 'normal', marginBottom: '1mm' }}>Catatan:</div>
          <ul style={{ paddingLeft: '5mm', margin: 0 }}>
            <li>Kunjungan manajemen ini dapat dilakukan oleh top manajemen, manajer senior dan kepala divisi.</li>
            <li>Laporan ini diserahkan kepada QHSE Department setelah selesai melakukan kunjungan manajemen.</li>
            <li>Sebelum mengunjungi kapal, agar melengkapi dokumen-dokumen yang dibutuhkan untuk memverifikasi item pada bagian C di atas</li>
          </ul>
        </div>

        {/* ════ LAMPIRAN 1: DAFTAR HADIR ═══════════════════════════════════════ */}
        <div style={{ pageBreakBefore: 'always', marginTop: '10mm' }}>
          <div style={S.formNo}><div>FM-MSM-01-06-R02</div><div>FEBRUARI 2024</div></div>
          <div style={{ textAlign: 'center', marginBottom: '4mm' }}>
            <div style={{ fontSize: '9pt' }}>Lampiran 1:</div>
            <div style={{ fontWeight: 'bold', fontSize: '11pt', textTransform: 'uppercase' }}>DAFTAR HADIR</div>
          </div>
          <p style={{ fontSize: '8.5pt', fontStyle: 'italic', marginBottom: '3mm', color: '#555' }}>
            Daftar hadir ditulis manual dan dilampirkan sebagai foto di bawah ini.
          </p>
          {inspection?.attendancePhotos && inspection.attendancePhotos.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: inspection.attendancePhotos.length === 1 ? '1fr' : '1fr 1fr', gap: '4mm' }}>
              {inspection.attendancePhotos.map((src, i) => (
                <div key={i}>
                  <img
                    src={src}
                    alt={`Daftar hadir ${i + 1}`}
                    style={{ width: '100%', objectFit: 'contain', border: '1px solid #ccc', display: 'block' }}
                  />
                  <div style={{ fontSize: '7pt', color: '#555', textAlign: 'center', marginTop: '1mm' }}>
                    Daftar Hadir – Halaman {i + 1}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ border: '1px solid #000', minHeight: '180mm', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: '10pt', fontStyle: 'italic' }}>
              [ Foto Daftar Hadir ]
            </div>
          )}
        </div>

        {/* ════ LAMPIRAN 2: STATUS TEMUAN ══════════════════════════════════════ */}
        <div style={{ pageBreakBefore: 'always', marginTop: '10mm' }}>
          <div style={S.formNo}><div>FM-MSM-01-06-R02</div><div>FEBRUARI 2024</div></div>
          <div style={{ textAlign: 'center', marginBottom: '3mm' }}>
            <div style={{ fontSize: '9pt' }}>Lampiran 2:</div>
            <div style={{ fontWeight: 'bold', fontSize: '11pt', textTransform: 'uppercase' }}>STATUS TEMUAN</div>
          </div>
          <p style={{ fontSize: '8.5pt', fontStyle: 'italic', marginBottom: '3mm' }}>
            (Nakhoda harus memastikan seluruh temuan dari kunjungan manajemen ini diperbaiki dan dilaporkan kepada kepala divisi QSHE
            setiap bulan mengenai status dari setiap temuan dan bukti perbaikan terkait)
          </p>

          <table style={S.table}>
            <thead>
              <tr>
                <th style={{ ...S.th, width: '5%' }}>No.</th>
                <th style={{ ...S.th, width: '18%' }}>Tempat/Ruang di atas Kapal</th>
                <th style={{ ...S.th, width: '30%' }}>Uraian temuan (foto jika ada)</th>
                <th style={{ ...S.th, width: '15%' }}>Target Penyelesaian (Tanggal)</th>
                <th style={{ ...S.th, width: '16%' }}>PIC (Dept/Div Terkait)</th>
                <th style={{ ...S.th, width: '16%' }}>Bukti Penyelesaian (Foto)</th>
              </tr>
            </thead>
            <tbody>
              {findings.length > 0 ? (
                findings.map((f, i) => (
                  <tr key={f.id}>
                    <td style={S.tdCenter}>{i + 1}.</td>
                    <td style={S.td}>{f.category}</td>
                    <td style={{ ...S.td, minHeight: '35mm' }}>
                      <div style={{ fontWeight: 'bold' }}>{f.title}</div>
                      {f.description && <div style={{ marginTop: '1mm', fontSize: '8pt', color: '#333' }}>{f.description}</div>}
                      <div style={{ border: '1px dashed #aaa', minHeight: '20mm', marginTop: '2mm', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: '7.5pt' }}>
                        Foto Temuan
                      </div>
                    </td>
                    <td style={S.tdCenter}>{formatDate(f.target_close_date)}</td>
                    <td style={S.td}>{f.assigned_to_user?.full_name || 'Crew'}</td>
                    <td style={{ ...S.td, minHeight: '35mm' }}>
                      <div style={{ border: '1px dashed #aaa', minHeight: '30mm', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: '7.5pt' }}>
                        Foto Bukti
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td style={{ ...S.tdCenter, height: '40mm' }}>{i + 1}.</td>
                    <td style={S.td}></td>
                    <td style={S.td}></td>
                    <td style={S.td}></td>
                    <td style={S.td}></td>
                    <td style={S.td}></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div style={{ marginTop: '6mm', fontSize: '8.5pt' }}>
            <div>Tgl, {tanggalKunjungan}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4mm', marginTop: '4mm' }}>
              {[
                { label: 'Disusun oleh,', name: namaManajemen, jabatan: 'Management' },
                { label: 'Diketahui oleh,', name: '', jabatan: 'Nakhoda' },
                { label: 'Diterima oleh,', name: '', jabatan: 'QSHE Department' },
              ].map((sig, i) => (
                <div key={i} style={{ border: '1px solid #000', padding: '2mm' }}>
                  <div>{sig.label}</div>
                  <div style={{ minHeight: '18mm', borderBottom: '1px solid #000', marginBottom: '1mm', marginTop: '2mm' }}></div>
                  <div style={{ fontWeight: 'bold' }}>({sig.name})</div>
                  <div>{sig.jabatan}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>{/* end print-area */}
    </>
  )
}
