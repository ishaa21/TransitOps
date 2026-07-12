import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

// ─── Settings constants ───────────────────────────────────────────────────────
const CURRENCIES = [
  { label: 'Indian Rupee (₹)', value: 'INR' },
  { label: 'US Dollar ($)', value: 'USD' },
  { label: 'Euro (€)', value: 'EUR' },
  { label: 'British Pound (£)', value: 'GBP' },
]

const DISTANCE_UNITS = [
  { label: 'Kilometers (km)', value: 'km' },
  { label: 'Miles (mi)', value: 'mi' },
]

// ─── RBAC Matrix Data ─────────────────────────────────────────────────────────
const RBAC_ROLES = [
  { key: 'FleetManager', label: 'Fleet Manager' },
  { key: 'Dispatcher', label: 'Dispatcher' },
  { key: 'SafetyOfficer', label: 'Safety Officer' },
  { key: 'FinancialAnalyst', label: 'Financial Analyst' },
]

const RBAC_MODULES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'fleet', label: 'Fleet Registry' },
  { key: 'drivers', label: 'Driver Management' },
  { key: 'trips', label: 'Trip Dispatcher' },
  { key: 'maintenance', label: 'Maintenance Log' },
  { key: 'fuel_expenses', label: 'Fuel & Expenses' },
  { key: 'analytics', label: 'Analytics & Reports' },
  { key: 'settings', label: 'Settings & RBAC' },
]

const RBAC_MATRIX = {
  FleetManager: {
    dashboard: 'none',
    fleet: 'write',
    drivers: 'none',
    trips: 'none',
    maintenance: 'write',
    fuel_expenses: 'none',
    analytics: 'none',
    settings: 'write',
  },
  Dispatcher: {
    dashboard: 'write',
    fleet: 'none',
    drivers: 'none',
    trips: 'write',
    maintenance: 'none',
    fuel_expenses: 'none',
    analytics: 'none',
    settings: 'write',
  },
  SafetyOfficer: {
    dashboard: 'none',
    fleet: 'none',
    drivers: 'write',
    trips: 'view',
    maintenance: 'none',
    fuel_expenses: 'none',
    analytics: 'none',
    settings: 'write',
  },
  FinancialAnalyst: {
    dashboard: 'none',
    fleet: 'none',
    drivers: 'none',
    trips: 'view',
    maintenance: 'none',
    fuel_expenses: 'write',
    analytics: 'write',
    settings: 'write',
  },
}

export default function Settings() {
  const { user } = useAuth()

  // Local settings state with localStorage persistence
  const [depotName, setDepotName] = useState(() => {
    return localStorage.getItem('transitops_depot_name') || 'Central Mumbai Depot'
  })
  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem('transitops_currency') || 'INR'
  })
  const [distanceUnit, setDistanceUnit] = useState(() => {
    return localStorage.getItem('transitops_distance_unit') || 'km'
  })

  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const handleSave = (e) => {
    e.preventDefault()
    setSaving(true)
    setSuccessMessage('')

    setTimeout(() => {
      localStorage.setItem('transitops_depot_name', depotName)
      localStorage.setItem('transitops_currency', currency)
      localStorage.setItem('transitops_distance_unit', distanceUnit)
      setSaving(false)
      setSuccessMessage('General settings updated successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
    }, 400)
  }

  const renderAccessBadge = (type) => {
    switch (type) {
      case 'write':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400">
            ✓ Full Access
          </span>
        )
      case 'view':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-xs font-semibold text-blue-400">
            👁 View Only
          </span>
        )
      case 'none':
      default:
        return <span className="text-gray-600 font-bold">—</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Settings & RBAC</h2>
        <p className="mt-1 text-sm text-gray-400">
          Configure general system preferences and review security matrix permissions.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
        {/* ── General Settings Form ── */}
        <div className="rounded-xl border border-transit-dark-border bg-transit-dark-elevated p-5 self-start">
          <h3 className="text-base font-bold text-white mb-2">General Preferences</h3>
          <p className="text-xs text-gray-400 mb-4">
            System-wide options stored in local browser preferences.
          </p>

          <form onSubmit={handleSave} className="space-y-4">
            {successMessage && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
                ✓ {successMessage}
              </div>
            )}

            <div>
              <label htmlFor="depot-name" className="form-label">Depot Name</label>
              <input
                id="depot-name"
                type="text"
                required
                value={depotName}
                onChange={(e) => setDepotName(e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <label htmlFor="currency" className="form-label">Currency</label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="form-input"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="distance-unit" className="form-label">Distance Unit</label>
              <select
                id="distance-unit"
                value={distanceUnit}
                onChange={(e) => setDistanceUnit(e.target.value)}
                className="form-input"
              >
                {DISTANCE_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-transit-orange py-2 text-sm font-semibold text-white transition-colors hover:bg-transit-orange-hover disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </form>
        </div>

        {/* ── RBAC Table ── */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-transit-dark-border bg-transit-dark-elevated p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-white">Role-Based Access Control (RBAC)</h3>
              <div className="flex items-center gap-1.5 rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-1 text-xs">
                <span className="text-transit-orange font-semibold">Current Role:</span>
                <span className="text-gray-300 font-bold">{user?.role || 'Guest'}</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-5">
              Access permissions are defined per operational role and enforced both on the client sidebar and server API route level.
            </p>

            <div className="overflow-x-auto rounded-lg border border-transit-dark-border">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-transit-dark-border bg-transit-dark/40 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <th className="px-5 py-4">Module Name</th>
                    {RBAC_ROLES.map((role) => (
                      <th key={role.key} className="px-5 py-4 text-center">
                        {role.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-transit-dark-border text-sm text-gray-300">
                  {RBAC_MODULES.map((module) => (
                    <tr key={module.key} className="transition-colors hover:bg-white/[0.02]">
                      <td className="px-5 py-4 font-semibold text-white">
                        {module.label}
                      </td>
                      {RBAC_ROLES.map((role) => {
                        const permission = RBAC_MATRIX[role.key][module.key]
                        return (
                          <td key={role.key} className="px-5 py-4 text-center">
                            {renderAccessBadge(permission)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
