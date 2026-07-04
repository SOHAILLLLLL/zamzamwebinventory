import { useMemo, useState } from 'react'
import { CarCard } from '../components/CarCard'
import { CarDetailModal } from '../components/CarDetailModal'
import { ChunkedGrid } from '../components/ChunkedGrid'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { FloatingTabs, type InventoryTab } from '../components/FloatingTabs'
import { PartCard } from '../components/PartCard'
import { PartDetailModal } from '../components/PartDetailModal'
import { SearchBar } from '../components/SearchBar'
import { SortMenu } from '../components/SortMenu'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useDeleteDonorVehicle } from '../hooks/useDeleteDonorVehicle'
import { DeleteBlockedError, useDeleteInventoryItem } from '../hooks/useDeleteInventoryItem'
import { useDonorVehicles } from '../hooks/useDonorVehicles'
import { useInventoryItems } from '../hooks/useInventoryItems'
import type { DonorVehicleListItem, InventoryListItem } from '../types/db'
import styles from './InventoryPage.module.css'

type PartSort = 'newest' | 'vehicle' | 'part_name'
type CarSort = 'newest' | 'vehicle'

const partSortOptions: { value: PartSort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'vehicle', label: 'Sort by vehicle' },
  { value: 'part_name', label: 'Sort by part catalogue' },
]

const carSortOptions: { value: CarSort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'vehicle', label: 'Sort by vehicle' },
]

function matchesPartSearch(item: InventoryListItem, query: string) {
  const haystack = [
    item.item_name,
    item.sku,
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

export function InventoryPage() {
  const [tab, setTab] = useState<InventoryTab>('parts')
  const [search, setSearch] = useState('')
  const [partSort, setPartSort] = useState<PartSort>('newest')
  const [carSort, setCarSort] = useState<CarSort>('newest')
  const debouncedSearch = useDebouncedValue(search)

  const [selectedPart, setSelectedPart] = useState<InventoryListItem | null>(null)
  const [selectedCar, setSelectedCar] = useState<DonorVehicleListItem | null>(null)
  const [deletePartTarget, setDeletePartTarget] = useState<InventoryListItem | null>(null)
  const [deleteCarTarget, setDeleteCarTarget] = useState<DonorVehicleListItem | null>(null)

  const partsQuery = useInventoryItems()
  const carsQuery = useDonorVehicles()
  const deleteInventoryItem = useDeleteInventoryItem()
  const deleteDonorVehicle = useDeleteDonorVehicle()

  const filteredSortedParts = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase()
    const items = partsQuery.data ?? []
    const filtered = query ? items.filter((item) => matchesPartSearch(item, query)) : items
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
  }, [partsQuery.data, debouncedSearch, partSort])

  const filteredSortedCars = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase()
    const items = carsQuery.data ?? []
    const filtered = query ? items.filter((vehicle) => matchesCarSearch(vehicle, query)) : items
    const sorted = [...filtered]

    if (carSort === 'vehicle') {
      sorted.sort((a, b) => {
        const aLabel = `${a.vehicle_application?.make ?? ''} ${a.vehicle_application?.model ?? ''}`
        const bLabel = `${b.vehicle_application?.make ?? ''} ${b.vehicle_application?.model ?? ''}`
        return aLabel.localeCompare(bLabel)
      })
    }

    return sorted
  }, [carsQuery.data, debouncedSearch, carSort])

  async function confirmDeletePart() {
    if (!deletePartTarget) return
    await deleteInventoryItem.mutateAsync({ id: deletePartTarget.id, photos: deletePartTarget.photos })
    setDeletePartTarget(null)
    setSelectedPart(null)
  }

  async function confirmDeleteCar() {
    if (!deleteCarTarget) return
    await deleteDonorVehicle.mutateAsync({ id: deleteCarTarget.id, photos: deleteCarTarget.photos })
    setDeleteCarTarget(null)
    setSelectedCar(null)
  }

  return (
    <div className={styles.page}>
      <FloatingTabs active={tab} onChange={setTab} />

      <div className={styles.controls}>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={tab === 'parts' ? 'Search parts, SKU, vehicle…' : 'Search cars, tag code, VIN…'}
        />
        {tab === 'parts' ? (
          <SortMenu value={partSort} onChange={setPartSort} options={partSortOptions} />
        ) : (
          <SortMenu value={carSort} onChange={setCarSort} options={carSortOptions} />
        )}
      </div>

      {tab === 'parts' && (
        <>
          {partsQuery.isLoading && <p className={styles.status}>Loading parts…</p>}
          {partsQuery.isError && <p className={styles.statusError}>Couldn't load inventory. Try refreshing.</p>}
          {partsQuery.isSuccess && (
            <ChunkedGrid
              items={filteredSortedParts}
              keyFor={(item) => item.id}
              resetKey={`${debouncedSearch}-${partSort}`}
              emptyMessage={debouncedSearch ? 'No parts match your search.' : 'No inventory items yet.'}
              renderItem={(item) => (
                <PartCard
                  item={item}
                  onOpen={() => setSelectedPart(item)}
                  onDelete={() => setDeletePartTarget(item)}
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
              resetKey={`${debouncedSearch}-${carSort}`}
              emptyMessage={debouncedSearch ? 'No vehicles match your search.' : 'No vehicles in fleet yet.'}
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

      {selectedPart && (
        <PartDetailModal
          item={selectedPart}
          onClose={() => setSelectedPart(null)}
          onDelete={() => setDeletePartTarget(selectedPart)}
        />
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
    </div>
  )
}
