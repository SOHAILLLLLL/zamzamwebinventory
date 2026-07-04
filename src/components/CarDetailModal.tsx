import { Trash2 } from 'lucide-react'
import { getPhotoUrls } from '../lib/photos'
import type { DonorVehicleListItem } from '../types/db'
import { Badge, formatStatus, statusTone } from './Badge'
import { DetailRow, DetailSection } from './DetailRow'
import { Modal } from './Modal'
import { PhotoGallery } from './PhotoGallery'
import styles from './DetailModal.module.css'

interface CarDetailModalProps {
  vehicle: DonorVehicleListItem
  onClose: () => void
  onDelete: () => void
}

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

export function CarDetailModal({ vehicle, onClose, onDelete }: CarDetailModalProps) {
  const photoUrls = getPhotoUrls('car-photos', vehicle.photos)
  const app = vehicle.vehicle_application
  const title = [app?.make, app?.model].filter(Boolean).join(' ') || vehicle.tag_code

  return (
    <Modal title={title} onClose={onClose}>
      <PhotoGallery urls={photoUrls} alt={title} />

      <div className={styles.topRow}>
        <Badge tone={statusTone(vehicle.status)}>{formatStatus(vehicle.status)}</Badge>
        <button type="button" className={styles.deleteButton} onClick={onDelete}>
          <Trash2 size={14} />
          Delete
        </button>
      </div>

      <DetailSection title="Vehicle">
        <DetailRow label="Tag code" value={vehicle.tag_code} />
        <DetailRow label="Make" value={app?.make || '—'} />
        <DetailRow label="Model" value={app?.model || '—'} />
        <DetailRow label="Generation" value={app?.generation_code || '—'} />
        {app?.variant && <DetailRow label="Variant" value={app.variant} />}
        {app?.body_style && <DetailRow label="Body style" value={app.body_style} />}
        {(app?.year_from || app?.year_to) && (
          <DetailRow label="Model years" value={`${app?.year_from ?? '—'} – ${app?.year_to ?? '—'}`} />
        )}
      </DetailSection>

      <DetailSection title="Registration">
        <DetailRow label="RC number" value={vehicle.rc_number || '—'} />
        <DetailRow label="VIN" value={vehicle.vin || '—'} />
        <DetailRow label="Odometer" value={vehicle.odometer != null ? `${vehicle.odometer.toLocaleString('en-IN')} km` : '—'} />
      </DetailSection>

      <DetailSection title="Acquisition">
        <DetailRow label="Source" value={vehicle.source || '—'} />
        <DetailRow label="Purchase price" value={vehicle.purchase_price != null ? currency.format(vehicle.purchase_price) : '—'} />
        <DetailRow
          label="Purchase date"
          value={vehicle.purchase_date ? new Date(vehicle.purchase_date).toLocaleDateString('en-IN') : '—'}
        />
        <DetailRow label="Scrap certificate" value={vehicle.scrap_cert_ref || '—'} />
        <DetailRow label="Scrap value" value={vehicle.scrap_value != null ? currency.format(vehicle.scrap_value) : '—'} />
      </DetailSection>
    </Modal>
  )
}
