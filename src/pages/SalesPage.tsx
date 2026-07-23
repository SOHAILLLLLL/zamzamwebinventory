import { FileDown, Plus, Printer, Receipt, Tags, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ChunkedGrid } from '../components/ChunkedGrid'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { PrintSaleLabelsModal } from '../components/PrintSaleLabelsModal'
import { SaleCard } from '../components/SaleCard'
import { SaleDetailModal } from '../components/SaleDetailModal'
import { SaleFormWizard } from '../components/SaleFormWizard'
import { SalesReportModal } from '../components/SalesReportModal'
import { SearchBar } from '../components/SearchBar'
import { SortMenu } from '../components/SortMenu'
import { StatusFilterChips } from '../components/StatusFilterChips'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useDeleteSale } from '../hooks/useDeleteSale'
import { useSales } from '../hooks/useSales'
import type { SaleListItem } from '../types/db'
import styles from './SalesPage.module.css'

type SaleSort = 'newest' | 'oldest' | 'amount_desc' | 'amount_asc' | 'pickup_first' | 'parcel_first'
type DateFilter = 'today' | 'week' | 'month'

const sortOptions: { value: SaleSort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'amount_desc', label: 'Amount: high to low' },
  { value: 'amount_asc', label: 'Amount: low to high' },
  { value: 'pickup_first', label: 'Type: pickup first' },
  { value: 'parcel_first', label: 'Type: parcel first' },
]

