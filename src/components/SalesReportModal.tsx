import { FileDown } from 'lucide-react'
import { useState } from 'react'
import { buildSalesReportPdf } from '../lib/salesReport'
import { sharePdf } from '../lib/pdf'
import type { SaleListItem } from '../types/db'
import { Modal } from './Modal'
import styles from './SalesReportModal.module.css'

interface SalesReportModalProps {
  sales: SaleListItem[]
  onClose: () => void
}

function todayStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function formatRangeLabel(from: string, to: string): string {
  const fromLabel = new Date(from).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  if (from === to) return fromLabel
  const toLabel = new Date(to).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  return `${fromLabel} – ${toLabel}`
}

export function SalesReportModal({ sales, onClose }: SalesReportModalProps) {
  const [from, setFrom] = useState(todayStr())
  const [to, setTo] = useState(todayStr())
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const matchCount = sales.filter((sale) => sale.sale_date >= from && sale.sale_date <= to).length

  async function handleGenerate() {
    if (from > to) {
      setError('Start date must be before the end date.')
      return
    }
    setError(null)
    setGenerating(true)
    try {
      const inRange = sales.filter((sale) => sale.sale_date >= from && sale.sale_date <= to)
      const blob = await buildSalesReportPdf({ sales: inRange, rangeLabel: formatRangeLabel(from, to) })
      await sharePdf(blob, `zamzam-sales-report-${from}-to-${to}.pdf`, 'ZamZam sales report')
      onClose()
    } catch {
      setError("Couldn't generate the report. Try again.")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Modal title="Download sales report" onClose={onClose}>
      <p className={styles.hint}>Pick a single day (same start/end date) or a range. Paid and unpaid sales are listed separately, with a summary at the end.</p>

      <div className={styles.dateRow}>
        <label className={styles.dateField}>
          <span>From</span>
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </label>
        <label className={styles.dateField}>
          <span>To</span>
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </label>
      </div>

      <div className={styles.quickRow}>
        <button type="button" className={styles.quickButton} onClick={() => { setFrom(todayStr()); setTo(todayStr()) }}>
          Today
        </button>
        <button
          type="button"
          className={styles.quickButton}
          onClick={() => {
            const start = new Date()
            start.setDate(start.getDate() - 6)
            setFrom(`${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`)
            setTo(todayStr())
          }}
        >
          Last 7 days
        </button>
        <button
          type="button"
          className={styles.quickButton}
          onClick={() => {
            const start = new Date()
            start.setDate(start.getDate() - 29)
            setFrom(`${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`)
            setTo(todayStr())
          }}
        >
          Last 30 days
        </button>
      </div>

      <p className={styles.summary}>
        {matchCount} sale{matchCount === 1 ? '' : 's'} in this range
      </p>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        <button type="button" className={styles.cancelButton} onClick={onClose} disabled={generating}>
          Cancel
        </button>
        <button type="button" className={styles.generateButton} onClick={handleGenerate} disabled={generating}>
          <FileDown size={15} />
          {generating ? 'Generating…' : 'Download PDF'}
        </button>
      </div>
    </Modal>
  )
}
