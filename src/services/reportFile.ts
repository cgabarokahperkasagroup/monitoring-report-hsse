/**
 * Menulis laporan menjadi berkas Excel atau PDF: sebagai Blob (render*) atau
 * langsung diunduh di browser (download*).
 *
 * Berkas ini tidak tahu apa-apa soal Supabase maupun isi laporan: ia menerima
 * ReportDoc yang sudah jadi. Library-nya (exceljs, jspdf) dimuat saat tombol
 * ditekan saja, supaya tidak menambah beban halaman lain.
 */

export type CellValue = string | number | Date | null

export interface ReportColumn {
  header: string
  key: string
  /** Lebar kolom Excel dalam karakter. */
  width?: number
  type?: 'text' | 'date' | 'number'
}

export interface ReportSheet {
  name: string
  columns: ReportColumn[]
  rows: Record<string, CellValue>[]
}

export interface ReportDoc {
  title: string
  /** Baris keterangan di bawah judul, mis. ringkasan filter. */
  subtitle: string
  /** Nama berkas tanpa ekstensi. */
  fileBase: string
  sheets: ReportSheet[]
  /** Catatan untuk pembaca, ditaruh di akhir laporan. */
  notes?: string[]
}

export type ReportFormat = 'Excel' | 'PDF'

export const REPORT_MIME: Record<ReportFormat, string> = {
  Excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  PDF: 'application/pdf',
}

export function reportFileName(doc: ReportDoc, format: ReportFormat): string {
  return `${doc.fileBase}.${format === 'PDF' ? 'pdf' : 'xlsx'}`
}

