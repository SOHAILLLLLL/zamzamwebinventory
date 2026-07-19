import styles from './Badge.module.css'

export type BadgeTone = 'success' | 'danger' | 'warning' | 'info' | 'neutral'

export function statusTone(status: string): BadgeTone {
  const normalized = status.toLowerCase()
  if (normalized === 'sold') return 'danger'
  if (normalized === 'available' || normalized === 'in_stock') return 'success'
  if (normalized === 'reserved') return 'warning'
  if (normalized === 'dismantling') return 'info'
  return 'neutral'
}

export function replacementStatusTone(status: string): BadgeTone {
  if (status === 'in_transit') return 'warning'
  if (status === 'completed') return 'success'
  return 'info' // informing_customer
}

export function formatStatus(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function Badge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>
}
