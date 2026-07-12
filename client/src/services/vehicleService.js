import api from '../api'

export const getVehicles = async () => {
  const { data } = await api.get('/api/vehicles')
  return data
}

export const getAvailableVehicles = async () => {
  const { data } = await api.get('/api/vehicles/available')
  return data
}

export const createVehicle = async (payload) => {
  const { data } = await api.post('/api/vehicles', payload)
  return data
}

export const updateVehicle = async (id, payload) => {
  const { data } = await api.put(`/api/vehicles/${id}`, payload)
  return data
}

export const deleteVehicle = async (id) => {
  await api.delete(`/api/vehicles/${id}`)
}