const NAVY = 'FF1B3A6B'
const FONT = 'Arial'

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Beri waktu browser memulai unduhan sebelum URL dilepas.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function formatDate(d: Date): string {
  // Tanggal laporan disimpan sebagai tengah malam UTC; baca kembali dalam UTC
  // supaya tidak bergeser sehari di zona waktu mana pun.
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function cellText(v: CellValue): string {
  if (v == null || v === '') return '—'
  if (v instanceof Date) return formatDate(v)
  return String(v)
}

// Karakter di luar Latin-1 yang tetap bisa dicetak font standar PDF (WinAnsi).
const WIN_ANSI_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ')
const PDF_REPLACEMENTS: Record<string, string> = { '≥': '>=', '≤': '<=', '≠': '!=', '→': '->', '←': '<-', '×': 'x' }

/**
 * Siapkan teks untuk font standar PDF, yang hanya mengenal set WinAnsi.
 *
 * Satu karakter di luar set itu membuat jsPDF mengganti encoding seluruh
 * string sehingga hurufnya tercetak berjauhan dan rusak. Teks temuan sering
 * disalin dari WhatsApp dan membawa karakter tak terlihat (mis. U+2060 word
 * joiner), jadi karakter format dibuang dan sisanya diganti padanan ASCII.
 */
function pdfSafe(text: string): string {
  return text
    .replace(/\p{Cf}/gu, '')
    .replace(/[^\t\n\r\u0020-\u00FF]/gu, ch => PDF_REPLACEMENTS[ch] ?? (WIN_ANSI_EXTRA.has(ch) ? ch : '?'))
}

export async function renderXlsx(doc: ReportDoc): Promise<Blob> {
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Monitoring & Manajemen Visit'
  wb.created = new Date()

  doc.sheets.forEach((sheet, idx) => {
    const ws = wb.addWorksheet(sheet.name.slice(0, 31))
    ws.columns = sheet.columns.map(c => ({ key: c.key, width: c.width ?? 16 }))

    // Judul & keterangan hanya di sheet pertama; sheet lain langsung tabel.
    let headerRow = 1
    if (idx === 0) {
      ws.getCell('A1').value = doc.title
      ws.getCell('A1').font = { name: FONT, size: 14, bold: true, color: { argb: NAVY } }
      ws.getCell('A2').value = doc.subtitle
      ws.getCell('A2').font = { name: FONT, size: 10, color: { argb: 'FF4A5568' } }
      ws.getCell('A3').value = `Dibuat: ${new Date().toLocaleString('id-ID')}`
      ws.getCell('A3').font = { name: FONT, size: 9, italic: true, color: { argb: 'FF4A5568' } }
      headerRow = 5
    }

    const hdr = ws.getRow(headerRow)
    sheet.columns.forEach((c, i) => {
      const cell = hdr.getCell(i + 1)
      cell.value = c.header
      cell.font = { name: FONT, size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    })
    hdr.height = 30

    const border = {
      top: { style: 'thin' as const, color: { argb: 'FFD0D5DD' } },
      left: { style: 'thin' as const, color: { argb: 'FFD0D5DD' } },
      bottom: { style: 'thin' as const, color: { argb: 'FFD0D5DD' } },
      right: { style: 'thin' as const, color: { argb: 'FFD0D5DD' } },
    }

    sheet.rows.forEach((row, r) => {
      const xr = ws.getRow(headerRow + 1 + r)
      sheet.columns.forEach((c, i) => {
        const cell = xr.getCell(i + 1)
        const v = row[c.key]
        cell.value = v == null || v === '' ? '—' : v
        cell.font = { name: FONT, size: 10 }
        cell.border = border
        cell.alignment = { vertical: 'top', wrapText: c.type !== 'number' && c.type !== 'date' }
        if (c.type === 'date' && v instanceof Date) cell.numFmt = 'dd mmm yyyy'
        if (c.type === 'number' || c.type === 'date') cell.alignment = { ...cell.alignment, horizontal: 'center' }
      })
    })

    ws.views = [{ state: 'frozen', ySplit: headerRow }]
    if (sheet.rows.length > 0) {
      ws.autoFilter = {
        from: { row: headerRow, column: 1 },
        to: { row: headerRow + sheet.rows.length, column: sheet.columns.length },
      }
    }

    if (idx === doc.sheets.length - 1 && doc.notes?.length) {
      let r = headerRow + sheet.rows.length + 3
      ws.getCell(r, 1).value = 'Catatan'
      ws.getCell(r, 1).font = { name: FONT, size: 10, bold: true, color: { argb: NAVY } }
      doc.notes.forEach(n => {
        r += 1
        ws.getCell(r, 1).value = `• ${n}`
        ws.getCell(r, 1).font = { name: FONT, size: 9, color: { argb: 'FF4A5568' } }
      })
    }
  })

  const buf = await wb.xlsx.writeBuffer()
  return new Blob([buf], { type: REPORT_MIME.Excel })
}

export async function downloadXlsx(doc: ReportDoc): Promise<void> {
  saveBlob(await renderXlsx(doc), reportFileName(doc, 'Excel'))
}

export async function renderPdf(doc: ReportDoc): Promise<Blob> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const margin = 12

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  pdf.setTextColor(27, 58, 107)
  pdf.text(pdfSafe(doc.title), margin, 15)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(74, 85, 104)
  pdf.text(pdf.splitTextToSize(pdfSafe(doc.subtitle), pageW - margin * 2), margin, 21)
  pdf.text(`Dibuat: ${new Date().toLocaleString('id-ID')}`, margin, 26)

  let y = 32
  doc.sheets.forEach((sheet, idx) => {
    if (idx > 0) {
      pdf.addPage()
      y = 15
    }
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.setTextColor(27, 58, 107)
    pdf.text(pdfSafe(sheet.name), margin, y)

    autoTable(pdf, {
      startY: y + 3,
      margin: { left: margin, right: margin },
      head: [sheet.columns.map(c => pdfSafe(c.header))],
      body: sheet.rows.length > 0
        ? sheet.rows.map(row => sheet.columns.map(c => pdfSafe(cellText(row[c.key]))))
        : [[{ content: 'Tidak ada data', colSpan: sheet.columns.length, styles: { halign: 'center' } }]],
      styles: { font: 'helvetica', fontSize: 7, cellPadding: 1.5, overflow: 'linebreak', valign: 'top' },
      headStyles: { fillColor: [27, 58, 107], textColor: 255, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: [247, 248, 250] },
      columnStyles: Object.fromEntries(
        sheet.columns
          .map((c, i) => [i, c.type === 'number' || c.type === 'date' ? { halign: 'center' as const } : {}])
      ),
    })
  })

  if (doc.notes?.length) {
    const last = (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
    let ny = (last?.finalY ?? y) + 8
    const pageH = pdf.internal.pageSize.getHeight()
    if (ny > pageH - 20) {
      pdf.addPage()
      ny = 15
    }
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(27, 58, 107)
    pdf.text('Catatan', margin, ny)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(74, 85, 104)
    doc.notes.forEach(n => {
      const lines = pdf.splitTextToSize(pdfSafe(`• ${n}`), pageW - margin * 2)
      ny += 5
      pdf.text(lines, margin, ny)
      ny += (lines.length - 1) * 4
    })
  }

  const pages = pdf.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i)
    pdf.setFontSize(8)
    pdf.setTextColor(150)
    pdf.text(`Halaman ${i} dari ${pages}`, pageW - margin, pdf.internal.pageSize.getHeight() - 6, { align: 'right' })
  }

  return pdf.output('blob')
}

export async function downloadPdf(doc: ReportDoc): Promise<void> {
  saveBlob(await renderPdf(doc), reportFileName(doc, 'PDF'))
}
