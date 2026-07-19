import { MapPin, MoreVertical, Share2, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import styles from './CardMenu.module.css'

interface CardMenuProps {
  onDelete: () => void
  onSharePdf: () => Promise<void>
  onUpdateLocation?: () => void
}

export function CardMenu({ onDelete, onSharePdf, onUpdateLocation }: CardMenuProps) {
  const [open, setOpen] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [shareError, setShareError] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return

    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  async function handleShare() {
    setSharing(true)
    setShareError(false)
    try {
      await onSharePdf()
      setOpen(false)
    } catch {
      setShareError(true)
    } finally {
      setSharing(false)
    }
  }

  return (
    <div
      ref={rootRef}
      className={styles.root}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className={styles.trigger}
        aria-label="Item options"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className={styles.menu} role="menu">
          <button
            type="button"
            role="menuitem"
            className={styles.menuItem}
            disabled={sharing}
            onClick={handleShare}
          >
            <Share2 size={14} />
            {sharing ? 'Preparing…' : 'Share PDF'}
          </button>
          {shareError && <p className={styles.menuError}>Couldn't generate PDF</p>}
          {onUpdateLocation && (
            <button
              type="button"
              role="menuitem"
              className={styles.menuItem}
              onClick={() => {
                setOpen(false)
                onUpdateLocation()
              }}
            >
              <MapPin size={14} />
              Update location
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            className={styles.deleteItem}
            onClick={() => {
              setOpen(false)
              onDelete()
            }}
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
