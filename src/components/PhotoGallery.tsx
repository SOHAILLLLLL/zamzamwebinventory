import { useState } from 'react'
import { LazyImage } from './LazyImage'
import styles from './PhotoGallery.module.css'

interface PhotoGalleryProps {
  urls: string[]
  alt: string
}

export function PhotoGallery({ urls, alt }: PhotoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  if (urls.length === 0) {
    return (
      <div className={styles.emptyMain}>
        <LazyImage src={null} alt={alt} />
      </div>
    )
  }

  return (
    <div className={styles.gallery}>
      <div className={styles.main}>
        <LazyImage src={urls[activeIndex]} alt={`${alt} photo ${activeIndex + 1}`} />
      </div>
      {urls.length > 1 && (
        <div className={styles.strip}>
          {urls.map((url, index) => (
            <button
              key={url}
              type="button"
              className={`${styles.thumbButton} ${index === activeIndex ? styles.thumbActive : ''}`}
              onClick={() => setActiveIndex(index)}
              aria-label={`View photo ${index + 1}`}
            >
              <LazyImage src={url} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
