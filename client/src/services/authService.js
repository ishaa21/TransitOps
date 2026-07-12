import api from '../api'

const mapRoleToBackend = (role) => {
  if (role === 'fleet_manager') return 'FleetManager'
  if (role === 'safety_officer') return 'SafetyOfficer'
  if (role === 'financial_analyst') return 'FinancialAnalyst'
  if (role === 'dispatcher') return 'Dispatcher'
  return role
}

export const login = async ({ email, password, role }) => {
  const backendRole = mapRoleToBackend(role)
  const { data } = await api.post('/api/auth/login', { email, password, role: backendRole })
  return data
}

export const register = async ({ email, password, role }) => {
  const backendRole = mapRoleToBackend(role)
  const { data } = await api.post('/api/auth/register', { email, password, role: backendRole })
  return data
}
