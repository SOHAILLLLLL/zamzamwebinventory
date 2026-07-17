import { jsPDF } from 'jspdf'
import type { SaleListItem } from '../types/db'
import {
  ACCENT,
  FAINT,
  formatCurrencyPdf,
  INK,
  LINE,
  loadLogo,
  MARGIN,
  MUTED,
  openPage,
  type PageSize,
  stampPageNumbers,
} from './pdf'

export interface SalesReportInput {
  sales: SaleListItem[]
  rangeLabel: string
}

// Indents for the record layout (a numbered entry per sale, not a table row) —
// meta/dispatch text sits under the customer name, items sit one level deeper.
const ENTRY_INDENT = 14
const ITEM_INDENT = 20
const AMOUNT_COL_W = 78
const HEADER_LINE_H = 16
const META_LINE_H = 13
const ITEM_LINE_H = 12
const NOTE_LINE_H = 13
const ENTRY_TRAILING_GAP = 16

function customerName(sale: SaleListItem): string {
  return sale.customer?.name || 'Walk-in'
}

function contactLine(sale: SaleListItem): string {
  const customer = sale.customer
  const cityState = [customer?.city, customer?.state].filter(Boolean).join(', ')
  const parts = [customer?.mobile, cityState].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : 'No contact details on file'
}

function dispatchLine(sale: SaleListItem): string {
  if (sale.is_carrying) return 'Customer pickup'
  const details = [sale.transport_company, sale.lr_number && `LR ${sale.lr_number}`].filter(Boolean).join(' · ')
  return details ? `Parcel · ${details}` : 'Parcel · transport details pending'
}

// One wrapped line per item, each carrying its own amount — never truncated. Measuring
// happens in the same font/size the line is actually drawn in (normal, not whatever bold
// heading text left the doc set to), so the wrap width is accurate.
function itemLineGroups(doc: jsPDF, sale: SaleListItem, maxWidth: number): { lines: string[]; amount: number }[] {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  if (sale.sale_item.length === 0) {
    return [{ lines: ['No items on file'], amount: 0 }]
  }
  return sale.sale_item.map((item) => ({
    lines: doc.splitTextToSize(
      `${item.description}${item.inventory_item?.sku ? ` (${item.inventory_item.sku})` : ''} × ${item.quantity}`,
      maxWidth,
    ) as string[],
    amount: item.unit_price * item.quantity,
  }))
}