function matchesSaleSearch(sale: SaleListItem, query: string) {
  const haystack = [
    sale.customer?.name,
    sale.customer?.mobile,
    sale.notes,
    sale.transport_company,
    sale.lr_number,
    ...sale.sale_item.map((item) => item.description),
    ...sale.sale_item.map((item) => item.inventory_item?.sku),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(query)
}

function localDateStr(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Rolling windows (not calendar week/month) — simplest definition that avoids
// "which day does the week start on" ambiguity.
function matchesDateFilter(saleDate: string, filter: DateFilter): boolean {
  const today = localDateStr(new Date())
  if (filter === 'today') return saleDate === today

  const windowDays = filter === 'week' ? 7 : 30
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - (windowDays - 1))
  return saleDate >= localDateStr(cutoff)
}

export function SalesPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [paidFilter, setPaidFilter] = useState<'paid' | 'unpaid' | null>(null)
  const [dateFilter, setDateFilter] = useState<DateFilter | null>(null)
  const [sort, setSort] = useState<SaleSort>('newest')

  const [selectedSale, setSelectedSale] = useState<SaleListItem | null>(null)
  const [deleteSaleTarget, setDeleteSaleTarget] = useState<SaleListItem | null>(null)
  const [printSales, setPrintSales] = useState<SaleListItem[] | null>(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [addSaleOpen, setAddSaleOpen] = useState(false)
  const [editSaleTarget, setEditSaleTarget] = useState<SaleListItem | null>(null)
  const [reportOpen, setReportOpen] = useState(false)

  const salesQuery = useSales()
  const deleteSale = useDeleteSale()

  const filteredSortedSales = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase()
    const items = salesQuery.data ?? []
    let filtered = query ? items.filter((sale) => matchesSaleSearch(sale, query)) : items
    if (paidFilter) {
      filtered = filtered.filter((sale) => (paidFilter === 'paid' ? sale.is_paid : !sale.is_paid))
    }
    if (dateFilter) {
      filtered = filtered.filter((sale) => matchesDateFilter(sale.sale_date, dateFilter))
    }

    const sorted = [...filtered]
    if (sort === 'newest') {
      sorted.sort((a, b) => b.sale_date.localeCompare(a.sale_date) || b.created_at.localeCompare(a.created_at))
    } else if (sort === 'oldest') {
      sorted.sort((a, b) => a.sale_date.localeCompare(b.sale_date) || a.created_at.localeCompare(b.created_at))
    } else if (sort === 'amount_desc') {
      sorted.sort((a, b) => b.total_amount - a.total_amount)
    } else if (sort === 'amount_asc') {
      sorted.sort((a, b) => a.total_amount - b.total_amount)
    } else if (sort === 'pickup_first') {
      sorted.sort((a, b) => Number(b.is_carrying) - Number(a.is_carrying) || b.sale_date.localeCompare(a.sale_date))
    } else if (sort === 'parcel_first') {
      sorted.sort((a, b) => Number(a.is_carrying) - Number(b.is_carrying) || b.sale_date.localeCompare(a.sale_date))
    }
    return sorted
  }, [salesQuery.data, debouncedSearch, paidFilter, dateFilter, sort])

  const stats = useMemo(() => {
    const items = salesQuery.data ?? []
    const parcels = items.filter((sale) => !sale.is_carrying).length
    return { total: items.length, pickup: items.length - parcels, parcels }
  }, [salesQuery.data])

  async function confirmDeleteSale() {
    if (!deleteSaleTarget) return
    const inventoryItemIds = deleteSaleTarget.sale_item.map((item) => item.inventory_item_id).filter((id): id is string => !!id)
    await deleteSale.mutateAsync({ id: deleteSaleTarget.id, inventoryItemIds })
    setDeleteSaleTarget(null)
    setSelectedSale(null)
  }

  function toggleSelectionMode() {
    setSelectionMode((prev) => !prev)
    setSelectedIds(new Set())
  }

  function toggleSaleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSelectAllFiltered() {
    setSelectedIds(new Set(filteredSortedSales.map((sale) => sale.id)))
  }

  function handlePrintSelected() {
    const items = (salesQuery.data ?? []).filter((sale) => selectedIds.has(sale.id))
    if (items.length > 0) setPrintSales(items)
  }

  return (
    <div className={styles.page}>
      <div className={styles.controls}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search customer, mobile, item, LR number…" />
        <SortMenu value={sort} onChange={setSort} options={sortOptions} />
        <button
          type="button"
          className={`${styles.sortButton} ${selectionMode ? styles.sortButtonActive : ''}`}
          onClick={toggleSelectionMode}
        >
          {selectionMode ? <X size={15} /> : <Tags size={15} />}
          {selectionMode ? 'Cancel' : 'Select'}
        </button>
        <button type="button" className={styles.sortButton} onClick={() => setReportOpen(true)}>
          <FileDown size={15} />
          Report
        </button>
      </div>

      {salesQuery.isSuccess && (
        <div className={styles.statsRow}>
          <div className={styles.statTile}>
            <span className={styles.statValue}>{stats.total}</span>
            <span className={styles.statLabel}>Total sales</span>
          </div>
          <div className={styles.statTile}>
            <span className={styles.statValue}>{stats.pickup}</span>
            <span className={styles.statLabel}>Pickup</span>
          </div>
          <div className={styles.statTile}>
            <span className={styles.statValue}>{stats.parcels}</span>
            <span className={styles.statLabel}>Parcels</span>
          </div>
        </div>
      )}

      <div className={styles.filterRow}>
        <StatusFilterChips
          statuses={['paid', 'unpaid']}
          value={paidFilter}
          onChange={(value) => setPaidFilter(value as 'paid' | 'unpaid' | null)}
        />
        <StatusFilterChips
          statuses={['today', 'week', 'month']}
          value={dateFilter}
          onChange={(value) => setDateFilter(value as DateFilter | null)}
        />
      </div>

      {salesQuery.isLoading && <p className={styles.status}>Loading sales…</p>}
      {salesQuery.isError && <p className={styles.statusError}>Couldn't load sales. Try refreshing.</p>}
      {salesQuery.isSuccess && filteredSortedSales.length === 0 && (
        <div className={styles.empty}>
          <Receipt size={32} strokeWidth={1.5} className={styles.emptyIcon} />
          <p>{debouncedSearch || paidFilter || dateFilter ? 'No sales match your search or filters.' : 'No sales yet.'}</p>
        </div>
      )}
      {salesQuery.isSuccess && filteredSortedSales.length > 0 && (
        <ChunkedGrid
          items={filteredSortedSales}
          keyFor={(sale) => sale.id}
          resetKey={`${debouncedSearch}-${paidFilter}-${dateFilter}-${sort}`}
          emptyMessage="No sales match your search or filters."
          layout="list"
          renderItem={(sale) => (
            <SaleCard
              sale={sale}
              onOpen={() => setSelectedSale(sale)}
              onDelete={() => setDeleteSaleTarget(sale)}
              onPrintLabel={() => setPrintSales([sale])}
              selectionMode={selectionMode}
              selected={selectedIds.has(sale.id)}
              onToggleSelect={() => toggleSaleSelected(sale.id)}
            />
          )}
        />
      )}

      {selectedSale && (
        <SaleDetailModal
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
          onDelete={() => setDeleteSaleTarget(selectedSale)}
          onPrintLabel={() => setPrintSales([selectedSale])}
          onEdit={() => {
            setEditSaleTarget(selectedSale)
            setSelectedSale(null)
          }}
        />
      )}

      {deleteSaleTarget && (
        <ConfirmDialog
          title="Delete this sale?"
          description={`The sale for "${deleteSaleTarget.customer?.name || 'Walk-in'}" will be removed and any linked inventory items will return to Available. This can't be undone.`}
          busy={deleteSale.isPending}
          onConfirm={confirmDeleteSale}
          onCancel={() => {
            setDeleteSaleTarget(null)
            deleteSale.reset()
          }}
        />
      )}

      {!selectionMode && (
        <button type="button" className={styles.addSaleFab} onClick={() => setAddSaleOpen(true)} aria-label="Add sale">
          <Plus size={22} strokeWidth={2.5} />
        </button>
      )}

      {selectionMode && (
        <div className={styles.selectionBar}>
          <span className={styles.selectionCount}>{selectedIds.size} selected</span>
          <button type="button" className={styles.selectionAction} onClick={handleSelectAllFiltered}>
            Select all ({filteredSortedSales.length})
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

      {printSales && <PrintSaleLabelsModal sales={printSales} onClose={() => setPrintSales(null)} />}

      {addSaleOpen && <SaleFormWizard onClose={() => setAddSaleOpen(false)} />}
      {editSaleTarget && <SaleFormWizard sale={editSaleTarget} onClose={() => setEditSaleTarget(null)} />}

      {reportOpen && <SalesReportModal sales={salesQuery.data ?? []} onClose={() => setReportOpen(false)} />}
    </div>
  )
}
