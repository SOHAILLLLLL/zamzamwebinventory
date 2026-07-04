import { Trash2 } from 'lucide-react'
import { getPhotoUrls } from '../lib/photos'
import type { InventoryListItem } from '../types/db'
import { Badge, formatStatus, statusTone } from './Badge'
import { DetailRow, DetailSection } from './DetailRow'
import { Modal } from './Modal'
import { PhotoGallery } from './PhotoGallery'
import styles from './DetailModal.module.css'

interface PartDetailModalProps {
  item: InventoryListItem
  onClose: () => void
  onDelete: () => void
}

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

function formatYesNo(value: boolean | null) {
  if (value === null) return 'Unknown'
  return value ? 'Yes' : 'No'
}

export function PartDetailModal({ item, onClose, onDelete }: PartDetailModalProps) {
  const photoUrls = getPhotoUrls('part-photos', item.photos)
  const vehicle = item.donor_vehicle?.vehicle_application
  const part = item.part_catalog

  return (
    <Modal title={item.item_name} onClose={onClose}>
      <PhotoGallery urls={photoUrls} alt={item.item_name} />

      <div className={styles.topRow}>
        <Badge tone={statusTone(item.status)}>{formatStatus(item.status)}</Badge>
        {item.condition_grade && <Badge tone="neutral">Grade {item.condition_grade}</Badge>}
        <button type="button" className={styles.deleteButton} onClick={onDelete}>
          <Trash2 size={14} />
          Delete
        </button>
      </div>

      <DetailSection title="Part">
        <DetailRow label="SKU" value={item.sku} />
        <DetailRow label="Part number" value={part?.primary_oem_number || '—'} />
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
    </Modal>
  )
}
