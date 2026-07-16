import { ArrowLeft, Camera, Check, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CreatedInventoryItem } from '../hooks/useCreateInventoryItems'
import { useCreateInventoryItems } from '../hooks/useCreateInventoryItems'
import { useDonorVehicles } from '../hooks/useDonorVehicles'
import { useFitment } from '../hooks/useFitment'
import { usePartCatalog } from '../hooks/usePartCatalog'
import { isSupportedPhotoFile } from '../lib/photos'
import type { DonorVehicleListItem, PartCatalog } from '../types/db'
import { AddDonorVehicleForm } from './AddDonorVehicleForm'
import { Badge, formatStatus, statusTone } from './Badge'
import { LazyImage } from './LazyImage'
import styles from './AddPartWizard.module.css'

type Step = 'vehicle' | 'part' | 'photos' | 'details' | 'success'
type PickStep = Exclude<Step, 'success'>
type TestedValue = 'unknown' | 'yes' | 'no'
type ConditionGrade = '' | 'A' | 'B' | 'C'

interface PhotoDraft {
  file: File
  previewUrl: string
}

interface AddPartWizardProps {
  onClose: () => void
}

const STEP_ORDER: PickStep[] = ['vehicle', 'part', 'photos', 'details']
const STEP_LABEL: Record<PickStep, string> = {
  vehicle: 'Choose the donor vehicle',
  part: 'Choose the part',
  photos: 'Add photos',
  details: 'Item details',
}

function matchesVehicleSearch(vehicle: DonorVehicleListItem, query: string) {
  const app = vehicle.vehicle_application
  const haystack = [vehicle.tag_code, vehicle.vin, vehicle.rc_number, app?.make, app?.model, app?.variant, app?.generation_code]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(query)
}

function matchesPartSearch(part: PartCatalog, query: string) {
  const haystack = [part.part_type, part.category, part.primary_oem_number, part.description, part.side]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(query)
}

function vehicleTitle(vehicle: DonorVehicleListItem | null) {
  if (!vehicle) return ''
  const app = vehicle.vehicle_application
  return [app?.make, app?.model].filter(Boolean).join(' ') || vehicle.tag_code
}

