import { Pencil, Printer, Share2, Trash2, X as XIcon } from 'lucide-react'
import { useState } from 'react'
import type { InventoryItemUpdate } from '../hooks/useUpdateInventoryItem'
import { useUpdateInventoryItem } from '../hooks/useUpdateInventoryItem'
import { buildPartPdf, sharePdf } from '../lib/pdf'
import type { InventoryListItem } from '../types/db'
import { Badge, formatStatus, statusTone } from './Badge'
import { DetailRow, DetailSection } from './DetailRow'
import { Modal } from './Modal'
import { PhotoGallery } from './PhotoGallery'
import styles from './DetailModal.module.css'

interface PartDetailModalProps {
  item: InventoryListItem
  statusOptions: string[]
  onClose: () => void
  onDelete: () => void
  onSaved: (updates: InventoryItemUpdate) => void
  onPrintLabel: () => void
}

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

function formatYesNo(value: boolean | null) {
  if (value === null) return 'Unknown'
  return value ? 'Yes' : 'No'
}

interface EditFormState {
  item_name: string
  part_number: string
  condition_grade: string
  tested: 'unknown' | 'yes' | 'no'
  test_notes: string
  paired_set_ref: string
  shelf_location: string
  price: string
  status: string
}

function toFormState(item: InventoryListItem): EditFormState {
  return {
    item_name: item.item_name,
    part_number: item.part_number ?? '',
    condition_grade: item.condition_grade ?? '',
    tested: item.tested === null ? 'unknown' : item.tested ? 'yes' : 'no',
    test_notes: item.test_notes ?? '',
    paired_set_ref: item.paired_set_ref ?? '',
    shelf_location: item.shelf_location ?? '',
    price: item.price != null ? String(item.price) : '',
    status: item.status,
  }
}

