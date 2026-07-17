import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  IconDashboard,
  IconBills,
  IconNewBill,
  IconInventory,
  IconAnalytics,
  IconSettings,
  IconHelp,
  IconLogout,
  IconChevronLeft,
  IconChevronRight,
} from './DashboardIcons'

const NAV_ITEMS = [
  { to: '/', Icon: IconDashboard, label: 'Dashboard' },
  { to: '/bills', Icon: IconBills, label: 'Bills' },
  { to: '/bills/new', Icon: IconNewBill, label: 'New Bill' },
  { to: '/inventory', Icon: IconInventory, label: 'Inventory' },
  { to: '/analytics', Icon: IconAnalytics, label: 'Analytics' },
]

const STORAGE_KEY = 'db-sidebar-collapsed'

type Props = {
  active: string
  onLogout: () => void
}

export function DashboardSidebar({ active, onLogout }: Props) {
  // Restore the last state so a refresh doesn't snap the layout open/closed.
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  })

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  return (
    <nav
      className={`db-sidebar${collapsed ? ' db-sidebar--collapsed' : ''}`}
      aria-label="Main navigation"
    >
      {/* Toggle handle */}
      <button
        type="button"
        className="db-sidebar__toggle"
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!collapsed}
      >
        {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
      </button>

      {/* Logo */}
      <div className="db-sidebar__brand">
        <span className="db-sidebar__logo" aria-hidden>
          <IconDashboard />
        </span>
      </div>

      {/* Primary nav */}
      <ul className="db-sidebar__nav">
        {NAV_ITEMS.map(({ to, Icon, label }) => (
          <li key={to}>
            <Link
              to={to}
              className={`db-sidebar__item${active === to ? ' db-sidebar__item--active' : ''}`}
              aria-current={active === to ? 'page' : undefined}
              title={collapsed ? label : undefined}
              aria-label={label}
            >
              <span className="db-sidebar__icon" aria-hidden>
                <Icon />
              </span>
              <span className="db-sidebar__label">{label}</span>
            </Link>
          </li>
        ))}
      </ul>

      {/* Bottom utility nav */}
      <ul className="db-sidebar__nav db-sidebar__nav--bottom">
        <li>
          <button
            type="button"
            className="db-sidebar__item db-sidebar__item--btn"
            title={collapsed ? 'Settings' : undefined}
            aria-label="Settings"
            disabled
          >
            <span className="db-sidebar__icon" aria-hidden>
              <IconSettings />
            </span>
            <span className="db-sidebar__label">Settings</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            className="db-sidebar__item db-sidebar__item--btn"
            title={collapsed ? 'Help' : undefined}
            aria-label="Help"
            disabled
          >
            <span className="db-sidebar__icon" aria-hidden>
              <IconHelp />
            </span>
            <span className="db-sidebar__label">Help</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            className="db-sidebar__item db-sidebar__item--btn"
            title={collapsed ? 'Log out' : undefined}
            aria-label="Log out"
            onClick={onLogout}
          >
            <span className="db-sidebar__icon" aria-hidden>
              <IconLogout />
            </span>
            <span className="db-sidebar__label">Log out</span>
          </button>
        </li>
      </ul>
    </nav>
  )
}