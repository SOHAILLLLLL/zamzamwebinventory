import { ImageOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import styles from './LazyImage.module.css'

interface LazyImageProps {
  src: string | null
  alt: string
  className?: string
}

export function LazyImage({ src, alt, className }: LazyImageProps) {
  const [isInView, setIsInView] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
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

  return (
    <div ref={containerRef} className={`${styles.container} ${className ?? ''}`}>
      {!isLoaded && <div className={styles.skeleton} />}
      {isInView && src && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          className={styles.image}
          style={{ opacity: isLoaded ? 1 : 0 }}
        />
      )}
      {isInView && !src && (
        <div className={styles.placeholder}>
          <ImageOff size={22} strokeWidth={1.5} />
        </div>
      )}
    </div>
  )
}
