const express = require('express')
const prisma = require('../prisma')
const authMiddleware = require('../middleware/authMiddleware')
const requireRole = require('../middleware/requireRole')
const { hasVehicleFilters, matchesVehicleFilters } = require('../utils/vehicleFilters')

const router = express.Router()

const VEHICLE_STATUSES = ['Available', 'OnTrip', 'InShop', 'Retired']

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

router.get('/kpis', authMiddleware, requireRole('Dispatcher'), async (req, res) => {
  const filtered = hasVehicleFilters(req.query)

  try {
    const [allVehicles, trips, drivers] = await Promise.all([
      prisma.vehicle.findMany(),
      prisma.trip.findMany({ orderBy: { id: 'desc' } }),
      prisma.driver.findMany({ select: { id: true, name: true, status: true } }),
    ])

    const vehicles = filtered
      ? allVehicles.filter((v) => matchesVehicleFilters(v, req.query))
      : allVehicles

    const vehicleIdSet = new Set(vehicles.map((v) => v.id))
    const scopedTrips = filtered
      ? trips.filter((t) => vehicleIdSet.has(t.vehicleId))
      : trips

    const activeVehicles = vehicles.filter((v) => v.status === 'OnTrip').length
    const availableVehicles = vehicles.filter((v) => v.status === 'Available').length
    const vehiclesInMaintenance = vehicles.filter((v) => v.status === 'InShop').length
    const totalVehicles = vehicles.filter((v) => v.status !== 'Retired').length
    const activeTrips = scopedTrips.filter((t) => t.status === 'Dispatched').length
    const pendingTrips = scopedTrips.filter((t) => t.status === 'Draft').length

    const fleetUtilization =
      totalVehicles > 0 ? Math.round((activeVehicles / totalVehicles) * 100) : 0

    const vehicleStatusBreakdown = VEHICLE_STATUSES.map((label) => ({
      status: label,
      count: vehicles.filter((v) => v.status === label).length,
    })).filter((item) => item.count > 0)

    const vehicleLookup = Object.fromEntries(allVehicles.map((v) => [v.id, v]))
    const driverLookup = Object.fromEntries(drivers.map((d) => [d.id, d]))

    const recentTrips = scopedTrips.slice(0, 8).map((trip) => {
      const vehicle = vehicleLookup[trip.vehicleId]
      const driver = driverLookup[trip.driverId]
      return {
        id: trip.id,
        trip: `${trip.source} → ${trip.destination}`,
        vehicle: vehicle ? `${vehicle.name} (${vehicle.regNo})` : '—',
        driver: driver?.name ?? '—',
        status: trip.status,
        eta: estimateEta(trip),
      }
    })

    let driversOnDuty = 0
    if (!filtered) {
      driversOnDuty = drivers.filter((d) => ['Available', 'OnTrip'].includes(d.status)).length
    } else {
      const dispatchedDriverIds = new Set(
        scopedTrips.filter((t) => t.status === 'Dispatched').map((t) => t.driverId),
      )
      driversOnDuty = drivers.filter(
        (d) => dispatchedDriverIds.has(d.id) && ['Available', 'OnTrip'].includes(d.status),
      ).length
    }

    const uniqueRegions = [
      ...new Set(allVehicles.map((v) => v.regNo.split('-')[0]).filter(Boolean)),
    ].sort()

    const vehicleTypes = [...new Set(allVehicles.map((v) => v.type))].sort()

    return res.json({
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
        regions: uniqueRegions,
      },
    })
  } catch (error) {
    console.error('Dashboard KPIs error:', error)
    return res.status(500).json({ message: 'Failed to load dashboard data' })
  }
})

module.exports = router
