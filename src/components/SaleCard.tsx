import { MoreVertical, Package, PackageCheck, Printer, Trash2, Truck } from 'lucide-react'
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
  onTogglePacked?: (packed: boolean) => void
  packedPending?: boolean
}

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

export function SaleCard({
  sale,
  onOpen,
  onDelete,
  onPrintLabel,
  selectionMode,
  selected,
  onToggleSelect,
  onTogglePacked,
  packedPending,
}: SaleCardProps) {
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

  const customer = sale.customer
  const customerName = customer?.name || 'Walk-in'
  const address = [customer?.address, customer?.city, customer?.state].filter(Boolean).join(', ')
  const dateLabel = new Date(sale.sale_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const dispatchLine = !sale.is_carrying
    ? [sale.transport_company, sale.lr_number && `LR ${sale.lr_number}`].filter(Boolean).join(' · ')
    : null
  const transportLabel = sale.is_carrying ? 'Pickup' : sale.is_delivered ? 'Out for delivery' : 'Parcel'
  const TransportIcon = sale.is_carrying ? Package : sale.is_delivered ? PackageCheck : Truck

  return (
    <article
      className={styles.row}
      onClick={selectionMode ? onToggleSelect : onOpen}
      tabIndex={0}
      role="button"
      aria-pressed={selectionMode ? selected : undefined}
    >
      <header className={styles.header}>
        <div className={styles.customerBlock}>
          <h3 className={styles.customerName}>{customerName}</h3>
          {customer?.mobile && <span className={styles.customerMobile}>{customer.mobile}</span>}
          {address && <span className={styles.customerAddress}>{address}</span>}
        </div>

        <div className={styles.headerRight}>
          <span className={styles.date}>{dateLabel}</span>
          <div className={styles.badgeGroup}>
            <Badge tone={sale.is_paid ? 'success' : 'warning'}>{sale.is_paid ? 'Paid' : 'Unpaid'}</Badge>
            <span className={styles.transportTag}>
              <TransportIcon size={12} />
              {transportLabel}
            </span>
          </div>

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
      </header>

      {!sale.is_carrying && (
        <div className={styles.dispatchRow}>
          <p className={styles.dispatchLine}>{dispatchLine || 'No transport details yet'}</p>
          {onTogglePacked && (
            <label className={styles.packedToggle} onClick={(event) => event.stopPropagation()}>
              <input
                type="checkbox"
                checked={sale.is_delivered}
                disabled={packedPending}
                onChange={(event) => onTogglePacked(event.target.checked)}
              />
              Packed
            </label>
          )}
        </div>
      )}

      <div className={styles.items}>
        {sale.sale_item.map((item) => (
          <div key={item.id} className={styles.itemRow}>
            <span className={styles.itemDesc}>
              {item.description}
              {item.inventory_item?.sku && <span className={styles.itemSku}> · {item.inventory_item.sku}</span>}
            </span>
            <span className={styles.itemQty}>× {item.quantity}</span>
            <span className={styles.itemPrice}>{currency.format(item.unit_price * item.quantity)}</span>
          </div>
        ))}
      </div>

      <footer className={styles.footer}>
        <span className={styles.notes}>{sale.notes || ''}</span>
        <span className={styles.total}>{currency.format(sale.total_amount)}</span>
      </footer>
    </article>
  )
}
