import { useState } from 'react'
import { useUpdateInventoryItem } from '../hooks/useUpdateInventoryItem'
import type { InventoryListItem } from '../types/db'
import { Modal } from './Modal'
import styles from './DetailModal.module.css'

interface UpdateLocationModalProps {
  item: InventoryListItem
  onClose: () => void
}

export function UpdateLocationModal({ item, onClose }: UpdateLocationModalProps) {
  const [shelfLocation, setShelfLocation] = useState(item.shelf_location ?? '')
  const updateInventoryItem = useUpdateInventoryItem()

  async function handleSave() {
    try {
      await updateInventoryItem.mutateAsync({
        id: item.id,
        updates: { shelf_location: shelfLocation.trim() || null },
      })
      onClose()
    } catch {
      // handled below via updateInventoryItem.isError
    }
  }

  return (
    <Modal title="Update shelf location" onClose={onClose}>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Shelf location</span>
        <input
          className={styles.fieldInput}
          value={shelfLocation}
          onChange={(event) => setShelfLocation(event.target.value)}
          placeholder="e.g. A1-03"
          autoFocus
        />
      </label>

      {updateInventoryItem.isError && <p className={styles.shareErrorText}>Couldn't save changes. Try again.</p>}

      <div className={styles.topRow}>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
            disabled={updateInventoryItem.isPending}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.saveButton}
            onClick={handleSave}
            disabled={updateInventoryItem.isPending}
          >
            {updateInventoryItem.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
