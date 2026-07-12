import api from '../api'

export const getTrips = async () => {
  const { data } = await api.get('/api/trips')
  return data
}

export const createTrip = async (tripData) => {
  const { data } = await api.post('/api/trips', tripData)
  return data
}

export const updateTripStatus = async (id, status) => {
  const { data } = await api.put(`/api/trips/${id}/status`, { status })
  return data
}
export const dispatchTrip = async (id) => {
  const { data } = await api.put(`/api/trips/${id}/dispatch`)
  return data
}

export const completeTrip = async (id, { finalOdometer, fuelConsumedLiters }) => {
  const { data } = await api.put(`/api/trips/${id}/complete`, { finalOdometer, fuelConsumedLiters })
  return data
}

export const cancelDispatchedTrip = async (id) => {
  const { data } = await api.put(`/api/trips/${id}/cancel`)
  return data
}
