// Shared constants for vessel inspection form (FM-MSM-01-06-R02)
// Used by both VisitDetailPage (form input) and PrintVisitReportPage (print output)

export const PREP_OFFICE_ITEMS = [
  'Memberitahukan Nakhoda di kapal',
  'Memberitahukan Operation Head / Manager',
  'Mempelajari laporan kunjungan manajemen yang lalu',
  'Memenuhi persyaratan kunjungan lapangan pencharter (jika ada)',
  'Crew list terbaru',
]

export const PREP_VESSEL_ITEMS = [
  'Rapat pembuka / Memperkenalkan diri',
  'Diskusi K3LL dan mendengarkan keluhan dari awak kapal',
  'Mengelilingi kapal didampingi perwira kapal',
  'Rapat penutup',
]

export type PIC = 'kapal' | 'darat' | 'none'

export interface InspectionAreaRow {
  area?: string
  rowspan?: number
  pic: PIC
  guidance: string
}

// Full row-by-row definition (37 rows, 23 unique areas)
export const INSPECTION_ROWS: InspectionAreaRow[] = [
  { area: 'Alat Pelindung Diri (APD)', rowspan: 1, pic: 'none', guidance: 'Periksa kelengkapan dan kondisi APD tiap crew (sesuai standar SNI/IMO), dan masa berlaku jika ada' },
  { area: 'Anjungan', rowspan: 2, pic: 'kapal', guidance: 'Periksa kondisi fisik, penataan dokumen dan peralatan di anjungan' },
  { pic: 'kapal', guidance: 'Periksa peralatan navigasi dan peralatan keselamatan dan pemadam di anjungan apakah sesuai dengan yang dilaporkan dalam FM-SOM-C-05-01 Pemeliharaan Bulanan Perlengkapan Keselamatan dan Pemadam Kebakaran' },
  { area: 'Deck Logbook', rowspan: 2, pic: 'none', guidance: 'Periksa pengisian dilakukan dengan lengkap, benar dan ditandatangani oleh Nakhoda' },
  { pic: 'none', guidance: 'Cocokkan keterangan drill pada log book deck dengan FM-SBM-17-02 Jadwal Latihan Keselamatan dan Tanggap Darurat dan FM-SBM-17-03 Formulir Laporan Latihan Keselamatan' },
  { area: 'Drill', rowspan: 1, pic: 'none', guidance: 'Periksa laporan drill FM-SBM-17-03 Formulir Laporan Latihan Keselamatan di bulan terakhir atau bulan berjalan dilakukan sesuai FM-SBM-17-02 Jadwal Latihan Keselamatan dan Tanggap Darurat kapal, tidak salin tempel dan lengkap dengan evidencenya.' },
  { area: 'Paling sedikit 2 kabin awak kapal', rowspan: 3, pic: 'none', guidance: 'Periksa kerapihan kabin' },
  { pic: 'none', guidance: 'Periksa apakah ada barang-barang terlarang (narkoba dan senpi) tersimpan di dalam kabin' },
  { pic: 'none', guidance: 'Periksa lifejacket tersedia untuk setiap awak kapal dalam kabin' },
  { area: 'Dapur', rowspan: 3, pic: 'kapal', guidance: 'Periksa kebersihan dapur dan peralatan dapur/memasak' },
  { pic: 'none', guidance: 'Periksa apakah APAR dan fire blanket tersedia' },
  { pic: 'none', guidance: 'Periksa apakah bebas dari kecoak dan tikus' },
  { area: 'Ruang makan', rowspan: 2, pic: 'kapal', guidance: 'Periksa kebersihan ruang makan dan peralatannya' },
  { pic: 'none', guidance: 'Periksa apakah bebas dari kecoak dan tikus' },
  { area: 'Gudang bahan makanan', rowspan: 2, pic: 'none', guidance: 'Periksa kebersihan bahan makanan dan penyimpanannya. Pastikan tidak menggunakan plastik berwarna untuk membungkus bahan makanan.' },
  { pic: 'none', guidance: 'Periksa apakah bebas dari kecoak dan tikus' },
  { area: 'Kamar mesin', rowspan: 3, pic: 'none', guidance: 'Periksa apakah SOP pengoperasian mesin utama (ME), mesin bantu, oil water separator, dan sewage treatment terpasang pada tiap mesin' },
  { pic: 'none', guidance: 'Periksa indikator di engine panel (LO Press, FO Press, FW Press)' },
  { pic: 'none', guidance: 'Apakah matras karet tersedia di bawah control panel' },
  { area: 'Got kamar mesin (bilga)', rowspan: 3, pic: 'none', guidance: 'Periksa kondisi got harus dalam keadaan kering' },
  { pic: 'none', guidance: 'Periksa kapan terakhir pembuangan air got ke laut dengan memeriksa Oil Record Book' },
  { pic: 'none', guidance: 'Periksa apakah rantai valve pipa pembuangan OWS ke laut dalam keadaan terkunci dan diberi label/tanda "DILARANG MEMBUKA TANPA SEIJIN KKM"' },
  { area: 'Gudang tali tambat', rowspan: 2, pic: 'none', guidance: 'Periksa kerapihan penyimpanan tali tambat' },
  { pic: 'none', guidance: 'Periksa kondisi gudang apakah terawat dengan baik' },
  { area: 'Gudang cat', rowspan: 3, pic: 'none', guidance: 'Periksa kondisi gudang cat apakah terawat dengan baik' },
  { pic: 'none', guidance: 'Periksa kerapihan penyimpanan kaleng-kaleng cat' },
  { pic: 'darat', guidance: 'Periksa apakah MSDS cat tersedia dan dipahami oleh crew' },
  { area: 'Geladak terbuka di Haluan', rowspan: 1, pic: 'none', guidance: 'Periksa kondisi geladak (ada korosi/deformasi atau tidak)' },
  { area: 'Geladak terbuka di buritan', rowspan: 1, pic: 'none', guidance: 'Periksa kondisi geladak (ada korosi/deformasi atau tidak)' },
  { area: 'Double hull dan double bottom', rowspan: 1, pic: 'none', guidance: 'Periksa kondisi geladak (ada korosi/deformasi atau tidak), ada indikasi pengisian air laut atau tidak.' },
  { area: 'Lambung kapal', rowspan: 1, pic: 'none', guidance: 'Periksa kondisi lambung (ada korosi/deformasi atau tidak), ada indikasi pengisian air laut atau tidak.' },
  { area: 'Cargo Tank', rowspan: 1, pic: 'none', guidance: 'Periksa kondisi cargo tank dan FM-SOM-E-05-02 Laporan Inspeksi Tanki yang terbaru dari kapal' },
  { area: 'Pemeriksaan implementasi PMS', rowspan: 2, pic: 'none', guidance: 'Periksa status pelaksanaan PMS di sistem' },
  { pic: 'none', guidance: 'Periksa kondisi permesinan apakah sesuai dengan yang dilaporkan crew pada laporan FM-SOM-D-01-03 Plan Maintenance Sistem dan FM-SOM-D-02-01 Peralatan Sistem Kritis' },
  { area: 'Log Book Engine', rowspan: 1, pic: 'none', guidance: 'Periksa pengisian dilakukan dengan lengkap, benar dan ditandatangani oleh KKM dan Nakhoda' },
  { area: 'Stock opname', rowspan: 1, pic: 'none', guidance: 'Periksa apakah data stock di kapal sesuai dengan data PO & BA Delivery' },
  { area: 'Housekeeping', rowspan: 1, pic: 'none', guidance: 'Periksa kebersihan, kerapihan dan penerangan tiap ruang di atas kapal' },
  { area: 'Toilet', rowspan: 1, pic: 'none', guidance: 'Periksa kondisi dan kebersihan toilet termasuk lantai, closet, dinding' },
  { area: 'Pemeriksaan drug and alcohol', rowspan: 1, pic: 'none', guidance: 'Lakukan pemeriksaan drug and alcohol secara random dari perwira dan rating dengan melengkapi FM-CORSE-04-02 Formulir Pengetesan Psikotropika, Narkotika, dan Minuman Beralkohol' },
]

