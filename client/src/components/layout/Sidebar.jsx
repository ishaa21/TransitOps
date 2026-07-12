import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: '▣', roles: ['dispatcher'] },
  { label: 'Fleet', to: '/vehicles', icon: '⛟', roles: ['fleetmanager', 'fleet_manager'] },
  { label: 'Drivers', to: '/drivers', icon: '◎', roles: ['safetyofficer', 'safety_officer'] },
  { label: 'Trips', to: '/trips', icon: '↗', roles: ['dispatcher', 'safetyofficer', 'safety_officer', 'financialanalyst', 'financial_analyst'] },
  { label: 'Maintenance', to: '/maintenance', icon: '⚙', roles: ['fleetmanager', 'fleet_manager'] },
  { label: 'Fuel & Expenses', to: '/fuel-expenses', icon: '⛽', roles: ['financialanalyst', 'financial_analyst'] },
  { label: 'Analytics', to: '/reports', icon: '▤', roles: ['financialanalyst', 'financial_analyst'] },
  { label: 'Settings', to: '/settings', icon: '⚙', roles: ['*'] },
]

export default function Sidebar() {
  const { user } = useAuth()
  const userRole = (user?.role || '').toLowerCase().replace(/_/g, '')

  const filteredNavItems = navItems.filter((item) => {
    if (item.roles.includes('*')) return true
    return item.roles.some((r) => r.toLowerCase().replace(/_/g, '') === userRole)
  })

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-transit-dark-border bg-transit-dark-elevated">
      <div className="border-b border-transit-dark-border px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-transit-orange text-sm font-bold text-white">
            T
          </div>
          <div>
            <p className="text-sm font-semibold text-white">TransitOps</p>
            <p className="text-xs text-gray-400">Smart Transport Ops</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
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

      <div className="border-t border-transit-dark-border px-6 py-4">
        <p className="text-[10px] uppercase tracking-wider text-gray-500">
          TransitOps © 2026 · RBAC Enabled
        </p>
      </div>
    </aside>
  )
}
