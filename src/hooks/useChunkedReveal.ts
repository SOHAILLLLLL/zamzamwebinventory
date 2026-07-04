import { useEffect, useRef, useState } from 'react'

// Reveals items in fixed-size chunks as the user scrolls near the sentinel, so the DOM/image
// requests never spike for large catalogs. Resets to the first chunk whenever `resetKey` changes
// (e.g. a new search term or sort order).
export function useChunkedReveal(totalCount: number, chunkSize: number, resetKey: unknown) {
  const [visibleCount, setVisibleCount] = useState(chunkSize)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setVisibleCount(chunkSize)
  }, [resetKey, chunkSize])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((count) => Math.min(count + chunkSize, totalCount))
        }
      },
      { rootMargin: '600px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [chunkSize, totalCount])

  return { visibleCount: Math.min(visibleCount, totalCount), sentinelRef }
}
