import { useAuth } from '../../context/AuthContext'
import { ROLES } from '../../constants/roles'

export default function Topbar() {
  const { user, logout } = useAuth()

  const roleLabel =
    ROLES.find((role) => role.value === user?.role)?.label ?? user?.role ?? 'User'

  return (
    <header className="flex h-16 items-center justify-between border-b border-transit-dark-border bg-transit-dark-elevated px-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-gray-500">TransitOps</p>
        <h1 className="text-lg font-semibold text-white">Operations Console</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
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
