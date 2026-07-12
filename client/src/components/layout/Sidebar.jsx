import { NavLink } from 'react-router-dom'

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: '▣' },
  { label: 'Fleet', to: '/vehicles', icon: '⛟' },
  { label: 'Drivers', to: '/drivers', icon: '◎' },
  { label: 'Trips', to: '/trips', icon: '↗' },
  { label: 'Maintenance', to: '/maintenance', icon: '⚙' },
  { label: 'Fuel & Expenses', to: '/fuel-expenses', icon: '⛽' },
  { label: 'Analytics', to: '/reports', icon: '▤' },
  { label: 'Settings', to: '/settings', icon: '⚙' },
]

export default function Sidebar() {
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
        {navItems.map((item) => (
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
