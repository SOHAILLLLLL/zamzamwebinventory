import { useRef, useState } from 'react'
import type { PhotoBucket } from '../lib/photos'
import { LazyImage } from './LazyImage'
import styles from './PhotoGallery.module.css'

interface PhotoGalleryProps {
  bucket: PhotoBucket
  paths: string[]
  alt: string
}

// Swipe past this many px to commit to the next/previous photo, otherwise it springs back.
const SWIPE_THRESHOLD_PX = 50

export function PhotoGallery({ bucket, paths, alt }: PhotoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartXRef = useRef(0)
  const canSwipe = paths.length > 1

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!canSwipe) return
    dragStartXRef.current = event.clientX
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsDragging(true)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return
    setDragX(event.clientX - dragStartXRef.current)
  }

  function handlePointerUp() {
    if (!isDragging) return
    setIsDragging(false)
    if (dragX <= -SWIPE_THRESHOLD_PX && activeIndex < paths.length - 1) {
      setActiveIndex((index) => index + 1)
    } else if (dragX >= SWIPE_THRESHOLD_PX && activeIndex > 0) {
      setActiveIndex((index) => index - 1)
    }
    setDragX(0)
  }

  if (paths.length === 0) {
    return (
      <div className={styles.emptyMain}>
        <LazyImage bucket={bucket} path={null} alt={alt} />
      </div>
    )
  }

  return (
    <div className={styles.gallery}>
      <div
        className={styles.main}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={canSwipe ? { touchAction: 'pan-y', cursor: isDragging ? 'grabbing' : 'grab' } : undefined}
      >
        <div
          className={styles.slide}
          style={{ transform: `translateX(${dragX}px)`, transition: isDragging ? 'none' : undefined }}
        >
          <LazyImage bucket={bucket} path={paths[activeIndex]} alt={`${alt} photo ${activeIndex + 1}`} />
        </div>
        {canSwipe && (
          <span className={styles.counter}>
            {activeIndex + 1} / {paths.length}
          </span>
        )}
      </div>
      {paths.length > 1 && (
        <div className={styles.strip}>
          {paths.map((path, index) => (
            <button
              key={path}
              type="button"
              className={`${styles.thumbButton} ${index === activeIndex ? styles.thumbActive : ''}`}
              onClick={() => setActiveIndex(index)}
              aria-label={`View photo ${index + 1}`}
            >
              <LazyImage bucket={bucket} path={path} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