export async function buildSalesReportPdf({ sales, rangeLabel }: SalesReportInput): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const logo = await loadLogo()
  const pageSizes: PageSize[] = []

  let page = openPage(doc, 'portrait', logo, pageSizes, true)
  let y = page.contentTop

  function ensureSpace(needed: number) {
    if (y + needed > page.contentBottom) {
      page = openPage(doc, 'portrait', logo, pageSizes, false)
      y = page.contentTop
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(21)
  doc.setTextColor(...INK)
  doc.text('Sales Report', MARGIN, y)
  y += 20

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(...MUTED)
  doc.text(rangeLabel, MARGIN, y)
  y += 32

  function drawEntry(sale: SaleListItem, serial: number) {
    const itemMaxWidth = page.width - MARGIN - ITEM_INDENT - AMOUNT_COL_W - 10
    const groups = itemLineGroups(doc, sale, itemMaxWidth)
    const itemLineCount = groups.reduce((sum, group) => sum + group.lines.length, 0)
    const notes = sale.notes?.trim() || null
    const showDispatch = !sale.is_carrying

    const entryHeight =
      HEADER_LINE_H +
      META_LINE_H +
      (showDispatch ? META_LINE_H : 0) +
      itemLineCount * ITEM_LINE_H +
      (notes ? NOTE_LINE_H : 0) +
      ENTRY_TRAILING_GAP

    ensureSpace(entryHeight)

    const nameMaxWidth = page.width - MARGIN * 2 - AMOUNT_COL_W - 16
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...INK)
    doc.text(`${serial}. ${customerName(sale)}`, MARGIN, y, { maxWidth: nameMaxWidth })
    doc.text(formatCurrencyPdf(sale.total_amount), page.width - MARGIN, y, { align: 'right' })
    y += HEADER_LINE_H

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...MUTED)
    doc.text(contactLine(sale), MARGIN + ENTRY_INDENT, y)
    doc.text(
      new Date(sale.sale_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      page.width - MARGIN,
      y,
      { align: 'right' },
    )
    y += META_LINE_H

    if (showDispatch) {
      doc.text(dispatchLine(sale), MARGIN + ENTRY_INDENT, y)
      y += META_LINE_H
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...INK)
    for (const group of groups) {
      const [firstLine, ...restLines] = group.lines
      doc.text(`•  ${firstLine}`, MARGIN + ITEM_INDENT, y)
      doc.text(formatCurrencyPdf(group.amount), page.width - MARGIN, y, { align: 'right' })
      y += ITEM_LINE_H
      for (const line of restLines) {
        doc.text(line, MARGIN + ITEM_INDENT + 12, y)
        y += ITEM_LINE_H
      }
    }

    if (notes) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9)
      doc.setTextColor(...FAINT)
      doc.text(`Note: ${notes}`, MARGIN + ENTRY_INDENT, y, {
        maxWidth: page.width - MARGIN * 2 - ENTRY_INDENT,
      })
      y += NOTE_LINE_H
    }

    y += 8
    doc.setDrawColor(...LINE)
    doc.setLineWidth(1)
    doc.line(MARGIN, y, page.width - MARGIN, y)
    y += ENTRY_TRAILING_GAP - 8
  }

  function drawSection(heading: string, rows: SaleListItem[]): number {
    ensureSpace(30)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(...INK)
    doc.text(`${heading} (${rows.length})`, MARGIN, y)
    y += 8
    doc.setDrawColor(...ACCENT)
    doc.setLineWidth(1.2)
    doc.line(MARGIN, y, MARGIN + 28, y)
    y += 20

    if (rows.length === 0) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(...MUTED)
      doc.text('None in this range.', MARGIN, y)
      y += 24
      return 0
    }

    let total = 0
    rows.forEach((sale, index) => {
      drawEntry(sale, index + 1)
      total += sale.total_amount
    })
    return total
  }

  const paidSales = sales.filter((sale) => sale.is_paid)
  const unpaidSales = sales.filter((sale) => !sale.is_paid)

  const paidTotal = drawSection('Paid sales', paidSales)
  y += 12
  const unpaidTotal = drawSection('Unpaid sales', unpaidSales)

  // Statistics go last, on their own section — never interleaved with the sale listings.
  ensureSpace(140)
  y += 10
  doc.setDrawColor(...ACCENT)
  doc.setLineWidth(1.4)
  doc.line(MARGIN, y, page.width - MARGIN, y)
  y += 24

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...INK)
  doc.text('Summary', MARGIN, y)
  y += 22

  const stats: [string, string][] = [
    ['Total sales', `${sales.length}`],
    ['Paid sales', `${paidSales.length} · ${formatCurrencyPdf(paidTotal)}`],
    ['Unpaid sales', `${unpaidSales.length} · ${formatCurrencyPdf(unpaidTotal)}`],
    ['Total amount', formatCurrencyPdf(paidTotal + unpaidTotal)],
    [
      'Average sale value',
      sales.length > 0 ? formatCurrencyPdf((paidTotal + unpaidTotal) / sales.length) : formatCurrencyPdf(0),
    ],
    ['Parcel / transport sales', `${sales.filter((sale) => !sale.is_carrying).length}`],
  ]

  for (const [label, value] of stats) {
    ensureSpace(20)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(...MUTED)
    doc.text(label, MARGIN, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...INK)
    doc.text(value, page.width - MARGIN, y, { align: 'right' })
    y += 20
  }

  stampPageNumbers(doc, pageSizes)
  return doc.output('blob')
}
