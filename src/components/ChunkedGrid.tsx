import type { ReactNode } from 'react'
import { useChunkedReveal } from '../hooks/useChunkedReveal'
import styles from './ChunkedGrid.module.css'

interface ChunkedGridProps<T> {
  items: T[]
  renderItem: (item: T) => ReactNode
  keyFor: (item: T) => string
  resetKey: unknown
  emptyMessage: string
  chunkSize?: number
  /** 'grid' (default) for photo cards; 'list' for full-width rows (e.g. dense ledger rows). */
  layout?: 'grid' | 'list'
}

export function ChunkedGrid<T>({
  items,
  renderItem,
  keyFor,
  resetKey,
  emptyMessage,
  chunkSize = 24,
  layout = 'grid',
}: ChunkedGridProps<T>) {
  const { visibleCount, sentinelRef } = useChunkedReveal(items.length, chunkSize, resetKey)

  if (items.length === 0) {
    return <p className={styles.empty}>{emptyMessage}</p>
  }

  const visibleItems = items.slice(0, visibleCount)

  return (
    <>
      <div className={layout === 'list' ? styles.list : styles.grid}>
        {visibleItems.map((item) => (
          <div key={keyFor(item)}>{renderItem(item)}</div>
        ))}
      </div>
      {visibleCount < items.length && <div ref={sentinelRef} className={styles.sentinel} />}
    </>
  )
}
