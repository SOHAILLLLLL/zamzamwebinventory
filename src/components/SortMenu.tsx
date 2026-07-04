import { ArrowUpDown } from 'lucide-react'
import styles from './SortMenu.module.css'

interface SortOption<T extends string> {
  value: T
  label: string
}

interface SortMenuProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: SortOption<T>[]
}

export function SortMenu<T extends string>({ value, onChange, options }: SortMenuProps<T>) {
  return (
    <div className={styles.wrap}>
      <ArrowUpDown size={15} className={styles.icon} />
      <select
        className={styles.select}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        aria-label="Sort by"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
