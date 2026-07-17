import { MoreVertical, Package, Printer, Trash2, Truck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { SaleListItem } from '../types/db'
import { Badge } from './Badge'
import cardMenuStyles from './CardMenu.module.css'
import styles from './SaleCard.module.css'

interface SaleCardProps {
  sale: SaleListItem
  onOpen: () => void
  onDelete: () => void
  onPrintLabel: () => void
  selectionMode?: boolean
  selected?: boolean
  onToggleSelect?: () => void
}

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

export function SaleCard({ sale, onOpen, onDelete, onPrintLabel, selectionMode, selected, onToggleSelect }: SaleCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const itemCount = sale.sale_item.length
  const customerName = sale.customer?.name || 'Walk-in'
  const dateLabel = new Date(sale.sale_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <article
      className={styles.card}
      onClick={selectionMode ? onToggleSelect : onOpen}
      tabIndex={0}
      role="button"
      aria-pressed={selectionMode ? selected : undefined}
    >
      <div className={styles.topRow}>
        <h3 className={styles.customerName}>{customerName}</h3>
        {selectionMode ? (
          <span className={`${styles.selectCheckbox} ${selected ? styles.selectCheckboxActive : ''}`}>
            {selected && <span className={styles.selectDot} />}
          </span>
        ) : (
          <div ref={rootRef} className={cardMenuStyles.root} onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className={cardMenuStyles.trigger}
              aria-label="Sale options"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((value) => !value)}
            >
              <MoreVertical size={16} />
            </button>
            {menuOpen && (
              <div className={cardMenuStyles.menu} role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className={cardMenuStyles.menuItem}
                  onClick={() => {
                    setMenuOpen(false)
                    onPrintLabel()
                  }}
                >
                  <Printer size={14} />
                  Print label
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={cardMenuStyles.deleteItem}
                  onClick={() => {
                    setMenuOpen(false)
                    onDelete()
                  }}
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <p className={styles.date}>{dateLabel}</p>

      <div className={styles.badgeRow}>
        <Badge tone={sale.is_paid ? 'success' : 'warning'}>{sale.is_paid ? 'Paid' : 'Unpaid'}</Badge>
        <span className={styles.transportTag}>
          {sale.is_carrying ? <Package size={12} /> : <Truck size={12} />}
          {sale.is_carrying ? 'Pickup' : 'Parcel'}
        </span>
      </div>

      <div className={styles.footerRow}>
        <span className={styles.itemCount}>
          {itemCount} item{itemCount === 1 ? '' : 's'}
        </span>
        <span className={styles.total}>{currency.format(sale.total_amount)}</span>
      </div>
    </article>
  )
}
