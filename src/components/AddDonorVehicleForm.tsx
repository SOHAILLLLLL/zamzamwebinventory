import { Camera, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { DonorVehicleSource } from '../hooks/useCreateDonorVehicles'
import { useCreateDonorVehicles } from '../hooks/useCreateDonorVehicles'
import { useVehicleApplications } from '../hooks/useVehicleApplications'
import { isSupportedPhotoFile } from '../lib/photos'
import type { DonorVehicleListItem, VehicleApplicationSummary } from '../types/db'
import styles from './AddPartWizard.module.css'

interface PhotoDraft {
  file: File
  previewUrl: string
}

interface AddDonorVehicleFormProps {
  onCreated: (vehicle: DonorVehicleListItem) => void
  onCancel: () => void
}

const SOURCE_OPTIONS: { value: DonorVehicleSource; label: string }[] = [
  { value: 'insurance_auction', label: 'Insurance auction' },
  { value: 'rvsf', label: 'RVSF' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'trade_purchase', label: 'Trade purchase' },
  { value: 'other', label: 'Other' },
]

function appTitle(app: VehicleApplicationSummary) {
  return [app.make, app.model].filter(Boolean).join(' ') || 'Unnamed vehicle type'
}

function matchesAppSearch(app: VehicleApplicationSummary, query: string) {
  const haystack = [app.make, app.model, app.variant, app.generation_code, app.body_style]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(query)
}

export function AddDonorVehicleForm({ onCreated, onCancel }: AddDonorVehicleFormProps) {
  const [selectedApp, setSelectedApp] = useState<VehicleApplicationSummary | null>(null)
  const [appQuery, setAppQuery] = useState('')
  const [source, setSource] = useState<DonorVehicleSource | ''>('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [odometer, setOdometer] = useState('')
  const [rcNumber, setRcNumber] = useState('')
  const [vin, setVin] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [photos, setPhotos] = useState<PhotoDraft[]>([])
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const photosRef = useRef<PhotoDraft[]>([])

  const appsQuery = useVehicleApplications()
  const createDonorVehicles = useCreateDonorVehicles()

  useEffect(() => {
    photosRef.current = photos
  }, [photos])

  useEffect(() => {
    return () => {
      for (const photo of photosRef.current) URL.revokeObjectURL(photo.previewUrl)
    }
  }, [])

  const apps = useMemo(() => {
    const list = appsQuery.data ?? []
    const query = appQuery.trim().toLowerCase()
    return query ? list.filter((app) => matchesAppSearch(app, query)) : list
  }, [appsQuery.data, appQuery])

  const parsedQuantity = Number(quantity)
  const quantityValid = Number.isInteger(parsedQuantity) && parsedQuantity >= 1 && parsedQuantity <= 20

  function handleAddPhotosClick() {
    fileInputRef.current?.click()
  }

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList) return
    const files = Array.from(fileList)
    const accepted: PhotoDraft[] = []
    let rejected = 0
    for (const file of files) {
      if (isSupportedPhotoFile(file)) {
        accepted.push({ file, previewUrl: URL.createObjectURL(file) })
      } else {
        rejected += 1
      }
    }
    if (accepted.length > 0) setPhotos((prev) => [...prev, ...accepted])
    setPhotoError(
      rejected > 0 ? `${rejected} file${rejected === 1 ? '' : 's'} skipped — use JPEG, PNG, or WEBP under 30MB.` : null,
    )
  }

  function handleRemovePhoto(index: number) {
    setPhotos((prev) => {
      const target = prev[index]
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  async function handleSubmit() {
    if (!selectedApp) {
      setFormError('Choose the vehicle type first.')
      return
    }
    if (!quantityValid) {
      setFormError('Quantity must be a whole number from 1 to 20.')
      return
    }

    let parsedPrice: number | null = null
    if (purchasePrice.trim() !== '') {
      const value = Number(purchasePrice)
      if (Number.isNaN(value) || value < 0) {
        setFormError('Purchase price must be a positive number.')
        return
      }
      parsedPrice = value
    }

    let parsedOdometer: number | null = null
    if (odometer.trim() !== '') {
      const value = Number(odometer)
      if (Number.isNaN(value) || value < 0) {
        setFormError('Odometer must be a positive number.')
        return
      }
      parsedOdometer = Math.round(value)
    }

    setFormError(null)

    try {
      const created = await createDonorVehicles.mutateAsync({
        vehicleApplicationId: selectedApp.id,
        source: source || null,
        purchasePrice: parsedPrice,
        purchaseDate: purchaseDate || null,
        odometer: parsedOdometer,
        rcNumber: rcNumber.trim() || null,
        vin: vin.trim() || null,
        quantity: parsedQuantity,
        photoFiles: photos.map((photo) => photo.file),
      })
      const [first] = created
      if (first) onCreated(first)
    } catch {
      setFormError("Couldn't add this vehicle. Check the details and try again.")
    }
  }

  return (
    <div className={styles.stepPad}>
      <button type="button" className={styles.backLink} onClick={onCancel}>
        ← Choose from existing vehicles instead
      </button>

      <span className={styles.fieldLabel}>Vehicle type *</span>

      {selectedApp ? (
        <span className={styles.selectedChip}>
          {appTitle(selectedApp)}
          {selectedApp.generation_code ? ` · ${selectedApp.generation_code}` : ''}
          <button type="button" aria-label="Change vehicle type" onClick={() => setSelectedApp(null)}>
            <X size={13} />
          </button>
        </span>
      ) : (
        <div className={styles.inlinePicker}>
          <div className={styles.inlinePickerSearch}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search make, model, generation…"
              value={appQuery}
              onChange={(event) => setAppQuery(event.target.value)}
            />
          </div>
          {appsQuery.isLoading && <p className={styles.status}>Loading vehicle types…</p>}
          {appsQuery.isError && <p className={styles.statusError}>Couldn't load vehicle types.</p>}
          {appsQuery.isSuccess && (
            <ul className={styles.inlinePickerList}>
              {apps.map((app) => (
                <li key={app.id}>
                  <button type="button" className={styles.row} onClick={() => setSelectedApp(app)}>
                    <span className={styles.rowBody}>
                      <span className={styles.rowTitle}>{appTitle(app)}</span>
                      <span className={styles.rowMeta}>
                        {[app.variant, app.generation_code && `Gen ${app.generation_code}`, app.body_style]
                          .filter(Boolean)
                          .join(' · ') || 'No extra details on file'}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
              {apps.length === 0 && <li className={styles.empty}>No vehicle types match your search.</li>}
            </ul>
          )}
        </div>
      )}

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Source</span>
        <select className={styles.fieldInput} value={source} onChange={(event) => setSource(event.target.value as DonorVehicleSource)}>
          <option value="">Not specified</option>
          {SOURCE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Purchase price (₹)</span>
        <input
          className={styles.fieldInput}
          type="number"
          min="0"
          inputMode="decimal"
          value={purchasePrice}
          onChange={(event) => setPurchasePrice(event.target.value)}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Purchase date</span>
        <input
          className={styles.fieldInput}
          type="date"
          value={purchaseDate}
          onChange={(event) => setPurchaseDate(event.target.value)}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Odometer (km)</span>
        <input
          className={styles.fieldInput}
          type="number"
          min="0"
          inputMode="numeric"
          value={odometer}
          onChange={(event) => setOdometer(event.target.value)}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Quantity *</span>
        <div className={styles.quantityStepper}>
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQuantity((q) => String(Math.max(1, (Number(q) || 1) - 1)))}
          >
            −
          </button>
          <input
            className={styles.quantityInput}
            type="number"
            min="1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
          <button type="button" aria-label="Increase quantity" onClick={() => setQuantity((q) => String((Number(q) || 1) + 1))}>
            +
          </button>
        </div>
      </label>

      {quantityValid && parsedQuantity > 1 ? (
        <p className={styles.hint}>
          Creates {parsedQuantity} vehicles, each with its own tag code. RC number and VIN are left blank since those must be
          unique per physical vehicle — add them individually afterward.
        </p>
      ) : (
        <>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>RC number</span>
            <input className={styles.fieldInput} value={rcNumber} onChange={(event) => setRcNumber(event.target.value)} />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>VIN</span>
            <input className={styles.fieldInput} value={vin} onChange={(event) => setVin(event.target.value)} />
          </label>
        </>
      )}
      {!quantityValid && <p className={styles.errorText}>Quantity must be a whole number from 1 to 20.</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        capture="environment"
        className={styles.hiddenInput}
        onChange={(event) => {
          handleFilesSelected(event.target.files)
          event.target.value = ''
        }}
      />
      <div className={styles.photoGrid}>
        {photos.map((photo, index) => (
          <div key={photo.previewUrl} className={styles.photoTile}>
            <img src={photo.previewUrl} alt={`Vehicle photo ${index + 1}`} className={styles.photoImage} />
            <button type="button" className={styles.photoRemove} aria-label="Remove photo" onClick={() => handleRemovePhoto(index)}>
              <X size={13} />
            </button>
          </div>
        ))}
        <button type="button" className={styles.addPhotoTile} onClick={handleAddPhotosClick}>
          <Camera size={20} />
          <span>{photos.length === 0 ? 'Add photos' : 'Add more'}</span>
        </button>
      </div>
      {photoError && <p className={styles.errorText}>{photoError}</p>}

      {formError && <p className={styles.errorText}>{formError}</p>}

      <div className={styles.formActions}>
        <button type="button" className={styles.backButton} onClick={onCancel} disabled={createDonorVehicles.isPending}>
          Cancel
        </button>
        <button type="button" className={styles.primaryButton} onClick={handleSubmit} disabled={createDonorVehicles.isPending}>
          {createDonorVehicles.isPending
            ? 'Adding…'
            : `Add ${quantityValid ? parsedQuantity : ''} vehicle${quantityValid && parsedQuantity === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  )
}
