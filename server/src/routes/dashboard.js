const express = require('express')
const prisma = require('../prisma')
const authMiddleware = require('../middleware/authMiddleware')
const requireRole = require('../middleware/requireRole')
const { buildVehicleWhere, hasVehicleFilters } = require('../utils/vehicleFilters')

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
  const vehicleWhere = buildVehicleWhere(req.query)
  const filtered = hasVehicleFilters(req.query)

  try {
    const vehicleIds = filtered ? await vehicleIdsForWhere(vehicleWhere) : null
    const tripVehicleFilter =
      filtered && vehicleIds.length > 0
        ? { vehicleId: { in: vehicleIds } }
        : filtered
          ? { vehicleId: { in: [] } }
          : {}

    const [
      activeVehicles,
      availableVehicles,
      vehiclesInMaintenance,
      activeTrips,
      pendingTrips,
      totalVehicles,
      vehicles,
      recentTripsRaw,
      vehicleTypes,
      regions,
      driversOnDuty,
    ] = await Promise.all([
      prisma.vehicle.count({ where: { ...vehicleWhere, status: 'OnTrip' } }),
      prisma.vehicle.count({ where: { ...vehicleWhere, status: 'Available' } }),
      prisma.vehicle.count({ where: { ...vehicleWhere, status: 'InShop' } }),
      prisma.trip.count({ where: { status: 'Dispatched', ...tripVehicleFilter } }),
      prisma.trip.count({ where: { status: 'Draft', ...tripVehicleFilter } }),
      prisma.vehicle.count({
        where: { ...vehicleWhere, status: { not: 'Retired' } },
      }),
      prisma.vehicle.findMany({ where: vehicleWhere, select: { status: true } }),
      prisma.trip.findMany({
        where: tripVehicleFilter,
        orderBy: { id: 'desc' },
        take: 8,
      }),
      prisma.vehicle.findMany({ select: { type: true }, distinct: ['type'] }),
      prisma.vehicle.findMany({ select: { regNo: true } }),
      countDriversOnDuty(vehicleIds, filtered),
    ])

    const fleetUtilization =
      totalVehicles > 0 ? Math.round((activeVehicles / totalVehicles) * 100) : 0

    const vehicleStatusBreakdown = VEHICLE_STATUSES.map((label) => ({
      status: label,
      count: vehicles.filter((v) => v.status === label).length,
    })).filter((item) => item.count > 0)

    const tripVehicleIds = [...new Set(recentTripsRaw.map((t) => t.vehicleId))]
    const tripDriverIds = [...new Set(recentTripsRaw.map((t) => t.driverId))]

    const [vehicleRecords, driverRecords] = await Promise.all([
      prisma.vehicle.findMany({
        where: { id: { in: tripVehicleIds } },
        select: { id: true, name: true, regNo: true },
      }),
      prisma.driver.findMany({
        where: { id: { in: tripDriverIds } },
        select: { id: true, name: true },
      }),
    ])

    const vehicleMap = Object.fromEntries(vehicleRecords.map((v) => [v.id, v]))
    const driverMap = Object.fromEntries(driverRecords.map((d) => [d.id, d]))

    const recentTrips = recentTripsRaw.map((trip) => {
      const vehicle = vehicleMap[trip.vehicleId]
      const driver = driverMap[trip.driverId]
      return {
        id: trip.id,
        trip: `${trip.source} → ${trip.destination}`,
        vehicle: vehicle ? `${vehicle.name} (${vehicle.regNo})` : '—',
        driver: driver?.name ?? '—',
        status: trip.status,
        eta: estimateEta(trip),
      }
    })

    const uniqueRegions = [
      ...new Set(regions.map((v) => v.regNo.split('-')[0]).filter(Boolean)),
    ].sort()

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
        vehicleTypes: vehicleTypes.map((v) => v.type).sort(),
        statuses: VEHICLE_STATUSES,
        regions: uniqueRegions,
      },
    })
  } catch (error) {
    console.error('Dashboard KPIs error:', error)
    return res.status(500).json({ message: 'Failed to load dashboard data' })
  }
})

async function vehicleIdsForWhere(vehicleWhere) {
  const records = await prisma.vehicle.findMany({
    where: vehicleWhere,
    select: { id: true },
  })
  return records.map((v) => v.id)
}

async function countDriversOnDuty(vehicleIds, filtered) {
  if (!filtered) {
    return prisma.driver.count({
      where: { status: { in: ['Available', 'OnTrip'] } },
    })
  }

  if (!vehicleIds || vehicleIds.length === 0) return 0

  const trips = await prisma.trip.findMany({
    where: {
      vehicleId: { in: vehicleIds },
      status: 'Dispatched',
    },
    select: { driverId: true },
    distinct: ['driverId'],
  })

  if (trips.length === 0) return 0

  return prisma.driver.count({
    where: {
      id: { in: trips.map((t) => t.driverId) },
      status: { in: ['Available', 'OnTrip'] },
    },
  })
}

module.exports = router
