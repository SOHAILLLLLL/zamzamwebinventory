import { CheckCircle2, Hash, MapPin, XCircle } from 'lucide-react'
import { getPhotoUrl } from '../lib/photos'
import type { InventoryListItem } from '../types/db'
import { Badge, formatStatus, statusTone } from './Badge'
import { CardMenu } from './CardMenu'
import { LazyImage } from './LazyImage'
import styles from './PartCard.module.css'

interface PartCardProps {
  item: InventoryListItem
  onOpen: () => void
  onDelete: () => void
}

export function PartCard({ item, onOpen, onDelete }: PartCardProps) {
  const thumbnail = item.photos[0] ? getPhotoUrl('part-photos', item.photos[0]) : null
  const vehicle = item.donor_vehicle?.vehicle_application
  const vehicleLine = [vehicle?.make, vehicle?.generation_code].filter(Boolean).join(' · ')
  const partNumber = item.part_catalog?.primary_oem_number || item.sku

  return (
    <article className={styles.card} onClick={onOpen} tabIndex={0} role="button">
      <div className={styles.thumb}>
        <LazyImage src={thumbnail} alt={item.item_name} />
        <CardMenu onDelete={onDelete} />
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
