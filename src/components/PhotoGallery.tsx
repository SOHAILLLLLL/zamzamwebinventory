import { useState } from 'react'
import type { PhotoBucket } from '../lib/photos'
import { LazyImage } from './LazyImage'
import styles from './PhotoGallery.module.css'

interface PhotoGalleryProps {
  bucket: PhotoBucket
  paths: string[]
  alt: string
}

export function PhotoGallery({ bucket, paths, alt }: PhotoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  if (paths.length === 0) {
    return (
      <div className={styles.emptyMain}>
        <LazyImage bucket={bucket} path={null} alt={alt} />
      </div>
    )
  }

  return (
    <div className={styles.gallery}>
      <div className={styles.main}>
        <LazyImage bucket={bucket} path={paths[activeIndex]} alt={`${alt} photo ${activeIndex + 1}`} />
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
