import { formatStatus } from './Badge'
import styles from './StatusFilterChips.module.css'

interface StatusFilterChipsProps {
  statuses: string[]
  value: string | null
  onChange: (value: string | null) => void
}

export function StatusFilterChips({ statuses, value, onChange }: StatusFilterChipsProps) {
  return (
    <div className={styles.row}>
      <button
        type="button"
        className={`${styles.chip} ${value === null ? styles.chipActive : ''}`}
        onClick={() => onChange(null)}
      >
        All
      </button>
      {statuses.map((status) => (
        <button
          key={status}
          type="button"
          className={`${styles.chip} ${value === status ? styles.chipActive : ''}`}
          onClick={() => onChange(status)}
        >
          {formatStatus(status)}
        </button>
      ))}
    </div>
  )
}
