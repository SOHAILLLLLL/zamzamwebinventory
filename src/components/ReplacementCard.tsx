import { CheckCircle2, Tag, Truck, User } from 'lucide-react'
import type { Replacement } from '../types/db'
import { Badge, formatStatus, replacementStatusTone } from './Badge'
import styles from './ReplacementCard.module.css'

interface ReplacementCardProps {
  replacement: Replacement
  onMoveToTransit: () => void
  onMarkCompleted: () => void
}

export function ReplacementCard({ replacement, onMoveToTransit, onMarkCompleted }: ReplacementCardProps) {
  const dateLabel = new Date(replacement.created_at).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const dispatchLine =
    replacement.status !== 'informing_customer' && (replacement.courier_company || replacement.lr_number)
      ? [replacement.courier_company, replacement.lr_number && `LR ${replacement.lr_number}`].filter(Boolean).join(' · ')
      : null

  return (
    <article className={styles.row}>
      <header className={styles.header}>
        <div className={styles.customerBlock}>
          <h3 className={styles.customerName}>
            <User size={13} className={styles.customerIcon} />
            {replacement.customer_name}
          </h3>
          {replacement.customer_mobile && <span className={styles.customerMobile}>{replacement.customer_mobile}</span>}
        </div>

        <div className={styles.headerRight}>
          <span className={styles.date}>{dateLabel}</span>
          <Badge tone={replacementStatusTone(replacement.status)}>{formatStatus(replacement.status)}</Badge>
        </div>
      </header>

      <div className={styles.itemRow}>
        <Tag size={13} className={styles.itemIcon} />
        <span className={styles.itemName}>{replacement.item_name}</span>
        {replacement.item_code && <span className={styles.itemCode}>{replacement.item_code}</span>}
      </div>

      <p className={styles.reason}>
        <span className={styles.reasonLabel}>Reason</span>
        {replacement.reason}
      </p>

      {dispatchLine && (
        <p className={styles.dispatchLine}>
          <Truck size={13} className={styles.itemIcon} />
          {dispatchLine}
        </p>
      )}

      {replacement.status !== 'completed' && (
        <footer className={styles.actions}>
          {replacement.status === 'informing_customer' && (
            <button type="button" className={styles.secondaryAction} onClick={onMoveToTransit}>
              <Truck size={14} />
              Move to transit
            </button>
          )}
          <button type="button" className={styles.completeAction} onClick={onMarkCompleted}>
            <CheckCircle2 size={14} />
            Mark completed
          </button>
        </footer>
      )}
    </article>
  )
}
