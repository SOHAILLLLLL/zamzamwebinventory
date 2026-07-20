import { AlertTriangle, Printer } from 'lucide-react'
import { useState } from 'react'
import type { LabelData } from '../lib/labels'
import { buildLabelSheetPdf } from '../lib/labels'
import { sharePdf } from '../lib/pdf'
import type { InventoryListItem } from '../types/db'
import { Modal } from './Modal'
import styles from './PrintLabelsModal.module.css'

interface PrintLabelsModalProps {
  items: InventoryListItem[]
  onClose: () => void
}

const LABELS_PER_SHEET = 24

export function PrintLabelsModal({ items, onClose }: PrintLabelsModalProps) {
  const [offsetX, setOffsetX] = useState('0')
  const [offsetY, setOffsetY] = useState('0')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const missingLocation = items.filter((item) => !item.shelf_location).length
  const sheetCount = Math.ceil(items.length / LABELS_PER_SHEET)

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const labelData: LabelData[] = items.map((item) => ({
        id: item.id,
        sku: item.sku,
        qrValue: `${window.location.origin}/items/${encodeURIComponent(item.sku)}`,
        shelfLocation: item.shelf_location,
      }))
      const blob = await buildLabelSheetPdf(labelData, {
        offsetXMm: Number(offsetX) || 0,
        offsetYMm: Number(offsetY) || 0,
      })
      await sharePdf(blob, `zamzam-labels-${items.length}.pdf`, 'ZamZam item labels')
      onClose()
    } catch {
      setError("Couldn't generate the label sheet. Try again.")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Modal title="Print labels" onClose={onClose}>
      <p className={styles.summary}>
        {items.length} label{items.length === 1 ? '' : 's'} · {sheetCount} A4 sheet{sheetCount === 1 ? '' : 's'} (3 × 8,
        70 × 37.1mm each)
      </p>

      {missingLocation > 0 && (
        <p className={styles.warning}>
          <AlertTriangle size={14} />
          {missingLocation} item{missingLocation === 1 ? '' : 's'} {missingLocation === 1 ? 'has' : 'have'} no shelf location
          — that label will print with a blank location.
        </p>
      )}

      <ul className={styles.preview}>
        {items.map((item) => (
          <li key={item.id} className={styles.previewRow}>
            <span className={styles.previewSku}>{item.sku}</span>
            <span className={styles.previewName}>{item.item_name}</span>
            <span className={styles.previewLocation}>{item.shelf_location || '—'}</span>
          </li>
        ))}
      </ul>

      <div className={styles.offsets}>
        <label className={styles.offsetField}>
          <span>Left offset (mm)</span>
          <input type="number" step="0.5" value={offsetX} onChange={(event) => setOffsetX(event.target.value)} />
        </label>
        <label className={styles.offsetField}>
          <span>Top offset (mm)</span>
          <input type="number" step="0.5" value={offsetY} onChange={(event) => setOffsetY(event.target.value)} />
        </label>
      </div>
      <p className={styles.hint}>
        Print a test sheet first — if the labels land slightly off the sticker sheet's cells, nudge these offsets and print
        again.
      </p>

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
