import { ArrowLeft, Share2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge, formatStatus, statusTone } from '../components/Badge'
import { ConfirmDialog } from '../components/ConfirmDialog'
import detailStyles from '../components/DetailModal.module.css'
import { DetailRow, DetailSection } from '../components/DetailRow'
import { PhotoGallery } from '../components/PhotoGallery'
import { DeleteBlockedError } from '../hooks/useDeleteInventoryItem'
import { useDeleteDonorVehicle } from '../hooks/useDeleteDonorVehicle'
import { useDonorVehicle } from '../hooks/useDonorVehicle'
import { buildCarPdf, sharePdf } from '../lib/pdf'
import styles from './CarDetailPage.module.css'

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

export function CarDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const vehicleQuery = useDonorVehicle(id)
  const deleteDonorVehicle = useDeleteDonorVehicle()

  const [sharing, setSharing] = useState(false)
  const [shareError, setShareError] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const vehicle = vehicleQuery.data

  async function handleSharePdf() {
    if (!vehicle) return
    setSharing(true)
    setShareError(false)
    try {
      const blob = await buildCarPdf(vehicle)
      await sharePdf(blob, `${vehicle.tag_code}.pdf`, title)
    } catch {
      setShareError(true)
    } finally {
      setSharing(false)
    }
  }

  async function handleConfirmDelete() {
    if (!vehicle) return
    await deleteDonorVehicle.mutateAsync({ id: vehicle.id, photos: vehicle.photos })
    navigate('/')
  }

  const app = vehicle?.vehicle_application
  const title = vehicle ? [app?.make, app?.model].filter(Boolean).join(' ') || vehicle.tag_code : ''

  return (
    <div className={styles.page}>
      <button type="button" className={styles.backLink} onClick={() => navigate('/')}>
        <ArrowLeft size={16} />
        Back to fleet
      </button>

      {vehicleQuery.isLoading && <p className={styles.status}>Loading vehicle…</p>}
      {vehicleQuery.isError && <p className={styles.statusError}>Couldn't load this vehicle. Try refreshing.</p>}

      {vehicle && (
        <div className={styles.card}>
          <h1 className={styles.title}>{title}</h1>

          <PhotoGallery bucket="car-photos" paths={vehicle.photos} alt={title} />

          <div className={detailStyles.topRow}>
            <Badge tone={statusTone(vehicle.status)}>{formatStatus(vehicle.status)}</Badge>
            <div className={detailStyles.actions}>
              <button type="button" className={detailStyles.shareButton} onClick={handleSharePdf} disabled={sharing}>
                <Share2 size={14} />
                {sharing ? 'Preparing…' : 'Share PDF'}
              </button>
              <button type="button" className={detailStyles.deleteButton} onClick={() => setConfirmingDelete(true)}>
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </div>
          {shareError && <p className={detailStyles.shareErrorText}>Couldn't generate PDF. Try again.</p>}

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
        </div>
      )}

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete this vehicle?"
          description={`"${vehicle?.tag_code}" and its photos will be permanently removed. This can't be undone.`}
          busy={deleteDonorVehicle.isPending}
          errorMessage={deleteDonorVehicle.error instanceof DeleteBlockedError ? deleteDonorVehicle.error.message : null}
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setConfirmingDelete(false)
            deleteDonorVehicle.reset()
          }}
        />
      )}
    </div>
  )
}
