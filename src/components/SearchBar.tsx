import { Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import styles from './SearchBar.module.css'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Real terms pulled from the current catalogue, e.g. ["ABS Sensor", "BMW X1", "F48"]. */
  examples?: string[]
  examplePrefix?: string
}

const EXAMPLE_INTERVAL_MS = 2400

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search…',
  examples,
  examplePrefix = 'Search',
}: SearchBarProps) {
  const [focused, setFocused] = useState(false)
  const [exampleIndex, setExampleIndex] = useState(0)
  const hasExamples = Boolean(examples && examples.length > 0)
  const showExamples = hasExamples && !value && !focused

  useEffect(() => {
    if (!showExamples || !examples) return
    const id = setInterval(() => {
      setExampleIndex((current) => (current + 1) % examples.length)
    }, EXAMPLE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [showExamples, examples])

  return (
    <div className={styles.wrap}>
      <Search size={16} className={styles.icon} />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={hasExamples ? '' : placeholder}
        className={styles.input}
        aria-label={placeholder}
      />
      {showExamples && examples && (
        <div className={styles.exampleOverlay} aria-hidden="true">
          <span>{examplePrefix} "</span>
          <span key={exampleIndex} className={styles.exampleWord}>
            {examples[exampleIndex]}
          </span>
          <span>"</span>
        </div>
      )}
      {value && (
        <button
          type="button"
          className={styles.clear}
          aria-label="Clear search"
          onClick={() => onChange('')}
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
