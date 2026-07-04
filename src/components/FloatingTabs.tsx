import { Car, Wrench } from 'lucide-react'
import styles from './FloatingTabs.module.css'

export type InventoryTab = 'parts' | 'cars'

interface FloatingTabsProps {
  active: InventoryTab
  onChange: (tab: InventoryTab) => void
}

const tabs: { id: InventoryTab; label: string; icon: typeof Car }[] = [
  { id: 'parts', label: 'Parts', icon: Wrench },
  { id: 'cars', label: 'Cars', icon: Car },
]

export function FloatingTabs({ active, onChange }: FloatingTabsProps) {
  return (
    <div className={styles.island} role="tablist" aria-label="Inventory view">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={active === id}
          className={`${styles.tab} ${active === id ? styles.active : ''}`}
          onClick={() => onChange(id)}
        >
          <Icon size={16} />
          {label}
        </button>
      ))}
    </div>
  )
}
