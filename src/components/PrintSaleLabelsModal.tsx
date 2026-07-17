import { Printer } from 'lucide-react'
import { useState } from 'react'
import type { SaleLabelData } from '../lib/saleLabels'
import { buildSaleLabelSheetPdf } from '../lib/saleLabels'
import { sharePdf } from '../lib/pdf'
import type { SaleListItem } from '../types/db'
import { Modal } from './Modal'
import styles from './PrintLabelsModal.module.css'

interface PrintSaleLabelsModalProps {
  sales: SaleListItem[]
  onClose: () => void
}

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const LABELS_PER_SHEET = 4

function toLabelData(sale: SaleListItem): SaleLabelData {
  return {
    id: sale.id,
    saleDate: sale.sale_date,
    isPaid: sale.is_paid,
    isCarrying: sale.is_carrying,
    transportCompany: sale.transport_company,
    lrNumber: sale.lr_number,
    totalAmount: sale.total_amount,
    customerName: sale.customer?.name || 'Walk-in',
    customerMobile: sale.customer?.mobile ?? null,
    customerAddress: [sale.customer?.address, sale.customer?.city, sale.customer?.state].filter(Boolean).join(', ') || null,
    itemDescriptions: sale.sale_item.map((item) => item.description),
  }
}

export function PrintSaleLabelsModal({ sales, onClose }: PrintSaleLabelsModalProps) {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sheetCount = Math.ceil(sales.length / LABELS_PER_SHEET)

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const blob = await buildSaleLabelSheetPdf(sales.map(toLabelData))
      await sharePdf(blob, `zamzam-sale-labels-${sales.length}.pdf`, 'ZamZam sale labels')
      onClose()
    } catch {
      setError("Couldn't generate the label sheet. Try again.")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Modal title="Print sale labels" onClose={onClose}>
      <p className={styles.summary}>
        {sales.length} label{sales.length === 1 ? '' : 's'} · {sheetCount} A4 sheet{sheetCount === 1 ? '' : 's'} (2 × 2, 105 ×
        148.5mm each)
      </p>

      <ul className={styles.preview}>
        {sales.map((sale) => (
          <li key={sale.id} className={styles.previewRow}>
            <span className={styles.previewSku}>{sale.customer?.name || 'Walk-in'}</span>
            <span className={styles.previewName}>{new Date(sale.sale_date).toLocaleDateString('en-IN')}</span>
            <span className={styles.previewLocation}>{currency.format(sale.total_amount)}</span>
          </li>
        ))}
      </ul>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        <button type="button" className={styles.cancelButton} onClick={onClose} disabled={generating}>
          Cancel
        </button>
        <button type="button" className={styles.generateButton} onClick={handleGenerate} disabled={generating}>
          <Printer size={15} />
          {generating ? 'Generating…' : 'Generate PDF'}
        </button>
      </div>
    </Modal>
  )
}