// Unique area names (23 areas) — indexed 0-22, matches areas[] in VesselInspectionData
export const INSPECTION_AREAS: string[] = INSPECTION_ROWS
  .filter(r => r.area !== undefined)
  .map(r => r.area!)

// Each row tagged with its area index (0-22) for lookup during print
export const INSPECTION_ROWS_INDEXED = (() => {
  let areaIdx = -1
  let areaNo = 0
  return INSPECTION_ROWS.map(row => {
    if (row.area !== undefined) { areaIdx++; areaNo++ }
    return { ...row, areaIdx, areaNo: row.area !== undefined ? areaNo : undefined }
  })
})()

// ─── Data types ────────────────────────────────────────────────────────────────

export interface AreaCheck {
  yn: 'Y' | 'N' | ''
  notes: string
}

export interface VesselInspectionData {
  prepOffice: AreaCheck[]   // 5 items
  prepVessel: AreaCheck[]   // 4 items
  areas: AreaCheck[]        // 23 areas
  discussion: string
  complaints: string
  visitPhotos: string[]     // base64 – Section F: foto selama kunjungan di kapal
  attendancePhotos: string[] // base64 – Lampiran 1: foto daftar hadir
}

export function defaultInspectionData(agenda?: string, summary?: string): VesselInspectionData {
  return {
    prepOffice: PREP_OFFICE_ITEMS.map(() => ({ yn: '', notes: '' })),
    prepVessel: PREP_VESSEL_ITEMS.map(() => ({ yn: '', notes: '' })),
    areas: INSPECTION_AREAS.map(() => ({ yn: '', notes: '' })),
    discussion: agenda ?? '',
    complaints: summary ?? '',
    visitPhotos: [],
    attendancePhotos: [],
  }
}

export const inspectionStorageKey = (visitId: string) => `vessel_inspection_${visitId}`
