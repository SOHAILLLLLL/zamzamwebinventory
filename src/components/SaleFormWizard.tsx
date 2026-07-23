import { ArrowLeft, Check, Package, Plus, Search, Truck, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useCreateCustomer } from '../hooks/useCreateCustomer'
import type { SaleLineInput } from '../hooks/useCreateSale'
import { useCreateSale } from '../hooks/useCreateSale'
import { useCustomers } from '../hooks/useCustomers'
import { useInventoryItems } from '../hooks/useInventoryItems'
import { useUpdateSale } from '../hooks/useUpdateSale'
import type { CustomerSummary, InventoryListItem, SaleListItem } from '../types/db'
import wizardStyles from './AddPartWizard.module.css'
import styles from './SaleFormWizard.module.css'

type Step = 'type' | 'customer' | 'items' | 'details' | 'review' | 'success'
type PickStep = Exclude<Step, 'success'>

interface DraftLine {
  key: string
  inventoryItemId: string | null
  itemName: string | null
  sku: string | null
  description: string
  quantity: number
  unitPrice: number
  isReplacement: boolean
  replacementReason: string
}

interface SaleFormWizardProps {
  sale?: SaleListItem
  onClose: () => void
}

const STEP_ORDER: PickStep[] = ['type', 'customer', 'items', 'details', 'review']
const STEP_LABEL: Record<PickStep, string> = {
  type: 'Pickup or parcel?',
  customer: 'Choose the customer',
  items: 'Add items',
  details: 'Sale details',
  review: 'Review & confirm',
}

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

// Date.toISOString() is UTC — for IST (UTC+5:30), that misreports "today" as yesterday
// between midnight and 5:30am local time. Build the date string from local components instead.
function todayStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function matchesCustomerSearch(customer: CustomerSummary, query: string) {
  const haystack = [customer.name, customer.mobile, customer.city].filter(Boolean).join(' ').toLowerCase()
  return haystack.includes(query)
}

function matchesInventorySearch(item: InventoryListItem, query: string) {
  const haystack = [item.sku, item.item_name, item.part_catalog?.part_type, item.part_catalog?.primary_oem_number, item.donor_vehicle?.tag_code]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(query)
}

function customerTitle(customer: CustomerSummary | null): string {
  return customer?.name || 'Walk-in'
}

