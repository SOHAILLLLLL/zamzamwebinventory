import { jsPDF } from 'jspdf'
import {
  ACCENT,
  fitWithinBox,
  FAINT,
  formatCurrencyPdf,
  INK,
  loadLogo,
  MUTED,
  STATUS_RGB,
} from './pdf'

export interface SaleLabelData {
  id: string
  saleDate: string
  isPaid: boolean
  isCarrying: boolean
  transportCompany: string | null
  lrNumber: string | null
  totalAmount: number
  customerName: string
  customerMobile: string | null
  customerAddress: string | null
  itemDescriptions: string[]
}

// "A4 2x2": 2 columns x 2 rows of 105 x 148.5mm labels, filling a full A4 page exactly
// (2 x 105 = 210, 2 x 148.5 = 297) — a quarter-sheet dispatch/packing label per sale.
//
// The doc uses point units (matching every font-size/line-height constant below, which are
// all point-scaled), so the physical mm spec is converted to points once, here.
const MM_TO_PT = 2.834645669
const COLUMNS = 2
const ROWS = 2
const LABEL_WIDTH_PT = 105 * MM_TO_PT
const LABEL_HEIGHT_PT = 148.5 * MM_TO_PT
const LABELS_PER_PAGE = COLUMNS * ROWS
const PADDING_PT = 8 * MM_TO_PT

// Every item is always printed — no "+N more" truncation. Sales with a lot of lines get a
// smaller font/tighter line height instead of losing items, tried largest-first.
const ITEM_TEXT_TIERS = [
  { fontSize: 9, lineHeight: 10 },
  { fontSize: 8, lineHeight: 9 },
  { fontSize: 7, lineHeight: 7.8 },
  { fontSize: 6, lineHeight: 6.6 },
]

function shortSaleRef(id: string): string {
  return id.slice(0, 8).toUpperCase()
}

export async function buildSaleLabelSheetPdf(sales: SaleLabelData[]): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const logo = await loadLogo()

  for (let index = 0; index < sales.length; index++) {
    const sale = sales[index]
    const positionOnPage = index % LABELS_PER_PAGE
    if (index > 0 && positionOnPage === 0) doc.addPage('a4', 'portrait')

    const row = Math.floor(positionOnPage / COLUMNS)
    const col = positionOnPage % COLUMNS
    const cellX = col * LABEL_WIDTH_PT
    const cellY = row * LABEL_HEIGHT_PT
    const contentX = cellX + PADDING_PT
    const contentRight = cellX + LABEL_WIDTH_PT - PADDING_PT
    const contentWidth = contentRight - contentX
    let y = cellY + PADDING_PT

    if (logo) {
      const box = fitWithinBox(logo.width, logo.height, 26, 14)
      doc.addImage(logo.dataUrl, 'PNG', contentX, y, box.width, box.height, undefined, 'FAST')
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text('ZamZam Auto Parts — Narol, Ahmedabad', contentRight, y + 9, { align: 'right' })
    y += 16

    doc.setDrawColor(...ACCENT)
    doc.setLineWidth(1)
    doc.line(contentX, y, contentRight, y)
    y += 10

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...INK)
    doc.text(`Sale ${shortSaleRef(sale.id)}`, contentX, y)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...(sale.isPaid ? STATUS_RGB.success : STATUS_RGB.warning))
    doc.text(sale.isPaid ? 'PAID' : 'UNPAID', contentRight, y, { align: 'right' })
    y += 15

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...MUTED)
    doc.text(new Date(sale.saleDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), contentX, y)
    y += 14

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...FAINT)
    doc.text('TO', contentX, y)
    y += 12

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...INK)
    doc.text(sale.customerName, contentX, y)
    y += 14

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...MUTED)
    if (sale.customerMobile) {
      doc.text(sale.customerMobile, contentX, y)
      y += 12
    }
    if (sale.customerAddress) {
      const lines = doc.splitTextToSize(sale.customerAddress, contentWidth) as string[]
      doc.text(lines.slice(0, 3), contentX, y)
      y += lines.slice(0, 3).length * 11 + 4
    }

    y += 4
    doc.setDrawColor(...ACCENT)
    doc.setLineWidth(0.6)
    doc.line(contentX, y, contentRight, y)
    y += 10

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...FAINT)
    doc.text(sale.isCarrying ? 'CUSTOMER PICKUP' : 'DISPATCH', contentX, y)
    y += 12

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...INK)
    if (!sale.isCarrying) {
      const dispatchLine = [sale.transportCompany, sale.lrNumber && `LR ${sale.lrNumber}`].filter(Boolean).join(' · ')
      doc.text(dispatchLine || 'Transport details pending', contentX, y)
      y += 12
    }

    y += 4
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...FAINT)
    doc.text('ITEMS', contentX, y)
    y += 12

    // TOTAL_BLOCK_HEIGHT reserves room for the rule + "TOTAL … amount" line below the items,
    // so the tier chosen still leaves the total inside the physical label — but the total
    // itself is drawn right after the items flow, not pinned to a fixed bottom position,
    // so a short sale doesn't leave a large dead gap before it.
    const TOTAL_BLOCK_HEIGHT = 26
    const bottomLimit = cellY + LABEL_HEIGHT_PT - PADDING_PT
    const availableHeight = bottomLimit - TOTAL_BLOCK_HEIGHT - y

    // Pick the largest tier whose wrapped line count still fits before the total —
    // every item is printed regardless, this only controls how tight the text gets.
    // Measure in the same weight it's rendered in (normal) — splitTextToSize wraps using
    // whatever font is currently set, which was left bold by the "ITEMS" label above.
    doc.setFont('helvetica', 'normal')
    let chosenTier = ITEM_TEXT_TIERS[ITEM_TEXT_TIERS.length - 1]
    let wrappedLines: string[] = []
    for (const tier of ITEM_TEXT_TIERS) {
      doc.setFontSize(tier.fontSize)
      const lines = sale.itemDescriptions.flatMap(
        (description) => doc.splitTextToSize(`• ${description}`, contentWidth) as string[],
      )
      if (lines.length * tier.lineHeight <= availableHeight || tier === ITEM_TEXT_TIERS[ITEM_TEXT_TIERS.length - 1]) {
        chosenTier = tier
        wrappedLines = lines
        break
      }
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(chosenTier.fontSize)
    doc.setTextColor(...INK)
    for (const line of wrappedLines) {
      doc.text(line, contentX, y)
      y += chosenTier.lineHeight
    }

    y += 8
    doc.setDrawColor(...ACCENT)
    doc.setLineWidth(0.6)
    doc.line(contentX, y, contentRight, y)
    y += 14
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...MUTED)
    doc.text('TOTAL', contentX, y)
    doc.setFontSize(13)
    doc.setTextColor(...INK)
    doc.text(formatCurrencyPdf(sale.totalAmount), contentRight, y, { align: 'right' })
  }

  return doc.output('blob')
}
