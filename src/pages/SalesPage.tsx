import { FileDown, Plus, Printer, Receipt, Tags, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ChunkedGrid } from '../components/ChunkedGrid'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { PrintSaleLabelsModal } from '../components/PrintSaleLabelsModal'
import { SaleCard } from '../components/SaleCard'
import { SaleDetailModal } from '../components/SaleDetailModal'
import { SaleFormWizard } from '../components/SaleFormWizard'
import { SalesReportModal } from '../components/SalesReportModal'
import { SalesTypeTabs, type SalesTab } from '../components/SalesTypeTabs'
import { SearchBar } from '../components/SearchBar'
import { SortMenu } from '../components/SortMenu'
import { StatusFilterChips } from '../components/StatusFilterChips'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useDeleteSale } from '../hooks/useDeleteSale'
import { useSales } from '../hooks/useSales'
import { useSetSaleDelivered } from '../hooks/useSetSaleDelivered'
import type { SaleListItem } from '../types/db'
import styles from './SalesPage.module.css'

type SaleSort = 'newest' | 'oldest' | 'amount_desc' | 'amount_asc'
type DateFilter = 'today' | 'week' | 'month'

const sortOptions: { value: SaleSort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'amount_desc', label: 'Amount: high to low' },
  { value: 'amount_asc', label: 'Amount: low to high' },
]

function matchesSalesTab(sale: SaleListItem, tab: SalesTab): boolean {
  if (tab === 'pickup') return sale.is_carrying
  if (tab === 'parcel') return !sale.is_carrying && !sale.is_delivered
  if (tab === 'out_for_delivery') return !sale.is_carrying && sale.is_delivered
  return true
}

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
  const [tab, setTab] = useState<SalesTab>('all')

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
  const setSaleDelivered = useSetSaleDelivered()

  // Search + paid/unpaid + date filter, but not the type tab — this is the shared base both
  // the tab counts and the tab-filtered list are built from, so counts stay in sync with search.
  const searchAndFilterMatchedSales = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase()
    const items = salesQuery.data ?? []
    let filtered = query ? items.filter((sale) => matchesSaleSearch(sale, query)) : items
    if (paidFilter) {
      filtered = filtered.filter((sale) => (paidFilter === 'paid' ? sale.is_paid : !sale.is_paid))
    }
    if (dateFilter) {
      filtered = filtered.filter((sale) => matchesDateFilter(sale.sale_date, dateFilter))
    }
    return filtered
  }, [salesQuery.data, debouncedSearch, paidFilter, dateFilter])

  const tabCounts = useMemo(() => {
    const counts: Record<SalesTab, number> = { all: 0, pickup: 0, parcel: 0, out_for_delivery: 0 }
    for (const sale of searchAndFilterMatchedSales) {
      counts.all += 1
      if (sale.is_carrying) counts.pickup += 1
      else if (sale.is_delivered) counts.out_for_delivery += 1
      else counts.parcel += 1
    }
    return counts
  }, [searchAndFilterMatchedSales])

  const filteredSortedSales = useMemo(() => {
    const filtered = searchAndFilterMatchedSales.filter((sale) => matchesSalesTab(sale, tab))

    const sorted = [...filtered]
    if (sort === 'newest') {
      sorted.sort((a, b) => b.sale_date.localeCompare(a.sale_date) || b.created_at.localeCompare(a.created_at))
    } else if (sort === 'oldest') {
      sorted.sort((a, b) => a.sale_date.localeCompare(b.sale_date) || a.created_at.localeCompare(b.created_at))
    } else if (sort === 'amount_desc') {
      sorted.sort((a, b) => b.total_amount - a.total_amount)
    } else if (sort === 'amount_asc') {
      sorted.sort((a, b) => a.total_amount - b.total_amount)
    }
    return sorted
  }, [searchAndFilterMatchedSales, tab, sort])

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
        <div className={styles.searchRow}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search customer, mobile, item, LR number…" />
        </div>
        <div className={styles.actionsRow}>
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
      </div>

      <SalesTypeTabs counts={tabCounts} active={tab} onChange={setTab} />

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
          <p>
            {debouncedSearch || paidFilter || dateFilter || tab !== 'all'
              ? 'No sales match your search or filters.'
              : 'No sales yet.'}
          </p>
        </div>
      )}
      {salesQuery.isSuccess && filteredSortedSales.length > 0 && (
        <ChunkedGrid
          items={filteredSortedSales}
          keyFor={(sale) => sale.id}
          resetKey={`${debouncedSearch}-${paidFilter}-${dateFilter}-${sort}-${tab}`}
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
              onTogglePacked={(packed) => setSaleDelivered.mutate({ id: sale.id, delivered: packed })}
              packedPending={setSaleDelivered.isPending && setSaleDelivered.variables?.id === sale.id}
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
