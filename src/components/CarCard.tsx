import { Tag } from 'lucide-react'
import { getPhotoUrl } from '../lib/photos'
import type { DonorVehicleListItem } from '../types/db'
import { Badge, formatStatus, statusTone } from './Badge'
import { CardMenu } from './CardMenu'
import { LazyImage } from './LazyImage'
import styles from './CarCard.module.css'

interface CarCardProps {
  vehicle: DonorVehicleListItem
  onOpen: () => void
  onDelete: () => void
}

export function CarCard({ vehicle, onOpen, onDelete }: CarCardProps) {
  const thumbnail = vehicle.photos[0] ? getPhotoUrl('car-photos', vehicle.photos[0]) : null
  const app = vehicle.vehicle_application
  const title = [app?.make, app?.model].filter(Boolean).join(' ') || 'Unidentified vehicle'
  const subtitle = [app?.generation_code, app?.variant].filter(Boolean).join(' · ')

  return (
    <article className={styles.card} onClick={onOpen} tabIndex={0} role="button">
      <div className={styles.thumb}>
        <LazyImage src={thumbnail} alt={title} />
        <CardMenu onDelete={onDelete} />
        <div className={styles.statusOverlay}>
          <Badge tone={statusTone(vehicle.status)}>{formatStatus(vehicle.status)}</Badge>
        </div>
      </div>

      <div className={styles.body}>
        <h3 className={styles.title}>{title}</h3>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        <span className={styles.tagCode}>
          <Tag size={12} />
          {vehicle.tag_code}
        </span>
      </div>
    </article>
  )
}
