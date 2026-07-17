import { Package, Pencil, Printer, Trash2, Truck } from 'lucide-react'
import type { SaleListItem } from '../types/db'
import { Badge } from './Badge'
import { DetailRow, DetailSection } from './DetailRow'
import { Modal } from './Modal'
import styles from './DetailModal.module.css'

interface SaleDetailModalProps {
  sale: SaleListItem
  onClose: () => void
  onDelete: () => void
  onPrintLabel: () => void
  onEdit?: () => void
}

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

export function SaleDetailModal({ sale, onClose, onDelete, onPrintLabel, onEdit }: SaleDetailModalProps) {
  const customer = sale.customer
  const dateLabel = new Date(sale.sale_date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const address = [customer?.address, customer?.city, customer?.state].filter(Boolean).join(', ')

  return (
    <Modal title={customer?.name || 'Walk-in sale'} onClose={onClose}>
      <div className={styles.topRow}>
        <Badge tone={sale.is_paid ? 'success' : 'warning'}>{sale.is_paid ? 'Paid' : 'Unpaid'}</Badge>
        <Badge tone="neutral">
          {sale.is_carrying ? <Package size={11} /> : <Truck size={11} />} {sale.is_carrying ? 'Pickup' : 'Parcel'}
        </Badge>
        {sale.is_cancelled && <Badge tone="danger">Cancelled</Badge>}
        {sale.is_delivered && <Badge tone="info">Delivered</Badge>}
        <div className={styles.actions}>
          <button type="button" className={styles.iconButton} onClick={onPrintLabel} aria-label="Print label">
            <Printer size={14} />
          </button>
          {onEdit && (
            <button type="button" className={styles.editButton} onClick={onEdit}>
              <Pencil size={14} />
              Edit
            </button>
          )}
          <button type="button" className={styles.deleteButton} onClick={onDelete}>
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>

      <DetailSection title="Customer">
        <DetailRow label="Name" value={customer?.name || 'Walk-in'} />
        <DetailRow label="Mobile" value={customer?.mobile || '—'} />
        <DetailRow label="Address" value={address || '—'} />
      </DetailSection>

      <DetailSection title="Sale">
        <DetailRow label="Date" value={dateLabel} />
        <DetailRow label="Notes" value={sale.notes || '—'} />
      </DetailSection>

      {!sale.is_carrying && (
        <DetailSection title="Dispatch">
          <DetailRow label="Transport company" value={sale.transport_company || '—'} />
          <DetailRow label="LR number" value={sale.lr_number || '—'} />
        </DetailSection>
      )}

      <DetailSection title={`Items (${sale.sale_item.length})`}>
        {sale.sale_item.map((item) => (
          <div key={item.id} className={styles.lineItem}>
            <span className={styles.lineItemLabel}>
              {item.description}
              {item.inventory_item?.sku && ` · ${item.inventory_item.sku}`}
              {' × '}
              {item.quantity}
            </span>
            <span className={styles.lineItemPrice}>{currency.format(item.unit_price * item.quantity)}</span>
          </div>
        ))}
      </DetailSection>

      <DetailSection title="Total">
        <DetailRow label="Amount" value={currency.format(sale.total_amount)} />
      </DetailSection>
    </Modal>
  )
}
