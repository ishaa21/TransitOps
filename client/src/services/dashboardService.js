import api from '../api'

export const fetchDashboardKpis = async (filters = {}) => {
  const params = {}
  if (filters.vehicleType) params.vehicleType = filters.vehicleType
  if (filters.status) params.status = filters.status
  if (filters.region) params.region = filters.region

  const { data } = await api.get('/api/dashboard/kpis', { params })
  return data
}
