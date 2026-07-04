import { AlertTriangle } from 'lucide-react'
import styles from './ConfirmDialog.module.css'

interface ConfirmDialogProps {
  title: string
  description: string
  confirmLabel?: string
  danger?: boolean
  busy?: boolean
  errorMessage?: string | null
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Delete',
  danger = true,
  busy = false,
  errorMessage,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.dialog} onClick={(event) => event.stopPropagation()} role="alertdialog" aria-modal="true">
        <div className={styles.iconWrap} data-danger={danger}>
          <AlertTriangle size={20} strokeWidth={2} />
        </div>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.description}>{description}</p>
        {errorMessage && <p className={styles.error}>{errorMessage}</p>}
        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          {!errorMessage && (
            <button type="button" className={styles.confirm} onClick={onConfirm} disabled={busy}>
              {busy ? 'Deleting…' : confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