export function SaleFormWizard({ sale, onClose }: SaleFormWizardProps) {
  const isEditMode = !!sale
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState<Step>(isEditMode ? 'review' : 'type')

  const [customerMode, setCustomerMode] = useState<'walkin' | 'existing' | 'new'>(sale?.customer ? 'existing' : 'walkin')
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(sale?.customer ?? null)
  const [customerQuery, setCustomerQuery] = useState('')
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerMobile, setNewCustomerMobile] = useState('')
  const [newCustomerCity, setNewCustomerCity] = useState('')
  const [newCustomerState, setNewCustomerState] = useState('')
  const [newCustomerAddress, setNewCustomerAddress] = useState('')
  const [customerFormError, setCustomerFormError] = useState<string | null>(null)

  const [itemTab, setItemTab] = useState<'inventory' | 'manual'>('inventory')
  const [itemQuery, setItemQuery] = useState('')
  const [manualDescription, setManualDescription] = useState('')
  const [manualPrice, setManualPrice] = useState('')
  const [lines, setLines] = useState<DraftLine[]>(() =>
    (sale?.sale_item ?? []).map((item) => ({
      key: item.id,
      inventoryItemId: item.inventory_item_id,
      itemName: item.inventory_item?.item_name ?? null,
      sku: item.inventory_item?.sku ?? null,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      isReplacement: false,
      replacementReason: '',
    })),
  )
  // Captured once at open — the set of inventory items this sale originally touched, so an
  // edit can diff old vs new and revert/flip inventory_item.status correctly.
  const [previousInventoryItemIds] = useState<string[]>(
    () => (sale?.sale_item ?? []).map((item) => item.inventory_item_id).filter((id): id is string => !!id),
  )

  const [saleDate, setSaleDate] = useState(sale?.sale_date ?? todayStr())
  const [isPaid, setIsPaid] = useState(sale?.is_paid ?? false)
  const [isCarrying, setIsCarrying] = useState(sale?.is_carrying ?? true)
  const [transportCompany, setTransportCompany] = useState(sale?.transport_company ?? '')
  const [lrNumber, setLrNumber] = useState(sale?.lr_number ?? '')
  const [notes, setNotes] = useState(sale?.notes ?? '')
  const [formError, setFormError] = useState<string | null>(null)

  const customersQuery = useCustomers()
  const inventoryQuery = useInventoryItems()
  const createCustomer = useCreateCustomer()
  const createSale = useCreateSale()
  const updateSale = useUpdateSale()
  const saving = createSale.isPending || updateSale.isPending

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

  const customers = useMemo(() => {
    const list = customersQuery.data ?? []
    const query = customerQuery.trim().toLowerCase()
    return query ? list.filter((customer) => matchesCustomerSearch(customer, query)) : list
  }, [customersQuery.data, customerQuery])

  const linkedInventoryIds = useMemo(() => new Set(lines.map((line) => line.inventoryItemId).filter(Boolean)), [lines])

  const availableInventory = useMemo(() => {
    const all = inventoryQuery.data ?? []
    return all.filter((item) => item.status === 'available' && !linkedInventoryIds.has(item.id))
  }, [inventoryQuery.data, linkedInventoryIds])

  const filteredInventory = useMemo(() => {
    const query = itemQuery.trim().toLowerCase()
    return query ? availableInventory.filter((item) => matchesInventorySearch(item, query)) : availableInventory
  }, [availableInventory, itemQuery])

  const totalAmount = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)

  function handleSelectType(pickup: boolean) {
    setIsCarrying(pickup)
    setStep('customer')
  }

  function handleSelectCustomer(customer: CustomerSummary) {
    setSelectedCustomer(customer)
    setCustomerMode('existing')
    setStep('items')
  }

  function handleSkipCustomer() {
    setSelectedCustomer(null)
    setCustomerMode('walkin')
    setStep('items')
  }

  async function handleCreateCustomer() {
    const name = newCustomerName.trim()
    if (!name) {
      setCustomerFormError('Customer name is required.')
      return
    }
    setCustomerFormError(null)
    try {
      const created = await createCustomer.mutateAsync({
        name,
        mobile: newCustomerMobile.trim() || null,
        state: newCustomerState.trim() || null,
        city: newCustomerCity.trim() || null,
        address: newCustomerAddress.trim() || null,
      })
      setSelectedCustomer(created)
      setCustomerMode('existing')
      setStep('items')
    } catch {
      setCustomerFormError("Couldn't add this customer. Try again.")
    }
  }

  function addInventoryLine(item: InventoryListItem) {
    setLines((prev) => [
      ...prev,
      {
        key: item.id,
        inventoryItemId: item.id,
        itemName: item.item_name,
        sku: item.sku,
        description: `${item.part_catalog?.part_type ?? item.item_name} (${item.sku})`,
        quantity: 1,
        unitPrice: item.price ?? 0,
        isReplacement: false,
        replacementReason: '',
      },
    ])
  }

  function addManualLine() {
    const description = manualDescription.trim()
    if (!description) return
    setLines((prev) => [
      ...prev,
      {
        key: `manual-${Date.now()}-${prev.length}`,
        inventoryItemId: null,
        itemName: null,
        sku: null,
        description,
        quantity: 1,
        unitPrice: Number(manualPrice) || 0,
        isReplacement: false,
        replacementReason: '',
      },
    ])
    setManualDescription('')
    setManualPrice('')
  }

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)))
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((line) => line.key !== key))
  }

  function handleBack() {
    const index = STEP_ORDER.indexOf(step as PickStep)
    if (index > 0) setStep(STEP_ORDER[index - 1])
  }

  async function handleSubmit() {
    if (lines.length === 0) {
      setFormError('Add at least one item to this sale.')
      return
    }
    const missingReason = lines.find((line) => line.isReplacement && !line.replacementReason.trim())
    if (missingReason) {
      setFormError(`"${missingReason.description}" is flagged as a replacement but has no reason.`)
      return
    }

    setFormError(null)

    const lineInputs: SaleLineInput[] = lines.map((line) => ({
      inventoryItemId: line.inventoryItemId,
      itemName: line.itemName,
      sku: line.sku,
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      notes: null,
      isReplacement: line.isReplacement,
      replacementReason: line.replacementReason || null,
    }))

    try {
      if (isEditMode && sale) {
        await updateSale.mutateAsync({
          id: sale.id,
          previousInventoryItemIds,
          customerId: selectedCustomer?.id ?? null,
          saleDate,
          isPaid,
          isCarrying,
          transportCompany: transportCompany.trim() || null,
          lrNumber: lrNumber.trim() || null,
          notes: notes.trim() || null,
          lines: lineInputs,
        })
        onClose()
      } else {
        await createSale.mutateAsync({
          customerId: selectedCustomer?.id ?? null,
          customerName: selectedCustomer?.name ?? null,
          customerMobile: selectedCustomer?.mobile ?? null,
          saleDate,
          isPaid,
          isCarrying,
          transportCompany: transportCompany.trim() || null,
          lrNumber: lrNumber.trim() || null,
          notes: notes.trim() || null,
          lines: lineInputs,
        })
        setStep('success')
      }
    } catch {
      setFormError(`Couldn't ${isEditMode ? 'save changes to' : 'record'} this sale. Try again.`)
    }
  }

  const stepIndex = STEP_ORDER.indexOf(step as PickStep)

  return (
    <div className={`${wizardStyles.overlay} ${mounted ? wizardStyles.overlayVisible : ''}`} onClick={onClose}>
      <div
        className={`${wizardStyles.panel} ${mounted ? wizardStyles.panelVisible : ''}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={isEditMode ? 'Edit sale' : 'Add sale'}
      >
        <div className={wizardStyles.header}>
          <h2 className={wizardStyles.title}>
            {step === 'success' ? 'Sale recorded' : isEditMode ? 'Edit sale' : 'Add sale'}
          </h2>
          <button type="button" className={wizardStyles.close} aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {step !== 'success' && (
          <div className={wizardStyles.progress}>
            <div className={wizardStyles.progressBar}>
              {STEP_ORDER.map((s, index) => (
                <span
                  key={s}
                  className={`${wizardStyles.progressSegment} ${index <= stepIndex ? wizardStyles.progressSegmentDone : ''}`}
                />
              ))}
            </div>
            <span className={wizardStyles.progressLabel}>
              Step {stepIndex + 1} of {STEP_ORDER.length} · {STEP_LABEL[step as PickStep]}
            </span>
          </div>
        )}

        <div className={wizardStyles.body}>
          {step === 'type' && (
            <div className={wizardStyles.stepPad}>
              <div className={styles.typeOptions}>
                <button
                  type="button"
                  className={`${styles.typeOption} ${isCarrying ? styles.typeOptionActive : ''}`}
                  onClick={() => handleSelectType(true)}
                >
                  <Package size={22} />
                  <span>Customer pickup</span>
                </button>
                <button
                  type="button"
                  className={`${styles.typeOption} ${!isCarrying ? styles.typeOptionActive : ''}`}
                  onClick={() => handleSelectType(false)}
                >
                  <Truck size={22} />
                  <span>Parcel / transport</span>
                </button>
              </div>
            </div>
          )}

          {step === 'customer' && (
            <>
              <div className={wizardStyles.searchWrap}>
                <Search size={14} className={wizardStyles.searchIcon} />
                <input
                  type="text"
                  className={wizardStyles.searchInput}
                  placeholder="Search customer name, mobile…"
                  value={customerQuery}
                  onChange={(event) => setCustomerQuery(event.target.value)}
                  autoFocus
                />
              </div>

              <div className={styles.customerQuickActions}>
                <button type="button" className={styles.quickActionButton} onClick={handleSkipCustomer}>
                  Walk-in (no customer)
                </button>
                <button
                  type="button"
                  className={styles.quickActionButton}
                  onClick={() => setCustomerMode((mode) => (mode === 'new' ? 'existing' : 'new'))}
                >
                  <Plus size={13} />
                  New customer
                </button>
              </div>

              {customerMode === 'new' ? (
                <div className={wizardStyles.stepPad}>
                  <label className={wizardStyles.field}>
                    <span className={wizardStyles.fieldLabel}>Name *</span>
                    <input className={wizardStyles.fieldInput} value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} />
                  </label>
                  <label className={wizardStyles.field}>
                    <span className={wizardStyles.fieldLabel}>Mobile</span>
                    <input className={wizardStyles.fieldInput} value={newCustomerMobile} onChange={(e) => setNewCustomerMobile(e.target.value)} />
                  </label>
                  <label className={wizardStyles.field}>
                    <span className={wizardStyles.fieldLabel}>City</span>
                    <input className={wizardStyles.fieldInput} value={newCustomerCity} onChange={(e) => setNewCustomerCity(e.target.value)} />
                  </label>
                  <label className={wizardStyles.field}>
                    <span className={wizardStyles.fieldLabel}>State</span>
                    <input className={wizardStyles.fieldInput} value={newCustomerState} onChange={(e) => setNewCustomerState(e.target.value)} />
                  </label>
                  <label className={wizardStyles.field}>
                    <span className={wizardStyles.fieldLabel}>Address</span>
                    <input className={wizardStyles.fieldInput} value={newCustomerAddress} onChange={(e) => setNewCustomerAddress(e.target.value)} />
                  </label>
                  {customerFormError && <p className={wizardStyles.errorText}>{customerFormError}</p>}
                  <div className={wizardStyles.formActions}>
                    <button type="button" className={wizardStyles.backButton} onClick={() => setCustomerMode('existing')}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className={wizardStyles.primaryButton}
                      onClick={handleCreateCustomer}
                      disabled={createCustomer.isPending}
                    >
                      {createCustomer.isPending ? 'Adding…' : 'Add & continue'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {customersQuery.isLoading && <p className={wizardStyles.status}>Loading customers…</p>}
                  {customersQuery.isError && <p className={wizardStyles.statusError}>Couldn't load customers.</p>}
                  {customersQuery.isSuccess && (
                    <ul className={wizardStyles.list} role="listbox" aria-label="Customers">
                      {customers.map((customer) => (
                        <li key={customer.id}>
                          <button type="button" className={wizardStyles.row} onClick={() => handleSelectCustomer(customer)}>
                            <span className={wizardStyles.rowBody}>
                              <span className={wizardStyles.rowTitle}>{customer.name}</span>
                              <span className={wizardStyles.rowMeta}>
                                {[customer.mobile, customer.city].filter(Boolean).join(' · ') || 'No extra details'}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                      {customers.length === 0 && <li className={wizardStyles.empty}>No customers match your search.</li>}
                    </ul>
                  )}
                </>
              )}
            </>
          )}

          {step === 'items' && (
            <div className={wizardStyles.stepPad}>
              <div className={styles.itemTabs}>
                <button
                  type="button"
                  className={`${wizardStyles.tab} ${itemTab === 'inventory' ? wizardStyles.tabActive : ''}`}
                  onClick={() => setItemTab('inventory')}
                >
                  From inventory
                </button>
                <button
                  type="button"
                  className={`${wizardStyles.tab} ${itemTab === 'manual' ? wizardStyles.tabActive : ''}`}
                  onClick={() => setItemTab('manual')}
                >
                  Manual item
                </button>
              </div>

              {itemTab === 'inventory' ? (
                <>
                  <div className={wizardStyles.searchWrap}>
                    <Search size={14} className={wizardStyles.searchIcon} />
                    <input
                      type="text"
                      className={wizardStyles.searchInput}
                      placeholder="Search SKU, part name, tag code…"
                      value={itemQuery}
                      onChange={(event) => setItemQuery(event.target.value)}
                    />
                  </div>
                  {inventoryQuery.isLoading && <p className={wizardStyles.status}>Loading inventory…</p>}
                  {inventoryQuery.isError && <p className={wizardStyles.statusError}>Couldn't load inventory.</p>}
                  {inventoryQuery.isSuccess && (
                    <ul className={styles.inventoryList}>
                      {filteredInventory.slice(0, 50).map((item) => (
                        <li key={item.id}>
                          <button type="button" className={wizardStyles.row} onClick={() => addInventoryLine(item)}>
                            <span className={wizardStyles.rowBody}>
                              <span className={wizardStyles.rowTitle}>{item.item_name}</span>
                              <span className={wizardStyles.rowMeta}>
                                {item.sku} · {item.price != null ? currency.format(item.price) : 'No price set'}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                      {filteredInventory.length === 0 && <li className={wizardStyles.empty}>No available items match your search.</li>}
                    </ul>
                  )}
                </>
              ) : (
                <div className={styles.manualForm}>
                  <label className={wizardStyles.field}>
                    <span className={wizardStyles.fieldLabel}>Description *</span>
                    <input
                      className={wizardStyles.fieldInput}
                      value={manualDescription}
                      onChange={(event) => setManualDescription(event.target.value)}
                    />
                  </label>
                  <label className={wizardStyles.field}>
                    <span className={wizardStyles.fieldLabel}>Price (₹)</span>
                    <input
                      className={wizardStyles.fieldInput}
                      type="number"
                      min="0"
                      value={manualPrice}
                      onChange={(event) => setManualPrice(event.target.value)}
                    />
                  </label>
                  <button type="button" className={wizardStyles.primaryButton} onClick={addManualLine}>
                    <Plus size={14} />
                    Add line
                  </button>
                </div>
              )}

              <div className={styles.linesHeader}>
                <span>Items in this sale ({lines.length})</span>
                <span className={styles.linesTotal}>{currency.format(totalAmount)}</span>
              </div>

              {lines.length === 0 && <p className={wizardStyles.hint}>No items added yet — pick one above.</p>}

              <div className={styles.lineList}>
                {lines.map((line) => (
                  <div key={line.key} className={styles.lineCard}>
                    <div className={styles.lineTop}>
                      <span className={styles.lineDescription}>{line.description}</span>
                      <button type="button" className={styles.lineRemove} aria-label="Remove item" onClick={() => removeLine(line.key)}>
                        <X size={13} />
                      </button>
                    </div>
                    <div className={styles.lineControls}>
                      <div className={wizardStyles.quantityStepper}>
                        <button type="button" onClick={() => updateLine(line.key, { quantity: Math.max(1, line.quantity - 1) })}>
                          −
                        </button>
                        <input
                          className={wizardStyles.quantityInput}
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(event) => updateLine(line.key, { quantity: Math.max(1, Number(event.target.value) || 1) })}
                        />
                        <button type="button" onClick={() => updateLine(line.key, { quantity: line.quantity + 1 })}>
                          +
                        </button>
                      </div>
                      <input
                        className={styles.linePriceInput}
                        type="number"
                        min="0"
                        value={line.unitPrice}
                        onChange={(event) => updateLine(line.key, { unitPrice: Number(event.target.value) || 0 })}
                      />
                      <span className={styles.lineTotal}>{currency.format(line.unitPrice * line.quantity)}</span>
                    </div>
                    {!isEditMode && (
                      <label className={styles.replacementRow}>
                        <input
                          type="checkbox"
                          checked={line.isReplacement}
                          onChange={(event) => updateLine(line.key, { isReplacement: event.target.checked })}
                        />
                        Replace?
                      </label>
                    )}
                    {!isEditMode && line.isReplacement && (
                      <input
                        className={styles.replacementReasonInput}
                        placeholder="Reason for replacement"
                        value={line.replacementReason}
                        onChange={(event) => updateLine(line.key, { replacementReason: event.target.value })}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'details' && (
            <div className={wizardStyles.stepPad}>
              <label className={wizardStyles.field}>
                <span className={wizardStyles.fieldLabel}>Sale date</span>
                <input className={wizardStyles.fieldInput} type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
              </label>

              <label className={styles.toggleRow}>
                <span>Paid</span>
                <input type="checkbox" checked={isPaid} onChange={(event) => setIsPaid(event.target.checked)} />
              </label>

              {!isCarrying && (
                <>
                  <label className={wizardStyles.field}>
                    <span className={wizardStyles.fieldLabel}>Transport company</span>
                    <input className={wizardStyles.fieldInput} value={transportCompany} onChange={(e) => setTransportCompany(e.target.value)} />
                  </label>
                  <label className={wizardStyles.field}>
                    <span className={wizardStyles.fieldLabel}>LR number</span>
                    <input className={wizardStyles.fieldInput} value={lrNumber} onChange={(e) => setLrNumber(e.target.value)} />
                  </label>
                </>
              )}

              <label className={wizardStyles.field}>
                <span className={wizardStyles.fieldLabel}>Notes</span>
                <textarea className={wizardStyles.fieldTextarea} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </label>
            </div>
          )}

          {step === 'review' && (
            <div className={wizardStyles.stepPad}>
              <div className={wizardStyles.reviewCard}>
                <div className={wizardStyles.reviewRow}>
                  <span className={wizardStyles.reviewLabel}>Type</span>
                  <span className={wizardStyles.reviewValue}>{isCarrying ? 'Pickup' : 'Parcel'}</span>
                  <button type="button" className={wizardStyles.reviewEdit} onClick={() => setStep('type')}>
                    Change
                  </button>
                </div>
                <div className={wizardStyles.reviewRow}>
                  <span className={wizardStyles.reviewLabel}>Customer</span>
                  <span className={wizardStyles.reviewValue}>{customerTitle(selectedCustomer)}</span>
                  <button type="button" className={wizardStyles.reviewEdit} onClick={() => setStep('customer')}>
                    Change
                  </button>
                </div>
                <div className={wizardStyles.reviewRow}>
                  <span className={wizardStyles.reviewLabel}>Items</span>
                  <span className={wizardStyles.reviewValue}>
                    {lines.length} item{lines.length === 1 ? '' : 's'} · {currency.format(totalAmount)}
                  </span>
                  <button type="button" className={wizardStyles.reviewEdit} onClick={() => setStep('items')}>
                    Change
                  </button>
                </div>
                <div className={wizardStyles.reviewRow}>
                  <span className={wizardStyles.reviewLabel}>Details</span>
                  <span className={wizardStyles.reviewValue}>
                    {new Date(saleDate).toLocaleDateString('en-IN')} · {isPaid ? 'Paid' : 'Unpaid'}
                  </span>
                  <button type="button" className={wizardStyles.reviewEdit} onClick={() => setStep('details')}>
                    Change
                  </button>
                </div>
              </div>

              <div className={styles.lineList}>
                {lines.map((line) => (
                  <div key={line.key} className={styles.reviewLineRow}>
                    <span>
                      {line.description} × {line.quantity}
                      {line.isReplacement && <span className={styles.replacementBadge}>Replace</span>}
                    </span>
                    <span>{currency.format(line.unitPrice * line.quantity)}</span>
                  </div>
                ))}
              </div>

              {formError && <p className={wizardStyles.errorText}>{formError}</p>}
            </div>
          )}

          {step === 'success' && (
            <div className={wizardStyles.success}>
              <div className={wizardStyles.successIcon}>
                <Check size={28} strokeWidth={2.5} />
              </div>
              <h3 className={wizardStyles.successTitle}>Sale recorded — {currency.format(totalAmount)}</h3>
              <div className={wizardStyles.successActions}>
                <button type="button" className={wizardStyles.primaryButton} onClick={onClose}>
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {step !== 'success' && (
          <div className={wizardStyles.footer}>
            {step !== 'type' ? (
              <button type="button" className={wizardStyles.backButton} onClick={handleBack} disabled={saving}>
                <ArrowLeft size={15} />
                Back
              </button>
            ) : (
              <span />
            )}
            {step === 'review' ? (
              <button type="button" className={wizardStyles.primaryButton} onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving…' : isEditMode ? 'Save changes' : 'Record sale'}
              </button>
            ) : (
              step !== 'customer' && step !== 'type' && (
                <button
                  type="button"
                  className={wizardStyles.primaryButton}
                  onClick={() => setStep(STEP_ORDER[stepIndex + 1])}
                  disabled={step === 'items' && lines.length === 0}
                >
                  Next
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}
