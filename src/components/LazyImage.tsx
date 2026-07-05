import { useQuery } from '@tanstack/react-query'
import { ImageOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { getSignedPhotoUrl, type PhotoBucket } from '../lib/photos'
import styles from './LazyImage.module.css'

interface LazyImageProps {
  bucket: PhotoBucket
  path: string | null
  alt: string
  className?: string
}

export function LazyImage({ bucket, path, alt, className }: LazyImageProps) {
  const [isInView, setIsInView] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = containerRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const { data: resolvedUrl } = useQuery({
    queryKey: ['photo-url', bucket, path],
    queryFn: () => getSignedPhotoUrl(bucket, path as string),
    enabled: isInView && !!path,
    staleTime: 50 * 60 * 1000,
    gcTime: 55 * 60 * 1000,
  })

  const failed = hasError || resolvedUrl === null
  const showImage = isInView && !!resolvedUrl && !hasError
  const showFallback = isInView && (!path || failed)

  return (
    <div ref={containerRef} className={`${styles.container} ${className ?? ''}`}>
      {!isLoaded && !showFallback && <div className={styles.skeleton} />}
      {showImage && (
        <img
          src={resolvedUrl}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={styles.image}
          style={{ opacity: isLoaded ? 1 : 0 }}
        />
      )}
      {showFallback && (
        <div className={styles.placeholder}>
          <ImageOff size={22} strokeWidth={1.5} />
        </div>
      )}
    </div>
  )
}
