import { ChevronDown, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import styles from './FilterDropdown.module.css'

interface FilterDropdownProps {
  label: string
  allLabel?: string
  options: string[]
  value: string | null
  onChange: (value: string | null) => void
}

export function FilterDropdown({ label, allLabel, options, value, onChange }: FilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
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

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return options
    return options.filter((option) => option.toLowerCase().includes(normalized))
  }, [options, query])

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        type="button"
        className={`${styles.trigger} ${value ? styles.triggerActive : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={styles.triggerLabel}>{value ?? label}</span>
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className={styles.panel} role="listbox">
          <div className={styles.searchWrap}>
            <Search size={14} className={styles.searchIcon} />
            <input
              autoFocus
              type="text"
              className={styles.searchInput}
              placeholder={`Search ${label.toLowerCase()}…`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className={styles.optionList}>
            <button
              type="button"
              className={`${styles.option} ${value === null ? styles.optionActive : ''}`}
              onClick={() => {
                onChange(null)
                setOpen(false)
                setQuery('')
              }}
            >
              {allLabel ?? `All ${label.toLowerCase()}`}
            </button>
            {filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={`${styles.option} ${value === option ? styles.optionActive : ''}`}
                onClick={() => {
                  onChange(option)
                  setOpen(false)
                  setQuery('')
                }}
              >
                {option}
              </button>
            ))}
            {filteredOptions.length === 0 && <p className={styles.empty}>No matches</p>}
          </div>
        </div>
      )}
    </div>
  )
}
