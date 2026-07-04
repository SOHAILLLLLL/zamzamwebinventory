import { LogOut, Menu, PackageSearch, Receipt, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import styles from './Navbar.module.css'

const links = [
  { to: '/', label: 'Inventory', icon: PackageSearch, end: true },
  { to: '/sales', label: 'Sales', icon: Receipt, end: false },
]

export function Navbar() {
  const [open, setOpen] = useState(false)
  const { signOut } = useAuth()

  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <span className={styles.brand}>ZamZam Auto Parts</span>

        <nav className={styles.desktopNav}>
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `${styles.link} ${isActive ? styles.linkActive : ''}`}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
          <button type="button" className={styles.signOut} onClick={() => void signOut()}>
            <LogOut size={16} />
            Sign out
          </button>
        </nav>

        <button
          type="button"
          className={styles.menuButton}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <nav className={styles.mobileNav}>
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => `${styles.mobileLink} ${isActive ? styles.linkActive : ''}`}
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
          <button
            type="button"
            className={styles.mobileLink}
            onClick={() => {
              setOpen(false)
              void signOut()
            }}
          >
            <LogOut size={17} />
            Sign out
          </button>
        </nav>
      )}
    </header>
  )
}
