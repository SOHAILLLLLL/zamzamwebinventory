import { ArrowLeft, Pencil, Printer, Share2, Trash2, X as XIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge, formatStatus, statusTone } from '../components/Badge'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { DetailRow, DetailSection } from '../components/DetailRow'
import detailStyles from '../components/DetailModal.module.css'
import { PhotoGallery } from '../components/PhotoGallery'
import { PrintLabelsModal } from '../components/PrintLabelsModal'
import { DeleteBlockedError, useDeleteInventoryItem } from '../hooks/useDeleteInventoryItem'
import { useInventoryItemBySku } from '../hooks/useInventoryItemBySku'
import { useInventoryItems } from '../hooks/useInventoryItems'
import type { InventoryItemUpdate } from '../hooks/useUpdateInventoryItem'
import { useUpdateInventoryItem } from '../hooks/useUpdateInventoryItem'
import { buildPartPdf, sharePdf } from '../lib/pdf'
import type { InventoryListItem } from '../types/db'
import styles from './ItemDetailPage.module.css'

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

export function ItemDetailPage() {
  const { sku } = useParams<{ sku: string }>()
  const navigate = useNavigate()
  const itemQuery = useInventoryItemBySku(sku)
  const item = itemQuery.data

  // Same-shape fallback to InventoryPage's status-options derivation — dedupes against
  // an already-warm ['inventory-items'] cache when arriving from a card click, and is
  // still correct (just one extra fetch) on a fresh/direct/QR-scanned visit.
  const allItemsQuery = useInventoryItems()
  const statusOptions = useMemo(() => {
    const statuses = new Set((allItemsQuery.data ?? []).map((listItem) => listItem.status))
    if (item) statuses.add(item.status)
    return [...statuses].sort((a, b) => a.localeCompare(b))
  }, [allItemsQuery.data, item])

  const [sharing, setSharing] = useState(false)
  const [shareError, setShareError] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<EditFormState | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [printOpen, setPrintOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const updateInventoryItem = useUpdateInventoryItem()
  const deleteInventoryItem = useDeleteInventoryItem()

  async function handleSharePdf() {
    if (!item) return
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
    if (!item) return
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
    if (!item || !form) return
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
      setIsEditing(false)
    } catch {
      setFormError("Couldn't save changes. Try again.")
    }
  }

  async function handleConfirmDelete() {
    if (!item) return
    await deleteInventoryItem.mutateAsync({ id: item.id, photos: item.photos })
    navigate('/')
  }

  if (itemQuery.isLoading) {
    return (
      <div className={styles.page}>
        <p className={styles.status}>Loading item…</p>
      </div>
    )
  }

  if (itemQuery.isError) {
    return (
      <div className={styles.page}>
        <p className={styles.statusError}>Couldn't load this item. Try refreshing.</p>
        <Link to="/" className={styles.backLink}>
          <ArrowLeft size={15} />
          Back to inventory
        </Link>
      </div>
    )
  }

  if (!item) {
    return (
      <div className={styles.page}>
        <p className={styles.status}>Item not found.</p>
        <Link to="/" className={styles.backLink}>
          <ArrowLeft size={15} />
          Back to inventory
        </Link>
      </div>
    )
  }

  const vehicle = item.donor_vehicle?.vehicle_application
  const part = item.part_catalog

  return (
    <div className={styles.page}>
      <button type="button" className={styles.backButton} onClick={() => navigate('/')}>
        <ArrowLeft size={15} />
        Back to inventory
      </button>

      <PhotoGallery bucket="part-photos" paths={item.photos} alt={item.item_name} />

      <div className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{item.item_name}</h1>
          <span className={styles.sku}>{item.sku}</span>
        </div>
        <div className={styles.badgeRow}>
          <Badge tone={statusTone(item.status)}>{formatStatus(item.status)}</Badge>
          {item.condition_grade && <Badge tone="neutral">Grade {item.condition_grade}</Badge>}
        </div>
      </div>

      <div className={detailStyles.topRow}>
        <div className={detailStyles.actions}>
          {isEditing ? (
            <>
              <button type="button" className={detailStyles.cancelButton} onClick={handleCancelEdit}>
                <XIcon size={14} />
                Cancel
              </button>
              <button
                type="button"
                className={detailStyles.saveButton}
                onClick={handleSave}
                disabled={updateInventoryItem.isPending}
              >
                {updateInventoryItem.isPending ? 'Saving…' : 'Save'}
              </button>
            </>
          ) : (
            <>
              <button type="button" className={detailStyles.shareButton} onClick={handleSharePdf} disabled={sharing}>
                <Share2 size={14} />
                {sharing ? 'Preparing…' : 'Share PDF'}
              </button>
              <button
                type="button"
                className={detailStyles.iconButton}
                onClick={() => setPrintOpen(true)}
                aria-label="Print label"
              >
                <Printer size={14} />
              </button>
              <button type="button" className={detailStyles.editButton} onClick={handleStartEdit}>
                <Pencil size={14} />
                Edit
              </button>
              <button type="button" className={detailStyles.deleteButton} onClick={() => setDeleteOpen(true)}>
                <Trash2 size={14} />
                Delete
              </button>
            </>
          )}
        </div>
      </div>
      {shareError && <p className={detailStyles.shareErrorText}>Couldn't generate PDF. Try again.</p>}
      {formError && <p className={detailStyles.shareErrorText}>{formError}</p>}

      {isEditing && form ? (
        <>
          <DetailSection title="Part">
            <DetailRow label="SKU" value={item.sku} />
            <label className={detailStyles.field}>
              <span className={detailStyles.fieldLabel}>Item name</span>
              <input
                className={detailStyles.fieldInput}
                value={form.item_name}
                onChange={(event) => setForm((prev) => (prev ? { ...prev, item_name: event.target.value } : prev))}
              />
            </label>
            <label className={detailStyles.field}>
              <span className={detailStyles.fieldLabel}>Part number</span>
              <input
                className={detailStyles.fieldInput}
                value={form.part_number}
                onChange={(event) => setForm((prev) => (prev ? { ...prev, part_number: event.target.value } : prev))}
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
            <label className={detailStyles.field}>
              <span className={detailStyles.fieldLabel}>Condition grade</span>
              <input
                className={detailStyles.fieldInput}
                value={form.condition_grade}
                onChange={(event) =>
                  setForm((prev) => (prev ? { ...prev, condition_grade: event.target.value } : prev))
                }
                placeholder="e.g. A, B, C"
              />
            </label>
            <label className={detailStyles.field}>
              <span className={detailStyles.fieldLabel}>Tested</span>
              <select
                className={detailStyles.fieldInput}
                value={form.tested}
                onChange={(event) =>
                  setForm((prev) => (prev ? { ...prev, tested: event.target.value as EditFormState['tested'] } : prev))
                }
              >
                <option value="unknown">Unknown</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
            <label className={detailStyles.field}>
              <span className={detailStyles.fieldLabel}>Test notes</span>
              <textarea
                className={detailStyles.fieldTextarea}
                value={form.test_notes}
                onChange={(event) => setForm((prev) => (prev ? { ...prev, test_notes: event.target.value } : prev))}
                rows={3}
              />
            </label>
            <label className={detailStyles.field}>
              <span className={detailStyles.fieldLabel}>Paired set</span>
              <input
                className={detailStyles.fieldInput}
                value={form.paired_set_ref}
                onChange={(event) =>
                  setForm((prev) => (prev ? { ...prev, paired_set_ref: event.target.value } : prev))
                }
              />
            </label>
          </DetailSection>

          <DetailSection title="Inventory">
            <label className={detailStyles.field}>
              <span className={detailStyles.fieldLabel}>Shelf location</span>
              <input
                className={detailStyles.fieldInput}
                value={form.shelf_location}
                onChange={(event) =>
                  setForm((prev) => (prev ? { ...prev, shelf_location: event.target.value } : prev))
                }
              />
            </label>
            <label className={detailStyles.field}>
              <span className={detailStyles.fieldLabel}>Price (₹)</span>
              <input
                className={detailStyles.fieldInput}
                type="number"
                min="0"
                inputMode="decimal"
                value={form.price}
                onChange={(event) => setForm((prev) => (prev ? { ...prev, price: event.target.value } : prev))}
              />
            </label>
            <label className={detailStyles.field}>
              <span className={detailStyles.fieldLabel}>Status</span>
              <select
                className={detailStyles.fieldInput}
                value={form.status}
                onChange={(event) => setForm((prev) => (prev ? { ...prev, status: event.target.value } : prev))}
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

      {printOpen && <PrintLabelsModal items={[item]} onClose={() => setPrintOpen(false)} />}

      {deleteOpen && (
        <ConfirmDialog
          title="Delete this part?"
          description={`"${item.item_name}" and its photos will be permanently removed. This can't be undone.`}
          busy={deleteInventoryItem.isPending}
          errorMessage={deleteInventoryItem.error instanceof DeleteBlockedError ? deleteInventoryItem.error.message : null}
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setDeleteOpen(false)
            deleteInventoryItem.reset()
          }}
        />
      )}
    </div>
  )
}
