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
