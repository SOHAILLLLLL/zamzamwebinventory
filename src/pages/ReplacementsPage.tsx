import { PackageSearch } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ChunkedGrid } from '../components/ChunkedGrid'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { MoveToTransitModal } from '../components/MoveToTransitModal'
import { ReplacementCard } from '../components/ReplacementCard'
import { ReplacementStatsBar, type ReplacementStatus } from '../components/ReplacementStatsBar'
import { SearchBar } from '../components/SearchBar'
import { useCompleteReplacement } from '../hooks/useCompleteReplacement'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useReplacements } from '../hooks/useReplacements'
import type { Replacement } from '../types/db'
import styles from './ReplacementsPage.module.css'

function matchesReplacementSearch(replacement: Replacement, query: string): boolean {
  const haystack = [
    replacement.customer_name,
    replacement.customer_mobile,
    replacement.item_name,
    replacement.item_code,
    replacement.reason,
    replacement.courier_company,
    replacement.lr_number,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(query)
}

function isThisMonth(isoDate: string): boolean {
  const now = new Date()
  const date = new Date(isoDate)
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
}

export function ReplacementsPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [statusFilter, setStatusFilter] = useState<ReplacementStatus | null>(null)
  const [transitTarget, setTransitTarget] = useState<Replacement | null>(null)
  const [completeTarget, setCompleteTarget] = useState<Replacement | null>(null)

  const replacementsQuery = useReplacements()
  const completeReplacement = useCompleteReplacement()

  const counts = useMemo(() => {
    const items = replacementsQuery.data ?? []
    const base: Record<ReplacementStatus, number> = { informing_customer: 0, in_transit: 0, completed: 0 }
    let thisMonth = 0
    for (const item of items) {
      base[item.status as ReplacementStatus] = (base[item.status as ReplacementStatus] ?? 0) + 1
      if (isThisMonth(item.created_at)) thisMonth += 1
    }
    return { total: items.length, byStatus: base, thisMonth }
  }, [replacementsQuery.data])

  const filteredReplacements = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase()
    let items = replacementsQuery.data ?? []
    if (statusFilter) items = items.filter((item) => item.status === statusFilter)
    if (query) items = items.filter((item) => matchesReplacementSearch(item, query))
    return items
  }, [replacementsQuery.data, statusFilter, debouncedSearch])

  async function confirmMarkCompleted() {
    if (!completeTarget) return
    await completeReplacement.mutateAsync(completeTarget.id)
    setCompleteTarget(null)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Replacements</h1>
        <p className={styles.subtitle}>Track replacement items from customer notice through to delivery.</p>
      </div>

      <ReplacementStatsBar
        total={counts.total}
        counts={counts.byStatus}
        thisMonth={counts.thisMonth}
        active={statusFilter}
        onChange={setStatusFilter}
      />

      <div className={styles.controls}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search customer, mobile, item, LR number…" />
      </div>

      {replacementsQuery.isLoading && <p className={styles.status}>Loading replacements…</p>}
      {replacementsQuery.isError && <p className={styles.statusError}>Couldn't load replacements. Try refreshing.</p>}
      {replacementsQuery.isSuccess && filteredReplacements.length === 0 && (
        <div className={styles.empty}>
          <PackageSearch size={32} strokeWidth={1.5} className={styles.emptyIcon} />
          <p>
            {debouncedSearch || statusFilter
              ? 'No replacements match your search or filters.'
              : 'No replacements yet. Flag a sale item as a replacement to see it here.'}
          </p>
        </div>
      )}
      {replacementsQuery.isSuccess && filteredReplacements.length > 0 && (
        <ChunkedGrid
          items={filteredReplacements}
          keyFor={(item) => item.id}
          resetKey={`${debouncedSearch}-${statusFilter}`}
          emptyMessage="No replacements match your search or filters."
          layout="list"
          renderItem={(replacement) => (
            <ReplacementCard
              replacement={replacement}
              onMoveToTransit={() => setTransitTarget(replacement)}
              onMarkCompleted={() => setCompleteTarget(replacement)}
            />
          )}
        />
      )}

      {transitTarget && <MoveToTransitModal replacement={transitTarget} onClose={() => setTransitTarget(null)} />}

      {completeTarget && (
        <ConfirmDialog
          title="Mark as completed?"
          description={`This marks the replacement for "${completeTarget.item_name}" (${completeTarget.customer_name}) as completed. This is the final status and can't be moved back automatically.`}
          confirmLabel="Mark completed"
          busyLabel="Marking…"
          danger={false}
          busy={completeReplacement.isPending}
          onConfirm={() => void confirmMarkCompleted()}
          onCancel={() => {
            setCompleteTarget(null)
            completeReplacement.reset()
          }}
        />
      )}
    </div>
  )
}
