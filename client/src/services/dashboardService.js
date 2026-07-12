import api from '../api'
import { _getStubVehicles } from './vehicleService'
import { _getStubDrivers } from './driverService'
import { _getStubTrips } from './tripService'

const USE_STUB = import.meta.env.VITE_USE_AUTH_STUB === 'true'
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export const fetchDashboardKpis = async (filters = {}) => {
  const params = {}
  if (filters.vehicleType) params.vehicleType = filters.vehicleType
  if (filters.status) params.status = filters.status
  if (filters.region) params.region = filters.region

  try {
    const { data } = await api.get('/api/dashboard/kpis', { params })
    return data
  } catch (error) {
    if (USE_STUB || error.code === 'ERR_NETWORK' || error.response?.status === 404 || error.response?.status === 502) {
      await delay(300)

      // Fetch all stub arrays
      const vehicles = [..._getStubVehicles()]
      const drivers = [..._getStubDrivers()]
      const trips = [..._getStubTrips()]

      // Apply filters to vehicles
      let filteredVehicles = vehicles
      if (filters.vehicleType) {
        filteredVehicles = filteredVehicles.filter(v => v.type === filters.vehicleType)
      }
      if (filters.status) {
        filteredVehicles = filteredVehicles.filter(v => v.status === filters.status)
      }
      if (filters.region) {
        filteredVehicles = filteredVehicles.filter(v => v.regNo.startsWith(`${filters.region}-`))
      }

      const vehicleIds = filteredVehicles.map(v => v.id)
      const hasFilters = Boolean(filters.vehicleType || filters.status || filters.region)

      // Filtered KPIs
      const activeVehicles = filteredVehicles.filter(v => v.status === 'OnTrip').length
      const availableVehicles = filteredVehicles.filter(v => v.status === 'Available').length
      const vehiclesInMaintenance = filteredVehicles.filter(v => v.status === 'InShop').length

      // Trips filtering
      let filteredTrips = trips
      if (hasFilters) {
        filteredTrips = trips.filter(t => vehicleIds.includes(t.vehicleId))
      }

      const activeTrips = filteredTrips.filter(t => t.status === 'Dispatched').length
      const pendingTrips = filteredTrips.filter(t => t.status === 'Draft').length

      // Drivers filtering
      let driversOnDuty = 0
      if (!hasFilters) {
        driversOnDuty = drivers.filter(d => ['Available', 'OnTrip'].includes(d.status)).length
      } else {
        const activeTripDriverIds = trips
          .filter(t => t.status === 'Dispatched' && vehicleIds.includes(t.vehicleId))
          .map(t => t.driverId)
        driversOnDuty = drivers.filter(d => activeTripDriverIds.includes(d.id) && ['Available', 'OnTrip'].includes(d.status)).length
      }

      const totalVehicles = filteredVehicles.filter(v => v.status !== 'Retired').length
      const fleetUtilization = totalVehicles > 0 ? Math.round((activeVehicles / totalVehicles) * 100) : 0

      // Vehicle breakdown
      const VEHICLE_STATUSES = ['Available', 'OnTrip', 'InShop', 'Retired']
      const vehicleStatusBreakdown = VEHICLE_STATUSES.map(status => ({
        status,
        count: filteredVehicles.filter(v => v.status === status).length
      })).filter(x => x.count > 0)

      // Recent trips (resolve vehicle/driver in-memory)
      const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]))
      const driverMap = Object.fromEntries(drivers.map(d => [d.id, d]))

      const estimateEta = (trip) => {
        if (trip.status === 'Completed') return 'Delivered'
        if (trip.status === 'Cancelled') return '—'
        if (trip.status === 'Draft') return 'Pending dispatch'

        const hoursRemaining = trip.plannedDistanceKm / 45
        const eta = new Date(Date.now() + hoursRemaining * 60 * 60 * 1000)
        return eta.toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      }

      const recentTrips = [...filteredTrips]
        .reverse()
        .slice(0, 8)
        .map(trip => {
          const veh = vehicleMap[trip.vehicleId]
          const drv = driverMap[trip.driverId]
          return {
            id: trip.id,
            trip: `${trip.source} → ${trip.destination}`,
            vehicle: veh ? `${veh.name} (${veh.regNo})` : '—',
            driver: drv?.name ?? '—',
            status: trip.status,
            eta: estimateEta(trip)
          }
        })

      // Unique regions and vehicle types for filters
      const vehicleTypes = [...new Set(vehicles.map(v => v.type))].sort()
      const regions = [...new Set(vehicles.map(v => v.regNo.split('-')[0]).filter(Boolean))].sort()

      return {
        activeVehicles,
        availableVehicles,
        vehiclesInMaintenance,
        activeTrips,
        pendingTrips,
        driversOnDuty,
        fleetUtilization,
        vehicleStatusBreakdown,
        recentTrips,
        filterOptions: {
          vehicleTypes,
          statuses: VEHICLE_STATUSES,
          regions
        }
      }
    }
    throw error
  }
}
