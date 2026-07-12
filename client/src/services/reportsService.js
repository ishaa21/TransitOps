import api from '../api'

export const fetchAnalyticsData = async () => {
  const { data } = await api.get('/api/reports/analytics')
  return data
}
