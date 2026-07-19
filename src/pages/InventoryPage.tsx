import { ArrowUpDown, Plus, Printer, Tags, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AddPartWizard } from '../components/AddPartWizard'
import { CarCard } from '../components/CarCard'
import { CarDetailModal } from '../components/CarDetailModal'
import { ChunkedGrid } from '../components/ChunkedGrid'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { FloatingTabs, type InventoryTab } from '../components/FloatingTabs'
import { PartCard } from '../components/PartCard'
import { type PartSort, PartsFilterModal } from '../components/PartsFilterModal'
import { PrintLabelsModal } from '../components/PrintLabelsModal'
import { SearchBar } from '../components/SearchBar'
import { SortMenu } from '../components/SortMenu'
import { StatusFilterChips } from '../components/StatusFilterChips'
import { UpdateLocationModal } from '../components/UpdateLocationModal'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useDeleteDonorVehicle } from '../hooks/useDeleteDonorVehicle'
import { DeleteBlockedError, useDeleteInventoryItem } from '../hooks/useDeleteInventoryItem'
import { useDonorVehicles } from '../hooks/useDonorVehicles'
import { useInventoryItems } from '../hooks/useInventoryItems'
import type { DonorVehicleListItem, InventoryListItem } from '../types/db'
import styles from './InventoryPage.module.css'

type CarSort = 'newest' | 'vehicle' | 'dismantling'

const carSortOptions: { value: CarSort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'vehicle', label: 'Sort by vehicle' },
  { value: 'dismantling', label: 'Dismantling cars' },
]

