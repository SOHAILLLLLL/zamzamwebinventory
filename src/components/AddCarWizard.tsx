import { ArrowLeft, Camera, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { DonorVehicleSource } from '../hooks/useCreateDonorVehicles'
import { useAuth } from '../hooks/useAuth'
import { useVehicleApplications } from '../hooks/useVehicleApplications'
import { enqueueCarUploadJob } from '../lib/carUploadQueue'
import { isSupportedPhotoFile } from '../lib/photos'
import type { VehicleApplicationSummary } from '../types/db'
import styles from './AddPartWizard.module.css'

type Step = 'vehicle' | 'photos' | 'details'

interface PhotoDraft {
  file: File
  previewUrl: string
}

interface AddCarWizardProps {
  onClose: () => void
}

const STEP_ORDER: Step[] = ['vehicle', 'photos', 'details']
const STEP_LABEL: Record<Step, string> = {
  vehicle: 'Choose the vehicle type',
  photos: 'Add photos',
  details: 'Vehicle details',
}

const SOURCE_OPTIONS: { value: DonorVehicleSource; label: string }[] = [
  { value: 'insurance_auction', label: 'Insurance auction' },
  { value: 'rvsf', label: 'RVSF' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'trade_purchase', label: 'Trade purchase' },
  { value: 'other', label: 'Other' },
]

function appTitle(app: VehicleApplicationSummary | null) {
  if (!app) return ''
  return [app.make, app.model].filter(Boolean).join(' ') || 'Unnamed vehicle type'
}

function matchesAppSearch(app: VehicleApplicationSummary, query: string) {
  const haystack = [app.make, app.model, app.variant, app.generation_code, app.body_style].filter(Boolean).join(' ').toLowerCase()
  return haystack.includes(query)
}

export function AddCarWizard({ onClose }: AddCarWizardProps) {
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState<Step>('vehicle')

  const [selectedApp, setSelectedApp] = useState<VehicleApplicationSummary | null>(null)
  const [appQuery, setAppQuery] = useState('')

  const [photos, setPhotos] = useState<PhotoDraft[]>([])
  const [photoError, setPhotoError] = useState<string | null>(null)
  const photosRef = useRef<PhotoDraft[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [source, setSource] = useState<DonorVehicleSource | ''>('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [odometer, setOdometer] = useState('')
  const [rcNumber, setRcNumber] = useState('')
  const [vin, setVin] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const appsQuery = useVehicleApplications()
  const { session } = useAuth()

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  useEffect(() => {
    photosRef.current = photos
  }, [photos])

  // Revoke any preview URLs the user never submitted — the background job creates its own
  // thumbnail URL from the File objects, independent of these draft previews.
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

  function handleSelectApp(app: VehicleApplicationSummary) {
    setSelectedApp(app)
    setStep('photos')
  }

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

  function handleBack() {
    const index = STEP_ORDER.indexOf(step)
    if (index > 0) setStep(STEP_ORDER[index - 1])
  }

  function handleSubmit() {
    if (!selectedApp) {
      setFormError('Choose the vehicle type first.')
      setStep('vehicle')
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

    // Fire the upload + insert off as a background job and close immediately — the yard
    // shouldn't have to stand around waiting on a photo upload to keep working.
    enqueueCarUploadJob({
      vehicleApplicationId: selectedApp.id,
      vehicleTitle: appTitle(selectedApp),
      source: source || null,
      purchasePrice: parsedPrice,
      purchaseDate: purchaseDate || null,
      odometer: parsedOdometer,
      rcNumber: rcNumber.trim() || null,
      vin: vin.trim() || null,
      createdBy: session?.user.id ?? null,
      photoFiles: photos.map((photo) => photo.file),
    })

    onClose()
  }

  return createPortal(
    <div className={`${styles.overlay} ${mounted ? styles.overlayVisible : ''}`} onClick={onClose}>
      <div
        className={`${styles.panel} ${mounted ? styles.panelVisible : ''}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Add car to fleet"
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Add car to fleet</h2>
          <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.progress}>
          <div className={styles.progressBar}>
            {STEP_ORDER.map((s, index) => (
              <span
                key={s}
                className={`${styles.progressSegment} ${index <= STEP_ORDER.indexOf(step) ? styles.progressSegmentDone : ''}`}
              />
            ))}
          </div>
          <span className={styles.progressLabel}>
            Step {STEP_ORDER.indexOf(step) + 1} of {STEP_ORDER.length} · {STEP_LABEL[step]}
          </span>
        </div>

        <div className={styles.body}>
          {step === 'vehicle' && (
            <>
              <div className={styles.searchWrap}>
                <Search size={14} className={styles.searchIcon} />
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search make, model, generation…"
                  value={appQuery}
                  onChange={(event) => setAppQuery(event.target.value)}
                  autoFocus
                />
              </div>

              {appsQuery.isLoading && <p className={styles.status}>Loading vehicle types…</p>}
              {appsQuery.isError && <p className={styles.statusError}>Couldn't load vehicle types. Try refreshing.</p>}
              {appsQuery.isSuccess && (
                <ul className={styles.list} role="listbox" aria-label="Vehicle types">
                  {apps.map((app) => {
                    const meta = [app.variant, app.generation_code && `Gen ${app.generation_code}`, app.body_style]
                      .filter(Boolean)
                      .join(' · ')
                    return (
                      <li key={app.id}>
                        <button type="button" className={styles.row} onClick={() => handleSelectApp(app)}>
                          <span className={styles.rowBody}>
                            <span className={styles.rowTitle}>{appTitle(app)}</span>
                            <span className={styles.rowMeta}>{meta || 'No extra details on file'}</span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                  {apps.length === 0 && <li className={styles.empty}>No vehicle types match your search.</li>}
                </ul>
              )}
            </>
          )}

          {step === 'photos' && (
            <div className={styles.stepPad}>
              <div className={styles.selectedContext}>
                <span className={styles.selectedContextLabel}>Vehicle</span>
                <span className={styles.selectedContextValue}>{appTitle(selectedApp)}</span>
              </div>

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
                    <button
                      type="button"
                      className={styles.photoRemove}
                      aria-label="Remove photo"
                      onClick={() => handleRemovePhoto(index)}
                    >
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
              <p className={styles.hint}>Optional — you can add photos later from the vehicle's page.</p>
            </div>
          )}

          {step === 'details' && (
            <div className={styles.stepPad}>
              <div className={styles.reviewCard}>
                <div className={styles.reviewRow}>
                  <span className={styles.reviewLabel}>Vehicle</span>
                  <span className={styles.reviewValue}>{appTitle(selectedApp)}</span>
                  <button type="button" className={styles.reviewEdit} onClick={() => setStep('vehicle')}>
                    Change
                  </button>
                </div>
                <div className={styles.reviewRow}>
                  <span className={styles.reviewLabel}>Photos</span>
                  <span className={styles.reviewValue}>
                    {photos.length} photo{photos.length === 1 ? '' : 's'}
                  </span>
                  <button type="button" className={styles.reviewEdit} onClick={() => setStep('photos')}>
                    Change
                  </button>
                </div>
              </div>

              <p className={styles.hint}>Nothing below is required — fill in what you know now and add the rest later.</p>

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
                <span className={styles.fieldLabel}>RC number</span>
                <input className={styles.fieldInput} value={rcNumber} onChange={(event) => setRcNumber(event.target.value)} />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>VIN</span>
                <input className={styles.fieldInput} value={vin} onChange={(event) => setVin(event.target.value)} />
              </label>

              {formError && <p className={styles.errorText}>{formError}</p>}
            </div>
          )}
        </div>

        {step !== 'vehicle' && (
          <div className={styles.footer}>
            <button type="button" className={styles.backButton} onClick={handleBack}>
              <ArrowLeft size={15} />
              Back
            </button>
            {step === 'photos' && (
              <button type="button" className={styles.primaryButton} onClick={() => setStep('details')}>
                Next
              </button>
            )}
            {step === 'details' && (
              <button type="button" className={styles.primaryButton} onClick={handleSubmit}>
                Add car
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