export function AddPartWizard({ onClose }: AddPartWizardProps) {
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState<Step>('vehicle')

  const [selectedVehicle, setSelectedVehicle] = useState<DonorVehicleListItem | null>(null)
  const [selectedPart, setSelectedPart] = useState<PartCatalog | null>(null)
  const [vehicleMode, setVehicleMode] = useState<'existing' | 'new'>('existing')

  const [vehicleQuery, setVehicleQuery] = useState('')
  const [partQuery, setPartQuery] = useState('')
  const [partTab, setPartTab] = useState<'fits' | 'all'>('fits')

  const [photos, setPhotos] = useState<PhotoDraft[]>([])
  const [photoError, setPhotoError] = useState<string | null>(null)
  const photosRef = useRef<PhotoDraft[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [itemName, setItemName] = useState('')
  const [partNumber, setPartNumber] = useState('')
  const [conditionGrade, setConditionGrade] = useState<ConditionGrade>('')
  const [tested, setTested] = useState<TestedValue>('unknown')
  const [testNotes, setTestNotes] = useState('')
  const [pairedSetRef, setPairedSetRef] = useState('')
  const [shelfLocation, setShelfLocation] = useState('')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [formError, setFormError] = useState<string | null>(null)
  const [createdItems, setCreatedItems] = useState<CreatedInventoryItem[]>([])

  const vehiclesQuery = useDonorVehicles()
  const partCatalogQuery = usePartCatalog()
  const fitmentQuery = useFitment(selectedVehicle?.vehicle_application?.id ?? null)
  const createInventoryItems = useCreateInventoryItems()

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

  useEffect(() => {
    return () => {
      for (const photo of photosRef.current) URL.revokeObjectURL(photo.previewUrl)
    }
  }, [])

  const vehicles = useMemo(() => {
    const list = vehiclesQuery.data ?? []
    const query = vehicleQuery.trim().toLowerCase()
    return query ? list.filter((vehicle) => matchesVehicleSearch(vehicle, query)) : list
  }, [vehiclesQuery.data, vehicleQuery])

  const fitPartIds = useMemo(() => fitmentQuery.data ?? new Set<string>(), [fitmentQuery.data])
  const allParts = useMemo(() => partCatalogQuery.data ?? [], [partCatalogQuery.data])
  const fitsParts = useMemo(() => allParts.filter((part) => fitPartIds.has(part.id)), [allParts, fitPartIds])
  const hasFitment = fitsParts.length > 0
  const activePartTab = hasFitment ? partTab : 'all'
  const partsForActiveTab = activePartTab === 'fits' ? fitsParts : allParts
  const filteredParts = useMemo(() => {
    const query = partQuery.trim().toLowerCase()
    return query ? partsForActiveTab.filter((part) => matchesPartSearch(part, query)) : partsForActiveTab
  }, [partsForActiveTab, partQuery])

  function handleSelectVehicle(vehicle: DonorVehicleListItem) {
    if (vehicle.id !== selectedVehicle?.id) {
      setSelectedPart(null)
      setItemName('')
      setPartNumber('')
      setPartTab('fits')
      setPartQuery('')
    }
    setSelectedVehicle(vehicle)
    setVehicleMode('existing')
    setStep('part')
  }

  function handleVehicleCreated(vehicle: DonorVehicleListItem) {
    handleSelectVehicle(vehicle)
  }

  function handleSelectPart(part: PartCatalog) {
    if (part.id !== selectedPart?.id) {
      setItemName(part.part_type ?? '')
      setPartNumber(part.primary_oem_number ?? '')
    }
    setSelectedPart(part)
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
    const index = STEP_ORDER.indexOf(step as PickStep)
    if (index > 0) setStep(STEP_ORDER[index - 1])
  }

  async function handleSubmit() {
    const name = itemName.trim()
    const location = shelfLocation.trim()
    const qty = Number(quantity)

    if (!selectedVehicle || !selectedPart) {
      setFormError('Missing vehicle or part selection.')
      return
    }
    if (!name) {
      setFormError('Item name is required.')
      return
    }
    if (!conditionGrade) {
      setFormError('Choose a condition grade.')
      return
    }
    if (!location) {
      setFormError('Shelf location is required.')
      return
    }
    if (!Number.isInteger(qty) || qty < 1) {
      setFormError('Quantity must be at least 1.')
      return
    }
    if (qty > 50) {
      setFormError('Add at most 50 identical items at a time.')
      return
    }

    let parsedPrice: number | null = null
    if (price.trim() !== '') {
      const value = Number(price)
      if (Number.isNaN(value) || value < 0) {
        setFormError('Price must be a positive number.')
        return
      }
      parsedPrice = value
    }

    setFormError(null)

    try {
      const created = await createInventoryItems.mutateAsync({
        donorVehicleId: selectedVehicle.id,
        partCatalogId: selectedPart.id,
        itemName: name,
        partNumber: partNumber.trim() || null,
        conditionGrade,
        tested: tested === 'unknown' ? null : tested === 'yes',
        testNotes: testNotes.trim() || null,
        pairedSetRef: pairedSetRef.trim() || null,
        shelfLocation: location,
        price: parsedPrice,
        quantity: qty,
        photoFiles: photos.map((photo) => photo.file),
      })
      setCreatedItems(created)
      setStep('success')
    } catch {
      setFormError("Couldn't add this part. Check the details and try again.")
    }
  }

  function handleAddAnother() {
    setSelectedPart(null)
    setItemName('')
    setPartNumber('')
    for (const photo of photos) URL.revokeObjectURL(photo.previewUrl)
    setPhotos([])
    setConditionGrade('')
    setTested('unknown')
    setTestNotes('')
    setPairedSetRef('')
    setShelfLocation('')
    setPrice('')
    setQuantity('1')
    setFormError(null)
    setCreatedItems([])
    setStep('part')
  }

  const parsedQuantity = Number(quantity)
  const quantityValid = Number.isInteger(parsedQuantity) && parsedQuantity >= 1 && parsedQuantity <= 50

  return createPortal(
    <div className={`${styles.overlay} ${mounted ? styles.overlayVisible : ''}`} onClick={onClose}>
      <div
        className={`${styles.panel} ${mounted ? styles.panelVisible : ''}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Add part to inventory"
      >
        <div className={styles.header}>
          <h2 className={styles.title}>{step === 'success' ? 'Added to inventory' : 'Add part to inventory'}</h2>
          <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {step !== 'success' && (
          <div className={styles.progress}>
            <div className={styles.progressBar}>
              {STEP_ORDER.map((s, index) => (
                <span
                  key={s}
                  className={`${styles.progressSegment} ${index <= STEP_ORDER.indexOf(step as PickStep) ? styles.progressSegmentDone : ''}`}
                />
              ))}
            </div>
            <span className={styles.progressLabel}>
              Step {STEP_ORDER.indexOf(step as PickStep) + 1} of {STEP_ORDER.length} · {STEP_LABEL[step as PickStep]}
            </span>
          </div>
        )}

        <div className={styles.body}>
          {step === 'vehicle' && vehicleMode === 'new' && (
            <AddDonorVehicleForm onCreated={handleVehicleCreated} onCancel={() => setVehicleMode('existing')} />
          )}

          {step === 'vehicle' && vehicleMode === 'existing' && (
            <>
              <div className={styles.searchWrap}>
                <Search size={14} className={styles.searchIcon} />
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search make, model, generation, tag code…"
                  value={vehicleQuery}
                  onChange={(event) => setVehicleQuery(event.target.value)}
                  autoFocus
                />
              </div>

              <button type="button" className={styles.addNewLink} onClick={() => setVehicleMode('new')}>
                Can't find this car? + Add a new vehicle
              </button>

              {vehiclesQuery.isLoading && <p className={styles.status}>Loading vehicles…</p>}
              {vehiclesQuery.isError && <p className={styles.statusError}>Couldn't load vehicles. Try refreshing.</p>}
              {vehiclesQuery.isSuccess && (
                <ul className={styles.list} role="listbox" aria-label="Donor vehicles">
                  {vehicles.map((vehicle) => {
                    const app = vehicle.vehicle_application
                    const meta = [app?.variant, app?.generation_code && `Gen ${app.generation_code}`, `Tag ${vehicle.tag_code}`]
                      .filter(Boolean)
                      .join(' · ')
                    return (
                      <li key={vehicle.id}>
                        <button type="button" className={styles.row} onClick={() => handleSelectVehicle(vehicle)}>
                          <span className={styles.rowThumb}>
                            <LazyImage bucket="car-photos" path={vehicle.photos[0] ?? null} alt="" />
                          </span>
                          <span className={styles.rowBody}>
                            <span className={styles.rowTitleLine}>
                              <span className={styles.rowTitle}>{vehicleTitle(vehicle)}</span>
                              <Badge tone={statusTone(vehicle.status)}>{formatStatus(vehicle.status)}</Badge>
                            </span>
                            <span className={styles.rowMeta}>{meta}</span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                  {vehicles.length === 0 && <li className={styles.empty}>No vehicles match your search.</li>}
                </ul>
              )}
            </>
          )}

          {step === 'part' && (
            <>
              <div className={styles.selectedContext}>
                <span className={styles.selectedContextLabel}>Vehicle</span>
                <span className={styles.selectedContextValue}>
                  {vehicleTitle(selectedVehicle)} · Tag {selectedVehicle?.tag_code}
                </span>
              </div>

              {hasFitment && (
                <div className={styles.tabs} role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activePartTab === 'fits'}
                    className={`${styles.tab} ${activePartTab === 'fits' ? styles.tabActive : ''}`}
                    onClick={() => setPartTab('fits')}
                  >
                    Fits this vehicle <span className={styles.tabCount}>{fitsParts.length}</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activePartTab === 'all'}
                    className={`${styles.tab} ${activePartTab === 'all' ? styles.tabActive : ''}`}
                    onClick={() => setPartTab('all')}
                  >
                    All parts <span className={styles.tabCount}>{allParts.length}</span>
                  </button>
                </div>
              )}
              {!hasFitment && !fitmentQuery.isLoading && selectedVehicle?.vehicle_application && (
                <p className={styles.hint}>No catalogued fitment for this vehicle yet — showing the full parts catalogue.</p>
              )}

              <div className={styles.searchWrap}>
                <Search size={14} className={styles.searchIcon} />
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search part name, category, OEM number…"
                  value={partQuery}
                  onChange={(event) => setPartQuery(event.target.value)}
                  autoFocus
                />
              </div>

              {partCatalogQuery.isLoading && <p className={styles.status}>Loading part catalogue…</p>}
              {partCatalogQuery.isError && <p className={styles.statusError}>Couldn't load the part catalogue. Try refreshing.</p>}
              {partCatalogQuery.isSuccess && (
                <ul className={styles.list} role="listbox" aria-label="Part catalogue">
                  {filteredParts.map((part) => (
                    <li key={part.id}>
                      <button type="button" className={styles.row} onClick={() => handleSelectPart(part)}>
                        <span className={styles.rowBody}>
                          <span className={styles.rowTitleLine}>
                            <span className={styles.rowTitle}>{part.part_type || 'Unnamed part'}</span>
                            {part.side && <Badge tone="neutral">{part.side}</Badge>}
                            {part.superseded_by && <Badge tone="warning">Superseded</Badge>}
                          </span>
                          <span className={styles.rowMeta}>
                            {[part.category, part.primary_oem_number].filter(Boolean).join(' · ') || 'No extra details on file'}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                  {filteredParts.length === 0 && <li className={styles.empty}>No parts match your search.</li>}
                </ul>
              )}
            </>
          )}

          {step === 'photos' && (
            <div className={styles.stepPad}>
              <div className={styles.selectedContext}>
                <span className={styles.selectedContextLabel}>Part</span>
                <span className={styles.selectedContextValue}>{selectedPart?.part_type}</span>
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
                    <img src={photo.previewUrl} alt={`Part photo ${index + 1}`} className={styles.photoImage} />
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
              {photos.length === 0 && (
                <p className={styles.hint}>At least one photo is required — a clear shot builds trust when sharing this part.</p>
              )}
            </div>
          )}

          {step === 'details' && (
            <div className={styles.stepPad}>
              <div className={styles.reviewCard}>
                <div className={styles.reviewRow}>
                  <span className={styles.reviewLabel}>Vehicle</span>
                  <span className={styles.reviewValue}>
                    {vehicleTitle(selectedVehicle)} · Tag {selectedVehicle?.tag_code}
                  </span>
                  <button type="button" className={styles.reviewEdit} onClick={() => setStep('vehicle')}>
                    Change
                  </button>
                </div>
                <div className={styles.reviewRow}>
                  <span className={styles.reviewLabel}>Part</span>
                  <span className={styles.reviewValue}>{selectedPart?.part_type}</span>
                  <button type="button" className={styles.reviewEdit} onClick={() => setStep('part')}>
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

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Item name *</span>
                <input className={styles.fieldInput} value={itemName} onChange={(event) => setItemName(event.target.value)} />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Part number</span>
                <input
                  className={styles.fieldInput}
                  value={partNumber}
                  onChange={(event) => setPartNumber(event.target.value)}
                  placeholder={selectedPart?.primary_oem_number || 'Not set'}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Condition grade *</span>
                <select
                  className={styles.fieldInput}
                  value={conditionGrade}
                  onChange={(event) => setConditionGrade(event.target.value as ConditionGrade)}
                >
                  <option value="" disabled>
                    Select grade
                  </option>
                  <option value="A">A — Excellent</option>
                  <option value="B">B — Good</option>
                  <option value="C">C — Fair</option>
                </select>
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Tested</span>
                <select className={styles.fieldInput} value={tested} onChange={(event) => setTested(event.target.value as TestedValue)}>
                  <option value="unknown">Unknown</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Test notes</span>
                <textarea
                  className={styles.fieldTextarea}
                  rows={2}
                  value={testNotes}
                  onChange={(event) => setTestNotes(event.target.value)}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Paired set</span>
                <input
                  className={styles.fieldInput}
                  value={pairedSetRef}
                  onChange={(event) => setPairedSetRef(event.target.value)}
                  placeholder="Shares a set with another SKU"
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Shelf location *</span>
                <input
                  className={styles.fieldInput}
                  value={shelfLocation}
                  onChange={(event) => setShelfLocation(event.target.value)}
                  placeholder="e.g. Rack 4 – Bin 12"
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Price (₹)</span>
                <input
                  className={styles.fieldInput}
                  type="number"
                  min="0"
                  inputMode="decimal"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
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
              {quantityValid && parsedQuantity > 1 && (
                <p className={styles.hint}>Creates {parsedQuantity} identical inventory rows, each with its own SKU.</p>
              )}
              {!quantityValid && <p className={styles.errorText}>Quantity must be a whole number from 1 to 50.</p>}

              {formError && <p className={styles.errorText}>{formError}</p>}
            </div>
          )}

          {step === 'success' && (
            <div className={styles.success}>
              <div className={styles.successIcon}>
                <Check size={28} strokeWidth={2.5} />
              </div>
              <h3 className={styles.successTitle}>
                {createdItems.length} item{createdItems.length === 1 ? '' : 's'} added
              </h3>
              <div className={styles.successSkus}>
                {createdItems.map((item) => (
                  <span key={item.id} className={styles.skuChip}>
                    {item.sku}
                  </span>
                ))}
              </div>
              <div className={styles.successActions}>
                <button type="button" className={styles.backButton} onClick={handleAddAnother}>
                  Add another part
                </button>
                <button type="button" className={styles.primaryButton} onClick={onClose}>
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {step === 'part' && (
          <div className={styles.footer}>
            <button type="button" className={styles.backButton} onClick={handleBack}>
              <ArrowLeft size={15} />
              Back
            </button>
          </div>
        )}

        {step === 'photos' && (
          <div className={styles.footer}>
            <button type="button" className={styles.backButton} onClick={handleBack}>
              <ArrowLeft size={15} />
              Back
            </button>
            <button type="button" className={styles.primaryButton} onClick={() => setStep('details')} disabled={photos.length === 0}>
              Next
            </button>
          </div>
        )}

        {step === 'details' && (
          <div className={styles.footer}>
            <button type="button" className={styles.backButton} onClick={handleBack} disabled={createInventoryItems.isPending}>
              <ArrowLeft size={15} />
              Back
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleSubmit}
              disabled={createInventoryItems.isPending || !quantityValid}
            >
              {createInventoryItems.isPending
                ? 'Adding…'
                : quantityValid
                  ? `Add ${parsedQuantity} item${parsedQuantity === 1 ? '' : 's'}`
                  : 'Add item'}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
