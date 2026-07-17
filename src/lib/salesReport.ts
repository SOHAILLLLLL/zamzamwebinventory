import { jsPDF } from 'jspdf'
import type { SaleListItem } from '../types/db'
import {
  ACCENT,
  FAINT,
  formatCurrencyPdf,
  INK,
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

const ROW_HEIGHT = 16
const COL_DATE_W = 62
const COL_AMOUNT_W = 80

function customerName(sale: SaleListItem): string {
  return sale.customer?.name || 'Walk-in'
}

function itemsSummary(sale: SaleListItem): string {
  const count = sale.sale_item.length
  const first = sale.sale_item[0]?.description ?? ''
  if (count <= 1) return first || '—'
  return `${first} +${count - 1} more`
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
  y += 30

  const customerColX = MARGIN + COL_DATE_W + 8
  const amountColX = page.width - MARGIN
  const itemsColX = customerColX + 150
  const itemsColWidth = amountColX - COL_AMOUNT_W - itemsColX - 8

  function drawTableHeader() {
    ensureSpace(ROW_HEIGHT + 6)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...FAINT)
    doc.text('DATE', MARGIN, y)
    doc.text('CUSTOMER', customerColX, y)
    doc.text('ITEMS', itemsColX, y)
    doc.text('AMOUNT', amountColX, y, { align: 'right' })
    y += 6
    doc.setDrawColor(...ACCENT)
    doc.setLineWidth(1)
    doc.line(MARGIN, y, page.width - MARGIN, y)
    y += 14
  }

  function drawSection(heading: string, rows: SaleListItem[]): number {
    ensureSpace(30)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...INK)
    doc.text(`${heading} (${rows.length})`, MARGIN, y)
    y += 20

    if (rows.length === 0) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(...MUTED)
      doc.text('None in this range.', MARGIN, y)
      y += 24
      return 0
    }

    drawTableHeader()
    let total = 0
    for (const sale of rows) {
      const itemsLines = doc.splitTextToSize(itemsSummary(sale), itemsColWidth) as string[]
      const rowHeight = Math.max(ROW_HEIGHT, itemsLines.length * 12)
      ensureSpace(rowHeight)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      doc.setTextColor(...INK)
      doc.text(new Date(sale.sale_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), MARGIN, y)
      doc.text(customerName(sale), customerColX, y, { maxWidth: itemsColX - customerColX - 8 })
      doc.text(itemsLines, itemsColX, y)
      doc.text(formatCurrencyPdf(sale.total_amount), amountColX, y, { align: 'right' })

      total += sale.total_amount
      y += rowHeight
    }
    y += 10
    return total
  }

  const paidSales = sales.filter((sale) => sale.is_paid)
  const unpaidSales = sales.filter((sale) => !sale.is_paid)

  const paidTotal = drawSection('Paid sales', paidSales)
  y += 8
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
