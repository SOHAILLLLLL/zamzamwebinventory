import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'

export interface LabelData {
  id: string
  sku: string
  shelfLocation: string | null
}

export interface LabelSheetOptions {
  // Fine-tune alignment (mm) against the physical sticker sheet — printers rarely land
  // pixel-perfect on a 0-margin layout, so a small nudge avoids reprinting the whole batch.
  offsetXMm?: number
  offsetYMm?: number
}

// Matches the "A4 - 40" sticker sheet: 4 columns x 10 rows of 52.5 x 29.7mm labels,
// filling the full 210 x 297mm A4 page with no gutter (4 x 52.5 = 210, 10 x 29.7 = 297).
const COLUMNS = 4
const ROWS = 10
const LABEL_WIDTH_MM = 52.5
const LABEL_HEIGHT_MM = 29.7
const LABELS_PER_PAGE = COLUMNS * ROWS

const CELL_PADDING_MM = 2.5
const QR_SIZE_MM = 22
const TEXT_GAP_MM = 2

// 200px is plenty for a QR printed at 22mm — modules are flat black/white, not
// photographic detail, so scan quality doesn't need a large raster.
async function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { margin: 0, width: 200, errorCorrectionLevel: 'M' })
}

export async function buildLabelSheetPdf(items: LabelData[], options: LabelSheetOptions = {}): Promise<Blob> {
  const offsetX = options.offsetXMm ?? 0
  const offsetY = options.offsetYMm ?? 0
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  // One QR render per unique SKU — bulk print of the same item list never repeats work.
  const qrCache = new Map<string, string>()
  async function getQr(sku: string): Promise<string> {
    let dataUrl = qrCache.get(sku)
    if (!dataUrl) {
      dataUrl = await qrDataUrl(sku)
      qrCache.set(sku, dataUrl)
    }
    return dataUrl
  }

  for (let index = 0; index < items.length; index++) {
    const item = items[index]
    const positionOnPage = index % LABELS_PER_PAGE
    if (index > 0 && positionOnPage === 0) doc.addPage('a4', 'portrait')

    const row = Math.floor(positionOnPage / COLUMNS)
    const col = positionOnPage % COLUMNS
    const cellX = offsetX + col * LABEL_WIDTH_MM
    const cellY = offsetY + row * LABEL_HEIGHT_MM

    const qr = await getQr(item.sku)
    const qrX = cellX + CELL_PADDING_MM
    const qrY = cellY + (LABEL_HEIGHT_MM - QR_SIZE_MM) / 2
    // jsPDF stores addImage data uncompressed by default — for a page full of raster
    // images that turns a ~200KB document into 10+MB. 'FAST' compression is essential here.
    doc.addImage(qr, 'PNG', qrX, qrY, QR_SIZE_MM, QR_SIZE_MM, undefined, 'FAST')

    const textX = qrX + QR_SIZE_MM + TEXT_GAP_MM
    const textMaxWidth = cellX + LABEL_WIDTH_MM - CELL_PADDING_MM - textX
    let textY = cellY + CELL_PADDING_MM + 4

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(23, 24, 28)
    doc.text(item.sku, textX, textY, { maxWidth: textMaxWidth })
    textY += 5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(102, 102, 111)
    const locationLines = doc.splitTextToSize(item.shelfLocation || '—', textMaxWidth) as string[]
    doc.text(locationLines.slice(0, 3), textX, textY)
  }

  return doc.output('blob')
}
