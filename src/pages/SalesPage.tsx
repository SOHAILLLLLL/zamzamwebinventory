import { Receipt } from 'lucide-react'
import styles from './SalesPage.module.css'

export function SalesPage() {
  return (
    <div className={styles.wrap}>
      <Receipt size={32} strokeWidth={1.5} className={styles.icon} />
      <h2>Sales</h2>
      <p>Sales workflows aren't built yet — this tab is a placeholder.</p>
    </div>
  )
}
