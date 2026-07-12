import api from '../api'

export const getFuelLogs = async () => {
  const { data } = await api.get('/api/fuel-logs')
  return data
}

export const createFuelLog = async (payload) => {
  const { data } = await api.post('/api/fuel-logs', payload)
  return data
}

export const getExpenses = async () => {
  const { data } = await api.get('/api/expenses')
  return data
}

export const createExpense = async (payload) => {
  const { data } = await api.post('/api/expenses', payload)
  return data
}

export const getAllOperationalCosts = async () => {
  const { data } = await api.get('/api/vehicles/operational-cost')
  return data
}

export const getVehicleOperationalCost = async (vehicleId) => {
  const { data } = await api.get(`/api/vehicles/${vehicleId}/operational-cost`)
  return data
}
