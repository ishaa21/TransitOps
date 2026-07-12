import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { hasRole } from '../../constants/roles'

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: '▣', roles: ['dispatcher'] },
  { label: 'Fleet', to: '/vehicles', icon: '⛟', roles: ['fleet_manager'] },
  { label: 'Drivers', to: '/drivers', icon: '◎', roles: ['safety_officer'] },
  { label: 'Trips', to: '/trips', icon: '↗', roles: ['dispatcher', 'safety_officer', 'financial_analyst'] },
  { label: 'Maintenance', to: '/maintenance', icon: '⚙', roles: ['fleet_manager'] },
  { label: 'Fuel & Expenses', to: '/fuel-expenses', icon: '⛽', roles: ['financial_analyst'] },
  { label: 'Analytics', to: '/reports', icon: '▤', roles: ['financial_analyst'] },
  { label: 'Settings', to: '/settings', icon: '⚙', roles: ['*'] },
]

export default function Sidebar({ open = false, onClose }) {
  const { user } = useAuth()
  
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved || 'dark'
  })

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-mode')
    } else {
      document.body.classList.remove('light-mode')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  const filteredNavItems = navItems.filter((item) => {
    if (item.roles.includes('*')) return true
    return item.roles.some((role) => hasRole(user, role))
  })

  return (
    <aside
      className={[
        'fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-transit-dark-border bg-transit-dark-elevated transition-transform duration-200 lg:static lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}
    >
      <div className="border-b border-transit-dark-border px-6 py-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-transit-orange text-sm font-bold text-white">
              T
            </div>
            <div>
              <p className="text-sm font-semibold text-white">TransitOps</p>
              <p className="text-xs text-gray-400">Smart Transport Ops</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:text-white lg:hidden"
          >
            ✕
          </button>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-transit-orange/15 text-transit-orange'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white',
              ].join(' ')
            }
          >
            <span className="text-base opacity-80">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-transit-dark-border px-6 py-4 flex flex-col gap-3">
        <button
          onClick={toggleTheme}
          className="flex items-center justify-between w-full rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-2 text-xs font-semibold text-gray-300 hover:text-white transition-colors"
        >
          <span>Theme: {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}</span>
          <span className="text-[10px] text-gray-400">Toggle</span>
        </button>
        <p className="text-[10px] uppercase tracking-wider text-gray-500">
          TransitOps © 2026 · RBAC Enabled
        </p>
      </div>
    </aside>
  )
}
