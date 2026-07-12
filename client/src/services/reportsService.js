import api from '../api'

/**
 * Fetches analytics data from GET /api/reports/analytics.
 * Returns: fuelEfficiencyKmPerL, fleetUtilizationPct, totalOperationalCost,
 *          avgRoi, vehicleRoi[], monthlyRevenue[], topCostliestVehicles[], meta.
 */
export const fetchAnalytics = async () => {
  const { data } = await api.get('/api/reports/analytics')
  return data
}
