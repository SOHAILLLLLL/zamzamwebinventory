import { formatStatus } from './Badge'
import styles from './ReplacementStatsBar.module.css'

export type ReplacementStatus = 'informing_customer' | 'in_transit' | 'completed'

export const REPLACEMENT_STATUSES: ReplacementStatus[] = ['informing_customer', 'in_transit', 'completed']

interface ReplacementStatsBarProps {
  total: number
  counts: Record<ReplacementStatus, number>
  thisMonth: number
  active: ReplacementStatus | null
  onChange: (status: ReplacementStatus | null) => void
}

export function ReplacementStatsBar({ total, counts, thisMonth, active, onChange }: ReplacementStatsBarProps) {
  return (
    <div className={styles.bar} role="tablist" aria-label="Filter replacements by status">
      <button
        type="button"
        role="tab"
        aria-selected={active === null}
        className={`${styles.segment} ${active === null ? styles.segmentActive : ''}`}
        onClick={() => onChange(null)}
      >
        <span className={styles.count}>{total}</span>
        <span className={styles.label}>All</span>
      </button>

      {REPLACEMENT_STATUSES.map((status) => (
        <button
          key={status}
          type="button"
          role="tab"
          aria-selected={active === status}
          className={`${styles.segment} ${active === status ? styles.segmentActive : ''}`}
          onClick={() => onChange(status)}
        >
          <span className={styles.count}>{counts[status]}</span>
          <span className={styles.label}>
            <span className={`${styles.dot} ${styles[`dot-${status}`]}`} aria-hidden="true" />
            {formatStatus(status)}
          </span>
        </button>
      ))}

      <div className={styles.metric}>
        <span className={styles.count}>{thisMonth}</span>
        <span className={styles.label}>This month</span>
      </div>
    </div>
  )
}
