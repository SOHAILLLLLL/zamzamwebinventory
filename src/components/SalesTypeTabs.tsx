import styles from './SalesTypeTabs.module.css'

export type SalesTab = 'all' | 'pickup' | 'parcel' | 'out_for_delivery'

interface SalesTypeTabsProps {
  counts: Record<SalesTab, number>
  active: SalesTab
  onChange: (tab: SalesTab) => void
}

const TABS: { id: SalesTab; label: string; dot?: 'warning' | 'success' }[] = [
  { id: 'all', label: 'All' },
  { id: 'pickup', label: 'Pickup' },
  { id: 'parcel', label: 'Parcel', dot: 'warning' },
  { id: 'out_for_delivery', label: 'Out for delivery', dot: 'success' },
]

export function SalesTypeTabs({ counts, active, onChange }: SalesTypeTabsProps) {
  return (
    <div className={styles.bar} role="tablist" aria-label="Filter sales by type">
      {TABS.map(({ id, label, dot }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={active === id}
          className={`${styles.tab} ${active === id ? styles.tabActive : ''}`}
          onClick={() => onChange(id)}
        >
          {dot && <span className={`${styles.dot} ${styles[`dot-${dot}`]}`} aria-hidden="true" />}
          {label}
          <span className={styles.count}>({counts[id]})</span>
        </button>
      ))}
    </div>
  )
}
