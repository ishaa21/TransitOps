export const ROLES = [
  { value: 'fleet_manager', label: 'Fleet Manager' },
  { value: 'dispatcher', label: 'Dispatcher' },
  { value: 'safety_officer', label: 'Safety Officer' },
  { value: 'financial_analyst', label: 'Financial Analyst' },
]

export const ROLE_ACCESS = {
  fleet_manager: ['Fleet', 'Maintenance'],
  dispatcher: ['Dashboard', 'Trips'],
  safety_officer: ['Drivers', 'Compliance'],
  financial_analyst: ['Fuel & Expenses', 'Analytics'],
}

export const ROLE_HOME_ROUTES = {
  fleet_manager: '/vehicles',
  dispatcher: '/dashboard',
  safety_officer: '/drivers',
  financial_analyst: '/fuel-expenses',
}

/** Normalize any role string to the canonical snake_case key. */
export const normalizeRole = (role) => {
  if (!role) return ''
  const compact = role.toLowerCase().replace(/_/g, '')
  if (compact === 'fleetmanager') return 'fleet_manager'
  if (compact === 'dispatcher') return 'dispatcher'
  if (compact === 'safetyofficer') return 'safety_officer'
  if (compact === 'financialanalyst') return 'financial_analyst'
  return role.toLowerCase()
}

/** Check whether a user holds any of the given roles (any casing). */
export const hasRole = (user, ...roles) => {
  const userRole = normalizeRole(user?.role)
  return roles.some((role) => normalizeRole(role) === userRole)
}

export const getHomeRouteForRole = (role) =>
  ROLE_HOME_ROUTES[normalizeRole(role)] ?? '/settings'

export const getRoleLabel = (role) => {
  const key = normalizeRole(role)
  return ROLES.find((item) => item.value === key)?.label ?? role ?? 'User'
}
