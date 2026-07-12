import api from '../api'

export const getMaintenanceLogs = async () => {
  const { data } = await api.get('/api/maintenance')
  return data
}

export const createMaintenanceLog = async (payload) => {
  const { data } = await api.post('/api/maintenance', payload)
  return data
}

export const completeMaintenanceLog = async (id) => {
  const { data } = await api.put(`/api/maintenance/${id}/complete`)
  return data
}
