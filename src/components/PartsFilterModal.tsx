import { ArrowUpDown, Car, Check, Search, Wrench, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { InventoryListItem } from '../types/db'
import { Badge } from './Badge'
import styles from './PartsFilterModal.module.css'

export type PartSort = 'newest' | 'vehicle' | 'part_name'

const sortOptions: { value: PartSort; label: string; hint: string }[] = [
  { value: 'newest', label: 'Newest first', hint: 'Recently added items on top' },
  { value: 'vehicle', label: 'Vehicle', hint: 'Group by make & model' },
  { value: 'part_name', label: 'Part catalogue', hint: 'Alphabetical by part name' },
]

interface VehicleOption {
  id: string
  tagCode: string
  make: string | null
  model: string | null
  variant: string | null
  generationCode: string | null
  yearFrom: number | null
  yearTo: number | null
  bodyStyle: string | null
  count: number
}

interface PartTypeOption {
  value: string
  category: string | null
  count: number
}

type Tab = 'sort' | 'vehicles' | 'partTypes'

export interface PartsFilterResult {
  sort: PartSort
  vehicleIds: string[]
  partTypes: string[]
}

interface PartsFilterModalProps {
  items: InventoryListItem[]
  initialSort: PartSort
  initialVehicleIds: string[]
  initialPartTypes: string[]
  onApply: (result: PartsFilterResult) => void
  onClose: () => void
}

function formatYearRange(from: number | null, to: number | null) {
  if (!from && !to) return null
  if (from && to && from !== to) return `${from}–${to}`
  return `${from ?? to}`
}

export function PartsFilterModal({
  items,
  initialSort,
  initialVehicleIds,
  initialPartTypes,
  onApply,
  onClose,
}: PartsFilterModalProps) {
  const [mounted, setMounted] = useState(false)
  const [tab, setTab] = useState<Tab>('vehicles')
  const [sort, setSort] = useState<PartSort>(initialSort)
  const [vehicleIds, setVehicleIds] = useState<Set<string>>(() => new Set(initialVehicleIds))
  const [partTypes, setPartTypes] = useState<Set<string>>(() => new Set(initialPartTypes))
  const [vehicleQuery, setVehicleQuery] = useState('')
  const [partTypeQuery, setPartTypeQuery] = useState('')

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

  const vehicleOptions = useMemo(() => {
    const map = new Map<string, VehicleOption>()
    for (const item of items) {
      const donorVehicle = item.donor_vehicle
      if (!donorVehicle) continue
      const existing = map.get(donorVehicle.id)
      if (existing) {
        existing.count += 1
        continue
      }
      const app = donorVehicle.vehicle_application
      map.set(donorVehicle.id, {
        id: donorVehicle.id,
        tagCode: donorVehicle.tag_code,
        make: app?.make ?? null,
        model: app?.model ?? null,
        variant: app?.variant ?? null,
        generationCode: app?.generation_code ?? null,
        yearFrom: app?.year_from ?? null,
        yearTo: app?.year_to ?? null,
        bodyStyle: app?.body_style ?? null,
        count: 1,
      })
    }
    return [...map.values()].sort((a, b) => {
      const aLabel = `${a.make ?? ''} ${a.model ?? ''}`.trim()
      const bLabel = `${b.make ?? ''} ${b.model ?? ''}`.trim()
      return aLabel.localeCompare(bLabel) || a.tagCode.localeCompare(b.tagCode)
    })
  }, [items])

  const partTypeOptions = useMemo(() => {
    const map = new Map<string, PartTypeOption>()
    for (const item of items) {
      const type = item.part_catalog?.part_type
      if (!type) continue
      const existing = map.get(type)
      if (existing) {
        existing.count += 1
        continue
      }
      map.set(type, { value: type, category: item.part_catalog?.category ?? null, count: 1 })
    }
    return [...map.values()].sort((a, b) => a.value.localeCompare(b.value))
  }, [items])

  const filteredVehicles = useMemo(() => {
    const query = vehicleQuery.trim().toLowerCase()
    if (!query) return vehicleOptions
    return vehicleOptions.filter((option) =>
      [option.make, option.model, option.variant, option.generationCode, option.tagCode]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [vehicleOptions, vehicleQuery])

  const filteredPartTypes = useMemo(() => {
    const query = partTypeQuery.trim().toLowerCase()
    if (!query) return partTypeOptions
    return partTypeOptions.filter((option) =>
      [option.value, option.category].filter(Boolean).join(' ').toLowerCase().includes(query),
    )
  }, [partTypeOptions, partTypeQuery])

  function toggleVehicle(id: string) {
    setVehicleIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function togglePartType(value: string) {
    setPartTypes((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

  function handleClearAll() {
    setSort('newest')
    setVehicleIds(new Set())
    setPartTypes(new Set())
  }

  function handleApply() {
    onApply({ sort, vehicleIds: [...vehicleIds], partTypes: [...partTypes] })
  }

  const totalSelected = vehicleIds.size + partTypes.size
  const canClear = sort !== 'newest' || totalSelected > 0

  return createPortal(
    <div className={`${styles.overlay} ${mounted ? styles.overlayVisible : ''}`} onClick={onClose}>
      <div
        className={`${styles.panel} ${mounted ? styles.panelVisible : ''}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Sort and filter parts"
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Sort &amp; filter</h2>
          <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.body}>
          <nav className={styles.sidebar} aria-label="Filter category">
            <button
              type="button"
              className={`${styles.sidebarItem} ${tab === 'sort' ? styles.sidebarItemActive : ''}`}
              onClick={() => setTab('sort')}
            >
              <ArrowUpDown size={16} />
              <span>Sort</span>
            </button>
            <button
              type="button"
              className={`${styles.sidebarItem} ${tab === 'vehicles' ? styles.sidebarItemActive : ''}`}
              onClick={() => setTab('vehicles')}
            >
              <Car size={16} />
              <span>Vehicles</span>
              {vehicleIds.size > 0 && <span className={styles.sidebarCount}>{vehicleIds.size}</span>}
            </button>
            <button
              type="button"
              className={`${styles.sidebarItem} ${tab === 'partTypes' ? styles.sidebarItemActive : ''}`}
              onClick={() => setTab('partTypes')}
            >
              <Wrench size={16} />
              <span>Part type</span>
              {partTypes.size > 0 && <span className={styles.sidebarCount}>{partTypes.size}</span>}
            </button>
          </nav>

          <div className={styles.content}>
            {tab === 'sort' && (
              <ul className={styles.list} role="listbox" aria-label="Sort order">
                {sortOptions.map((option) => {
                  const selected = sort === option.value
                  return (
                    <li key={option.value}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={`${styles.row} ${selected ? styles.rowActive : ''}`}
                        onClick={() => setSort(option.value)}
                      >
                        <span className={`${styles.radio} ${selected ? styles.radioActive : ''}`} />
                        <span className={styles.rowBody}>
                          <span className={styles.rowTitle}>{option.label}</span>
                          <span className={styles.rowMeta}>{option.hint}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}

            {tab === 'vehicles' && (
              <>
                <div className={styles.searchWrap}>
                  <Search size={14} className={styles.searchIcon} />
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Search make, model, generation…"
                    value={vehicleQuery}
                    onChange={(event) => setVehicleQuery(event.target.value)}
                  />
                </div>
                <ul className={styles.list} role="listbox" aria-label="Vehicles" aria-multiselectable="true">
                  {filteredVehicles.map((option) => {
                    const selected = vehicleIds.has(option.id)
                    const titleLine = [option.make, option.model].filter(Boolean).join(' ') || 'Unidentified vehicle'
                    const metaLine = [
                      option.variant,
                      formatYearRange(option.yearFrom, option.yearTo),
                      option.bodyStyle,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                    return (
                      <li key={option.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          className={`${styles.row} ${selected ? styles.rowActive : ''}`}
                          onClick={() => toggleVehicle(option.id)}
                        >
                          <span className={`${styles.checkbox} ${selected ? styles.checkboxActive : ''}`}>
                            {selected && <Check size={12} strokeWidth={3} />}
                          </span>
                          <span className={styles.rowBody}>
                            <span className={styles.rowTitleLine}>
                              <span className={styles.rowTitle}>{titleLine}</span>
                              {option.generationCode && <Badge tone="neutral">{option.generationCode}</Badge>}
                            </span>
                            <span className={styles.rowMeta}>
                              {[metaLine || 'No spec on file', `Tag ${option.tagCode}`].join(' · ')}
                            </span>
                          </span>
                          <span className={styles.rowCount}>{option.count}</span>
                        </button>
                      </li>
                    )
                  })}
                  {filteredVehicles.length === 0 && <li className={styles.empty}>No vehicles match your search.</li>}
                </ul>
              </>
            )}

            {tab === 'partTypes' && (
              <>
                <div className={styles.searchWrap}>
                  <Search size={14} className={styles.searchIcon} />
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Search part type…"
                    value={partTypeQuery}
                    onChange={(event) => setPartTypeQuery(event.target.value)}
                  />
                </div>
                <ul className={styles.list} role="listbox" aria-label="Part types" aria-multiselectable="true">
                  {filteredPartTypes.map((option) => {
                    const selected = partTypes.has(option.value)
                    return (
                      <li key={option.value}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          className={`${styles.row} ${selected ? styles.rowActive : ''}`}
                          onClick={() => togglePartType(option.value)}
                        >
                          <span className={`${styles.checkbox} ${selected ? styles.checkboxActive : ''}`}>
                            {selected && <Check size={12} strokeWidth={3} />}
                          </span>
                          <span className={styles.rowBody}>
                            <span className={styles.rowTitle}>{option.value}</span>
                            {option.category && <span className={styles.rowMeta}>{option.category}</span>}
                          </span>
                          <span className={styles.rowCount}>{option.count}</span>
                        </button>
                      </li>
                    )
                  })}
                  {filteredPartTypes.length === 0 && (
                    <li className={styles.empty}>No part types match your search.</li>
                  )}
                </ul>
              </>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.clearButton} onClick={handleClearAll} disabled={!canClear}>
            Clear all
          </button>
          <button type="button" className={styles.applyButton} onClick={handleApply}>
            Apply{totalSelected > 0 ? ` (${totalSelected})` : ''}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
