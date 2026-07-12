import { useAuth } from '../../context/AuthContext'
import { getRoleLabel } from '../../constants/roles'

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth()

  const roleLabel = getRoleLabel(user?.role)

  return (
    <header className="flex h-16 items-center justify-between border-b border-transit-dark-border bg-transit-dark-elevated px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Open navigation"
          onClick={onMenuClick}
          className="rounded-lg border border-transit-dark-border px-2.5 py-1.5 text-sm text-gray-300 transition-colors hover:border-transit-orange hover:text-white lg:hidden"
        >
          ☰
        </button>
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500">TransitOps</p>
          <h1 className="text-base font-semibold text-white sm:text-lg">Operations Console</h1>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-white">{user?.email ?? 'Signed in'}</p>
          <p className="text-xs text-transit-orange">{roleLabel}</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="rounded-lg border border-transit-dark-border px-3 py-1.5 text-sm text-gray-300 transition-colors hover:border-transit-orange hover:text-white"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
