import { CheckCircle2, Hash, MapPin, XCircle } from 'lucide-react'
import { buildPartPdf, sharePdf } from '../lib/pdf'
import type { InventoryListItem } from '../types/db'
import { Badge, formatStatus, statusTone } from './Badge'
import { CardMenu } from './CardMenu'
import { LazyImage } from './LazyImage'
import styles from './PartCard.module.css'

interface PartCardProps {
  item: InventoryListItem
  onOpen: () => void
  onDelete: () => void
  onUpdateLocation: () => void
  selectionMode?: boolean
  selected?: boolean
  onToggleSelect?: () => void
}

export function PartCard({
  item,
  onOpen,
  onDelete,
  onUpdateLocation,
  selectionMode,
  selected,
  onToggleSelect,
}: PartCardProps) {
  const vehicle = item.donor_vehicle?.vehicle_application
  const vehicleLine = [vehicle?.make, vehicle?.generation_code].filter(Boolean).join(' · ')
  const partNumber = item.part_number || item.part_catalog?.primary_oem_number || item.sku

  async function handleSharePdf() {
    const blob = await buildPartPdf(item)
    await sharePdf(blob, `${item.sku}.pdf`, item.item_name)
  }

  return (
    <article
      className={styles.card}
      onClick={selectionMode ? onToggleSelect : onOpen}
      tabIndex={0}
      role="button"
      aria-pressed={selectionMode ? selected : undefined}
    >
      <div className={styles.thumb}>
        <LazyImage bucket="part-photos" path={item.photos[0] ?? null} alt={item.item_name} />
        {selectionMode ? (
          <span className={`${styles.selectCheckbox} ${selected ? styles.selectCheckboxActive : ''}`}>
            {selected && <CheckCircle2 size={16} strokeWidth={2.5} />}
          </span>
        ) : (
          <CardMenu onDelete={onDelete} onSharePdf={handleSharePdf} onUpdateLocation={onUpdateLocation} />
        )}
        <div className={styles.statusOverlay}>
          <Badge tone={statusTone(item.status)}>{formatStatus(item.status)}</Badge>
        </div>
      </div>

      <div className={styles.body}>
        {vehicleLine && <p className={styles.vehicleLine}>{vehicleLine}</p>}
        <h3 className={styles.title}>{item.item_name}</h3>

        <div className={styles.metaRow}>
          <span className={styles.metaItem}>
            <Hash size={12} />
            {partNumber}
          </span>
          <span className={styles.metaItem}>
            <MapPin size={12} />
            {item.shelf_location || 'Unassigned'}
          </span>
        </div>

        <div className={styles.footerRow}>
          <span className={`${styles.testedTag} ${item.tested ? styles.tested : styles.untested}`}>
            {item.tested ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
            {item.tested ? 'Tested' : 'Untested'}
          </span>
          {item.condition_grade && <Badge tone="neutral">Grade {item.condition_grade}</Badge>}
        </div>
      </div>
    </article>
  )
}