function matchesPartSearch(item: InventoryListItem, query: string) {
  const haystack = [
    item.item_name,
    item.sku,
    item.part_number,
    item.part_catalog?.primary_oem_number,
    item.donor_vehicle?.vehicle_application?.make,
    item.donor_vehicle?.vehicle_application?.model,
    item.donor_vehicle?.tag_code,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(query)
}

function matchesCarSearch(vehicle: DonorVehicleListItem, query: string) {
  const haystack = [
    vehicle.tag_code,
    vehicle.vin,
    vehicle.rc_number,
    vehicle.vehicle_application?.make,
    vehicle.vehicle_application?.model,
    vehicle.vehicle_application?.generation_code,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(query)
}

function interleave<T>(lists: T[][]): T[] {
  const result: T[] = []
  const max = Math.max(0, ...lists.map((list) => list.length))
  for (let i = 0; i < max; i++) {
    for (const list of lists) {
      if (list[i] !== undefined) result.push(list[i])
    }
  }
  return result
}

const FALLBACK_SEARCH_EXAMPLES = ['ABS Sensor', 'Front Bumper', 'Alternator']

export function InventoryPage() {
  const [tab, setTab] = useState<InventoryTab>('parts')
  const [search, setSearch] = useState('')
  const [partSort, setPartSort] = useState<PartSort>('newest')
  const [carSort, setCarSort] = useState<CarSort>('newest')
  const debouncedSearch = useDebouncedValue(search)

  const [selectedCar, setSelectedCar] = useState<DonorVehicleListItem | null>(null)
  const [deletePartTarget, setDeletePartTarget] = useState<InventoryListItem | null>(null)
  const [deleteCarTarget, setDeleteCarTarget] = useState<DonorVehicleListItem | null>(null)
  const [locationEditTarget, setLocationEditTarget] = useState<InventoryListItem | null>(null)
  const [partVehicleIds, setPartVehicleIds] = useState<string[]>([])
  const [partTypeFilter, setPartTypeFilter] = useState<string[]>([])
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [carStatusFilter, setCarStatusFilter] = useState<string | null>(null)
  const [addPartOpen, setAddPartOpen] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [printLabelsItems, setPrintLabelsItems] = useState<InventoryListItem[] | null>(null)

  const navigate = useNavigate()
  const partsQuery = useInventoryItems()
  const carsQuery = useDonorVehicles()
  const deleteInventoryItem = useDeleteInventoryItem()
  const deleteDonorVehicle = useDeleteDonorVehicle()

  const searchExamples = useMemo(() => {
    const items = partsQuery.data ?? []
    const names: string[] = []
    const models: string[] = []
    const codes: string[] = []
    const seenNames = new Set<string>()
    const seenModels = new Set<string>()
    const seenCodes = new Set<string>()

    for (const item of items) {
      if (item.item_name && !seenNames.has(item.item_name) && names.length < 3) {
        seenNames.add(item.item_name)
        names.push(item.item_name)
      }
      const app = item.donor_vehicle?.vehicle_application
      const model = [app?.make, app?.model].filter(Boolean).join(' ')
      if (model && !seenModels.has(model) && models.length < 3) {
        seenModels.add(model)
        models.push(model)
      }
      if (app?.generation_code && !seenCodes.has(app.generation_code) && codes.length < 3) {
        seenCodes.add(app.generation_code)
        codes.push(app.generation_code)
      }
      if (names.length >= 3 && models.length >= 3 && codes.length >= 3) break
    }

    const combined = interleave([names, models, codes])
    return combined.length > 0 ? combined : FALLBACK_SEARCH_EXAMPLES
  }, [partsQuery.data])

  const carStatusOptions = useMemo(() => {
    const statuses = new Set((carsQuery.data ?? []).map((vehicle) => vehicle.status))
    return [...statuses].sort((a, b) => a.localeCompare(b))
  }, [carsQuery.data])

  const filteredSortedParts = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase()
    const items = partsQuery.data ?? []
    let filtered = query ? items.filter((item) => matchesPartSearch(item, query)) : items
    if (partVehicleIds.length > 0) {
      const idSet = new Set(partVehicleIds)
      filtered = filtered.filter((item) => item.donor_vehicle && idSet.has(item.donor_vehicle.id))
    }
    if (partTypeFilter.length > 0) {
      const typeSet = new Set(partTypeFilter)
      filtered = filtered.filter((item) => item.part_catalog?.part_type && typeSet.has(item.part_catalog.part_type))
    }
    const sorted = [...filtered]

    if (partSort === 'part_name') {
      sorted.sort((a, b) => a.item_name.localeCompare(b.item_name))
    } else if (partSort === 'vehicle') {
      sorted.sort((a, b) => {
        const aLabel = `${a.donor_vehicle?.vehicle_application?.make ?? ''} ${a.donor_vehicle?.vehicle_application?.model ?? ''}`
        const bLabel = `${b.donor_vehicle?.vehicle_application?.make ?? ''} ${b.donor_vehicle?.vehicle_application?.model ?? ''}`
        return aLabel.localeCompare(bLabel)
      })
    }

    return sorted
  }, [partsQuery.data, debouncedSearch, partSort, partVehicleIds, partTypeFilter])

  const filteredSortedCars = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase()
    const items = carsQuery.data ?? []
    let filtered = query ? items.filter((vehicle) => matchesCarSearch(vehicle, query)) : items
    if (carStatusFilter) {
      filtered = filtered.filter((vehicle) => vehicle.status === carStatusFilter)
    }
    if (carSort === 'dismantling') {
      filtered = filtered.filter((vehicle) => vehicle.status.toLowerCase() === 'dismantling')
    }
    const sorted = [...filtered]

    if (carSort === 'vehicle' || carSort === 'dismantling') {
      sorted.sort((a, b) => {
        const aLabel = `${a.vehicle_application?.make ?? ''} ${a.vehicle_application?.model ?? ''} ${a.vehicle_application?.generation_code ?? ''}`
        const bLabel = `${b.vehicle_application?.make ?? ''} ${b.vehicle_application?.model ?? ''} ${b.vehicle_application?.generation_code ?? ''}`
        return aLabel.localeCompare(bLabel)
      })
    }

    return sorted
  }, [carsQuery.data, debouncedSearch, carSort, carStatusFilter])

  async function confirmDeletePart() {
    if (!deletePartTarget) return
    await deleteInventoryItem.mutateAsync({ id: deletePartTarget.id, photos: deletePartTarget.photos })
    setDeletePartTarget(null)
  }

  async function confirmDeleteCar() {
    if (!deleteCarTarget) return
    await deleteDonorVehicle.mutateAsync({ id: deleteCarTarget.id, photos: deleteCarTarget.photos })
    setDeleteCarTarget(null)
    setSelectedCar(null)
  }

  function toggleSelectionMode() {
    setSelectionMode((prev) => !prev)
    setSelectedIds(new Set())
  }

  function toggleItemSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSelectAllFiltered() {
    setSelectedIds(new Set(filteredSortedParts.map((item) => item.id)))
  }

  function handlePrintSelected() {
    // Resolve against the full unfiltered list, not filteredSortedParts — a selection made
    // before narrowing the search/filter must still print in full, not silently shrink.
    const items = (partsQuery.data ?? []).filter((item) => selectedIds.has(item.id))
    if (items.length > 0) setPrintLabelsItems(items)
  }

  return (
    <div className={styles.page}>
      <FloatingTabs active={tab} onChange={setTab} />

      <div className={styles.controls}>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={tab === 'parts' ? 'Search parts, SKU, vehicle…' : 'Search cars, tag code, VIN…'}
          examples={tab === 'parts' ? searchExamples : undefined}
        />
        {tab === 'parts' ? (
          <>
            <button
              type="button"
              className={`${styles.sortButton} ${
                partVehicleIds.length > 0 || partTypeFilter.length > 0 ? styles.sortButtonActive : ''
              }`}
              onClick={() => setFilterModalOpen(true)}
              aria-haspopup="dialog"
            >
              <ArrowUpDown size={15} />
              Sort
              {partVehicleIds.length + partTypeFilter.length > 0 && (
                <span className={styles.sortButtonBadge}>{partVehicleIds.length + partTypeFilter.length}</span>
              )}
            </button>
            <button
              type="button"
              className={`${styles.sortButton} ${selectionMode ? styles.sortButtonActive : ''}`}
              onClick={toggleSelectionMode}
            >
              {selectionMode ? <X size={15} /> : <Tags size={15} />}
              {selectionMode ? 'Cancel' : 'Select'}
            </button>
          </>
        ) : (
          <SortMenu value={carSort} onChange={setCarSort} options={carSortOptions} />
        )}
      </div>

      {tab === 'cars' && (
        <StatusFilterChips statuses={carStatusOptions} value={carStatusFilter} onChange={setCarStatusFilter} />
      )}

      {tab === 'parts' && (
        <>
          {partsQuery.isLoading && <p className={styles.status}>Loading parts…</p>}
          {partsQuery.isError && <p className={styles.statusError}>Couldn't load inventory. Try refreshing.</p>}
          {partsQuery.isSuccess && (
            <ChunkedGrid
              items={filteredSortedParts}
              keyFor={(item) => item.id}
              resetKey={`${debouncedSearch}-${partSort}-${partVehicleIds.join(',')}-${partTypeFilter.join(',')}`}
              emptyMessage={
                debouncedSearch || partVehicleIds.length > 0 || partTypeFilter.length > 0
                  ? 'No parts match your search or filters.'
                  : 'No inventory items yet.'
              }
              renderItem={(item) => (
                <PartCard
                  item={item}
                  onOpen={() => navigate(`/items/${item.sku}`)}
                  onDelete={() => setDeletePartTarget(item)}
                  onUpdateLocation={() => setLocationEditTarget(item)}
                  selectionMode={selectionMode}
                  selected={selectedIds.has(item.id)}
                  onToggleSelect={() => toggleItemSelected(item.id)}
                />
              )}
            />
          )}
        </>
      )}

      {tab === 'cars' && (
        <>
          {carsQuery.isLoading && <p className={styles.status}>Loading fleet…</p>}
          {carsQuery.isError && <p className={styles.statusError}>Couldn't load fleet. Try refreshing.</p>}
          {carsQuery.isSuccess && (
            <ChunkedGrid
              items={filteredSortedCars}
              keyFor={(vehicle) => vehicle.id}
              resetKey={`${debouncedSearch}-${carSort}-${carStatusFilter}`}
              emptyMessage={
                debouncedSearch || carStatusFilter ? 'No vehicles match your filters.' : 'No vehicles in fleet yet.'
              }
              renderItem={(vehicle) => (
                <CarCard
                  vehicle={vehicle}
                  onOpen={() => setSelectedCar(vehicle)}
                  onDelete={() => setDeleteCarTarget(vehicle)}
                />
              )}
            />
          )}
        </>
      )}

      {filterModalOpen && (
        <PartsFilterModal
          items={partsQuery.data ?? []}
          initialSort={partSort}
          initialVehicleIds={partVehicleIds}
          initialPartTypes={partTypeFilter}
          onApply={({ sort, vehicleIds, partTypes }) => {
            setPartSort(sort)
            setPartVehicleIds(vehicleIds)
            setPartTypeFilter(partTypes)
            setFilterModalOpen(false)
          }}
          onClose={() => setFilterModalOpen(false)}
        />
      )}

      {locationEditTarget && (
        <UpdateLocationModal item={locationEditTarget} onClose={() => setLocationEditTarget(null)} />
      )}

      {selectedCar && (
        <CarDetailModal
          vehicle={selectedCar}
          onClose={() => setSelectedCar(null)}
          onDelete={() => setDeleteCarTarget(selectedCar)}
        />
      )}

      {deletePartTarget && (
        <ConfirmDialog
          title="Delete this part?"
          description={`"${deletePartTarget.item_name}" and its photos will be permanently removed. This can't be undone.`}
          busy={deleteInventoryItem.isPending}
          errorMessage={
            deleteInventoryItem.error instanceof DeleteBlockedError ? deleteInventoryItem.error.message : null
          }
          onConfirm={confirmDeletePart}
          onCancel={() => {
            setDeletePartTarget(null)
            deleteInventoryItem.reset()
          }}
        />
      )}

      {deleteCarTarget && (
        <ConfirmDialog
          title="Delete this vehicle?"
          description={`"${deleteCarTarget.tag_code}" and its photos will be permanently removed. This can't be undone.`}
          busy={deleteDonorVehicle.isPending}
          errorMessage={
            deleteDonorVehicle.error instanceof DeleteBlockedError ? deleteDonorVehicle.error.message : null
          }
          onConfirm={confirmDeleteCar}
          onCancel={() => {
            setDeleteCarTarget(null)
            deleteDonorVehicle.reset()
          }}
        />
      )}

      {tab === 'parts' && !selectionMode && (
        <button
          type="button"
          className={styles.addPartFab}
          onClick={() => setAddPartOpen(true)}
          aria-label="Add part to inventory"
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      )}

      {tab === 'parts' && selectionMode && (
        <div className={styles.selectionBar}>
          <span className={styles.selectionCount}>{selectedIds.size} selected</span>
          <button type="button" className={styles.selectionAction} onClick={handleSelectAllFiltered}>
            Select all ({filteredSortedParts.length})
          </button>
          <button
            type="button"
            className={styles.selectionPrimary}
            onClick={handlePrintSelected}
            disabled={selectedIds.size === 0}
          >
            <Printer size={15} />
            Print labels
          </button>
        </div>
      )}

      {addPartOpen && <AddPartWizard onClose={() => setAddPartOpen(false)} />}

      {printLabelsItems && <PrintLabelsModal items={printLabelsItems} onClose={() => setPrintLabelsItems(null)} />}
    </div>
  )
}
