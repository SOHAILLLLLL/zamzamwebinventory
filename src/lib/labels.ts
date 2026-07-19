import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'

export interface LabelData {
  id: string
  sku: string
  // What the QR code actually encodes — an absolute item URL, not the bare SKU. Kept
  // separate from `sku` because the printed text under the QR must stay the short,
  // human-readable code even though the scannable payload is now a full link.
  qrValue: string
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

// Every item is always printed with its full SKU/location text, never clipped or
// silently dropped — but jsPDF doesn't clip text to a box, so anything that wraps
// more than expected bleeds straight onto the label below. SKU tries largest-first;
// location's line count is computed from actual remaining space, not guessed.
const SKU_FONT_SIZE_TIERS = [9, 8, 7, 6.5]
const LOCATION_FONT_SIZE = 7.5
const SKU_LOCATION_GAP_MM = 1

// 200px is plenty for a QR printed at 22mm — modules are flat black/white, not
// photographic detail, so scan quality doesn't need a large raster.
async function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { margin: 0, width: 200, errorCorrectionLevel: 'M' })
}

export async function buildLabelSheetPdf(items: LabelData[], options: LabelSheetOptions = {}): Promise<Blob> {
  const offsetX = options.offsetXMm ?? 0
  const offsetY = options.offsetYMm ?? 0
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  // One QR render per unique payload — bulk print of the same item list never repeats work.
  const qrCache = new Map<string, string>()
  async function getQr(value: string): Promise<string> {
    let dataUrl = qrCache.get(value)
    if (!dataUrl) {
      dataUrl = await qrDataUrl(value)
      qrCache.set(value, dataUrl)
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

    const qr = await getQr(item.qrValue)
    const qrX = cellX + CELL_PADDING_MM
    const qrY = cellY + (LABEL_HEIGHT_MM - QR_SIZE_MM) / 2
    // jsPDF stores addImage data uncompressed by default — for a page full of raster
    // images that turns a ~200KB document into 10+MB. 'FAST' compression is essential here.
    doc.addImage(qr, 'PNG', qrX, qrY, QR_SIZE_MM, QR_SIZE_MM, undefined, 'FAST')

    const textX = qrX + QR_SIZE_MM + TEXT_GAP_MM
    const textMaxWidth = cellX + LABEL_WIDTH_MM - CELL_PADDING_MM - textX
    let textY = cellY + CELL_PADDING_MM + 4
    // The hard bottom edge of this cell — nothing may be drawn past this, or it lands
    // on the label in the row below.
    const bottomLimitMm = cellY + LABEL_HEIGHT_MM - CELL_PADDING_MM

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(23, 24, 28)
    let skuFontSize = SKU_FONT_SIZE_TIERS[SKU_FONT_SIZE_TIERS.length - 1]
    for (const size of SKU_FONT_SIZE_TIERS) {
      doc.setFontSize(size)
      if (doc.getTextWidth(item.sku) <= textMaxWidth || size === SKU_FONT_SIZE_TIERS[SKU_FONT_SIZE_TIERS.length - 1]) {
        skuFontSize = size
        break
      }
    }
    doc.setFontSize(skuFontSize)
    // Real SKUs always fit on one line at the largest tier — this still measures the
    // actual wrap so textY can never desync from what's really drawn, even for a
    // non-conforming/legacy SKU that doesn't fit even at the smallest tier.
    const skuLines = doc.splitTextToSize(item.sku, textMaxWidth) as string[]
    doc.text(skuLines, textX, textY)
    // getLineHeight() is always in points regardless of the doc's unit — divide by
    // scaleFactor (~2.8346 for 'mm') to get millimeters, the same conversion jsPDF's
    // own internals use.
    const skuLineHeightMm = doc.getLineHeight() / doc.internal.scaleFactor
    textY += skuLines.length * skuLineHeightMm + SKU_LOCATION_GAP_MM

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(LOCATION_FONT_SIZE)
    doc.setTextColor(102, 102, 111)
    const locationLineHeightMm = doc.getLineHeight() / doc.internal.scaleFactor
    const maxLocationLines = Math.max(0, Math.floor((bottomLimitMm - textY) / locationLineHeightMm))
    const locationLines = (doc.splitTextToSize(item.shelfLocation || '—', textMaxWidth) as string[]).slice(
      0,
      maxLocationLines,
    )
    if (locationLines.length > 0) doc.text(locationLines, textX, textY)
  }

  return doc.output('blob')
}
