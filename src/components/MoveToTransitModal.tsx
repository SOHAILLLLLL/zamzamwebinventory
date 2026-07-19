import { Truck } from 'lucide-react'
import { useState } from 'react'
import { useMoveReplacementToTransit } from '../hooks/useMoveReplacementToTransit'
import type { Replacement } from '../types/db'
import { Modal } from './Modal'
import styles from './MoveToTransitModal.module.css'

interface MoveToTransitModalProps {
  replacement: Replacement
  onClose: () => void
}

export function MoveToTransitModal({ replacement, onClose }: MoveToTransitModalProps) {
  const [transportCompany, setTransportCompany] = useState('')
  const [lrNumber, setLrNumber] = useState('')
  const moveToTransit = useMoveReplacementToTransit()

  const canSubmit = transportCompany.trim().length > 0 && lrNumber.trim().length > 0

  async function handleSubmit() {
    if (!canSubmit) return
    await moveToTransit.mutateAsync({
      id: replacement.id,
      transportCompany: transportCompany.trim(),
      lrNumber: lrNumber.trim(),
    })
    onClose()
  }

  return (
    <Modal title="Move to transit" onClose={onClose}>
      <p className={styles.hint}>
        Dispatching the replacement for <strong>{replacement.item_name}</strong> to{' '}
        <strong>{replacement.customer_name}</strong>. Transport company and LR number are required to track the parcel.
      </p>

      <label className={styles.field}>
        <span>
          Transport company <span className={styles.required}>*</span>
        </span>
        <input
          type="text"
          value={transportCompany}
          onChange={(event) => setTransportCompany(event.target.value)}
          placeholder="e.g. Shree Maruti Courier"
          autoFocus
        />
      </label>

      <label className={styles.field}>
        <span>
          LR number <span className={styles.required}>*</span>
        </span>
        <input
          type="text"
          value={lrNumber}
          onChange={(event) => setLrNumber(event.target.value)}
          placeholder="e.g. LR-48213"
        />
      </label>

      {moveToTransit.isError && <p className={styles.error}>Couldn't update this replacement. Try again.</p>}

      <div className={styles.actions}>
        <button type="button" className={styles.cancelButton} onClick={onClose} disabled={moveToTransit.isPending}>
          Cancel
        </button>
        <button
          type="button"
          className={styles.submitButton}
          onClick={() => void handleSubmit()}
          disabled={!canSubmit || moveToTransit.isPending}
        >
          <Truck size={15} />
          {moveToTransit.isPending ? 'Moving…' : 'Move to transit'}
        </button>
      </div>
    </Modal>
  )
}