export function PartDetailModal({ item, statusOptions, onClose, onDelete, onSaved, onPrintLabel }: PartDetailModalProps) {
  const vehicle = item.donor_vehicle?.vehicle_application
  const part = item.part_catalog
  const [sharing, setSharing] = useState(false)
  const [shareError, setShareError] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<EditFormState>(() => toFormState(item))
  const [formError, setFormError] = useState<string | null>(null)
  const updateInventoryItem = useUpdateInventoryItem()

  async function handleSharePdf() {
    setSharing(true)
    setShareError(false)
    try {
      const blob = await buildPartPdf(item)
      await sharePdf(blob, `${item.sku}.pdf`, item.item_name)
    } catch {
      setShareError(true)
    } finally {
      setSharing(false)
    }
  }

  function handleStartEdit() {
    setForm(toFormState(item))
    setFormError(null)
    setIsEditing(true)
  }

  function handleCancelEdit() {
    setIsEditing(false)
    setFormError(null)
    updateInventoryItem.reset()
  }

  async function handleSave() {
    const name = form.item_name.trim()
    if (!name) {
      setFormError('Item name is required.')
      return
    }

    let price: number | null = null
    if (form.price.trim() !== '') {
      const parsed = Number(form.price)
      if (Number.isNaN(parsed) || parsed < 0) {
        setFormError('Price must be a positive number.')
        return
      }
      price = parsed
    }

    setFormError(null)

    const updates: InventoryItemUpdate = {
      item_name: name,
      part_number: form.part_number.trim() || null,
      condition_grade: form.condition_grade.trim() || null,
      tested: form.tested === 'unknown' ? null : form.tested === 'yes',
      test_notes: form.test_notes.trim() || null,
      paired_set_ref: form.paired_set_ref.trim() || null,
      shelf_location: form.shelf_location.trim() || null,
      price,
      status: form.status,
    }

    try {
      await updateInventoryItem.mutateAsync({ id: item.id, updates })
      onSaved(updates)
      setIsEditing(false)
    } catch {
      setFormError("Couldn't save changes. Try again.")
    }
  }

  return (
    <Modal title={item.item_name} onClose={onClose}>
      <PhotoGallery bucket="part-photos" paths={item.photos} alt={item.item_name} />

      <div className={styles.topRow}>
        <Badge tone={statusTone(item.status)}>{formatStatus(item.status)}</Badge>
        {item.condition_grade && <Badge tone="neutral">Grade {item.condition_grade}</Badge>}
        <div className={styles.actions}>
          {isEditing ? (
            <>
              <button type="button" className={styles.cancelButton} onClick={handleCancelEdit}>
                <XIcon size={14} />
                Cancel
              </button>
              <button
                type="button"
                className={styles.saveButton}
                onClick={handleSave}
                disabled={updateInventoryItem.isPending}
              >
                {updateInventoryItem.isPending ? 'Saving…' : 'Save'}
              </button>
            </>
          ) : (
            <>
              <button type="button" className={styles.shareButton} onClick={handleSharePdf} disabled={sharing}>
                <Share2 size={14} />
                {sharing ? 'Preparing…' : 'Share PDF'}
              </button>
              <button type="button" className={styles.iconButton} onClick={onPrintLabel} aria-label="Print label">
                <Printer size={14} />
              </button>
              <button type="button" className={styles.editButton} onClick={handleStartEdit}>
                <Pencil size={14} />
                Edit
              </button>
              <button type="button" className={styles.deleteButton} onClick={onDelete}>
                <Trash2 size={14} />
                Delete
              </button>
            </>
          )}
        </div>
      </div>
      {shareError && <p className={styles.shareErrorText}>Couldn't generate PDF. Try again.</p>}
      {formError && <p className={styles.shareErrorText}>{formError}</p>}

      {isEditing ? (
        <>
          <DetailSection title="Part">
            <DetailRow label="SKU" value={item.sku} />
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Item name</span>
              <input
                className={styles.fieldInput}
                value={form.item_name}
                onChange={(event) => setForm((prev) => ({ ...prev, item_name: event.target.value }))}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Part number</span>
              <input
                className={styles.fieldInput}
                value={form.part_number}
                onChange={(event) => setForm((prev) => ({ ...prev, part_number: event.target.value }))}
                placeholder={part?.primary_oem_number || 'Not set'}
              />
            </label>
            <DetailRow label="Type" value={part?.part_type || '—'} />
            <DetailRow label="Category" value={part?.category || '—'} />
            {part?.side && <DetailRow label="Side" value={part.side} />}
            {part?.description && <DetailRow label="Description" value={part.description} />}
          </DetailSection>

          <DetailSection title="Donor vehicle">
            <DetailRow label="Make" value={vehicle?.make || '—'} />
            <DetailRow label="Model" value={vehicle?.model || '—'} />
            <DetailRow label="Generation" value={vehicle?.generation_code || '—'} />
            {vehicle?.variant && <DetailRow label="Variant" value={vehicle.variant} />}
            <DetailRow label="Tag code" value={item.donor_vehicle?.tag_code || '—'} />
          </DetailSection>

          <DetailSection title="Condition & testing">
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Condition grade</span>
              <input
                className={styles.fieldInput}
                value={form.condition_grade}
                onChange={(event) => setForm((prev) => ({ ...prev, condition_grade: event.target.value }))}
                placeholder="e.g. A, B, C"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Tested</span>
              <select
                className={styles.fieldInput}
                value={form.tested}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, tested: event.target.value as EditFormState['tested'] }))
                }
              >
                <option value="unknown">Unknown</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Test notes</span>
              <textarea
                className={styles.fieldTextarea}
                value={form.test_notes}
                onChange={(event) => setForm((prev) => ({ ...prev, test_notes: event.target.value }))}
                rows={3}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Paired set</span>
              <input
                className={styles.fieldInput}
                value={form.paired_set_ref}
                onChange={(event) => setForm((prev) => ({ ...prev, paired_set_ref: event.target.value }))}
              />
            </label>
          </DetailSection>

          <DetailSection title="Inventory">
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Shelf location</span>
              <input
                className={styles.fieldInput}
                value={form.shelf_location}
                onChange={(event) => setForm((prev) => ({ ...prev, shelf_location: event.target.value }))}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Price (₹)</span>
              <input
                className={styles.fieldInput}
                type="number"
                min="0"
                inputMode="decimal"
                value={form.price}
                onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Status</span>
              <select
                className={styles.fieldInput}
                value={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {formatStatus(status)}
                  </option>
                ))}
              </select>
            </label>
            <DetailRow label="Listed" value={new Date(item.created_at).toLocaleDateString('en-IN')} />
          </DetailSection>
        </>
      ) : (
        <>
          <DetailSection title="Part">
            <DetailRow label="SKU" value={item.sku} />
            <DetailRow label="Part number" value={item.part_number || part?.primary_oem_number || '—'} />
            <DetailRow label="Type" value={part?.part_type || '—'} />
            <DetailRow label="Category" value={part?.category || '—'} />
            {part?.side && <DetailRow label="Side" value={part.side} />}
            {part?.description && <DetailRow label="Description" value={part.description} />}
          </DetailSection>

          <DetailSection title="Donor vehicle">
            <DetailRow label="Make" value={vehicle?.make || '—'} />
            <DetailRow label="Model" value={vehicle?.model || '—'} />
            <DetailRow label="Generation" value={vehicle?.generation_code || '—'} />
            {vehicle?.variant && <DetailRow label="Variant" value={vehicle.variant} />}
            <DetailRow label="Tag code" value={item.donor_vehicle?.tag_code || '—'} />
          </DetailSection>

          <DetailSection title="Condition & testing">
            <DetailRow label="Tested" value={formatYesNo(item.tested)} />
            {item.test_notes && <DetailRow label="Test notes" value={item.test_notes} />}
            {item.paired_set_ref && <DetailRow label="Paired set" value={item.paired_set_ref} />}
          </DetailSection>

          <DetailSection title="Inventory">
            <DetailRow label="Shelf location" value={item.shelf_location || 'Unassigned'} />
            <DetailRow label="Price" value={item.price != null ? currency.format(item.price) : '—'} />
            <DetailRow label="Listed" value={new Date(item.created_at).toLocaleDateString('en-IN')} />
          </DetailSection>
        </>
      )}
    </Modal>
  )
}
