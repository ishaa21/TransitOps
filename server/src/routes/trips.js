const express = require('express')
const prisma = require('../prisma')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()

// GET /api/trips - Fetch all trips with vehicle/driver names resolved
router.get('/', authMiddleware, async (req, res) => {
  try {
    const trips = await prisma.trip.findMany()

    // Fetch vehicles and drivers to resolve names in memory (due to no direct schema relations)
    const [vehicles, drivers] = await Promise.all([
      prisma.vehicle.findMany({ select: { id: true, name: true, regNo: true } }),
      prisma.driver.findMany({ select: { id: true, name: true } })
    ])

    const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]))
    const driverMap = Object.fromEntries(drivers.map(d => [d.id, d]))

    const result = trips.map(trip => ({
      ...trip,
      vehicleName: vehicleMap[trip.vehicleId]?.name ?? 'Unknown',
      vehicleRegNo: vehicleMap[trip.vehicleId]?.regNo ?? 'Unknown',
      driverName: driverMap[trip.driverId]?.name ?? 'Unknown'
    }))

    return res.json(result)
  } catch (error) {
    console.error('Failed to fetch trips:', error)
    return res.status(500).json({ message: 'Failed to fetch trips' })
  }
})

// POST /api/trips - Create a trip (status defaults to Draft)
router.post('/', authMiddleware, async (req, res) => {
  const { source, destination, vehicleId, driverId, cargoWeightKg, plannedDistanceKm } = req.body

  if (!source || !destination || !vehicleId || !driverId || cargoWeightKg === undefined || plannedDistanceKm === undefined) {
    return res.status(400).json({ message: 'All trip fields are required' })
  }

  try {
    const trip = await prisma.trip.create({
      data: {
        source,
        destination,
        vehicleId: parseInt(vehicleId, 10),
        driverId: parseInt(driverId, 10),
        cargoWeightKg: parseFloat(cargoWeightKg),
        plannedDistanceKm: parseFloat(plannedDistanceKm),
        status: 'Draft'
      }
    })
    return res.status(201).json(trip)
  } catch (error) {
    console.error('Failed to create trip:', error)
    return res.status(500).json({ message: 'Failed to create trip' })
  }
})

// PUT /api/trips/:id/status - Update a trip's status (for stepper)
router.put('/:id/status', authMiddleware, async (req, res) => {
  const { id } = req.params
  const { status } = req.body

  const tripId = parseInt(id, 10)
  if (isNaN(tripId)) {
    return res.status(400).json({ message: 'Invalid trip ID' })
  }

  if (!status) {
    return res.status(400).json({ message: 'Status is required' })
  }

  try {
    const updated = await prisma.trip.update({
      where: { id: tripId },
      data: { status }
    })
    return res.json(updated)
  } catch (error) {
    console.error('Failed to update trip status:', error)
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Trip not found' })
    }
    return res.status(500).json({ message: 'Failed to update trip status' })
  }
})

// PUT /api/trips/:id/dispatch - Dispatch a trip in a single transaction (protected)
router.put('/:id/dispatch', authMiddleware, async (req, res) => {
  const { id } = req.params
  const tripId = parseInt(id, 10)
  if (isNaN(tripId)) {
    return res.status(400).json({ message: 'Invalid trip ID' })
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({ where: { id: tripId } })
      if (!trip) {
        throw new Error('TripNotFound')
      }

      const vehicle = await tx.vehicle.findUnique({ where: { id: trip.vehicleId } })
      if (!vehicle) {
        throw new Error('VehicleNotFound')
      }

      const driver = await tx.driver.findUnique({ where: { id: trip.driverId } })
      if (!driver) {
        throw new Error('DriverNotFound')
      }

      // Check vehicle availability
      if (vehicle.status !== 'Available') {
        throw new Error('VehicleNotAvailable')
      }

      // Check driver availability, suspension, and license expiry
      if (driver.status !== 'Available') {
        throw new Error('DriverNotAvailable')
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (new Date(driver.licenseExpiry) < today) {
        throw new Error('DriverLicenseExpired')
      }

      // Check capacity
      if (trip.cargoWeightKg > vehicle.capacityKg) {
        const excess = trip.cargoWeightKg - vehicle.capacityKg
        throw new Error(`CapacityExceeded:${excess}`)
      }

      // Perform updates
      const updatedTrip = await tx.trip.update({
        where: { id: tripId },
        data: { status: 'Dispatched' }
      })

      await tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: 'OnTrip' }
      })

      await tx.driver.update({
        where: { id: trip.driverId },
        data: { status: 'OnTrip' }
      })

      return updatedTrip
    })

    // Prepare resolved response to send back to client
    const [freshVehicle, freshDriver] = await Promise.all([
      prisma.vehicle.findUnique({ where: { id: result.vehicleId }, select: { id: true, name: true, regNo: true } }),
      prisma.driver.findUnique({ where: { id: result.driverId }, select: { id: true, name: true } })
    ])

    return res.json({
      ...result,
      vehicleName: freshVehicle?.name ?? 'Unknown',
      vehicleRegNo: freshVehicle?.regNo ?? 'Unknown',
      driverName: freshDriver?.name ?? 'Unknown'
    })
  } catch (error) {
    console.error('Dispatch transaction error:', error)
    if (error.message === 'TripNotFound') {
      return res.status(404).json({ message: 'Trip not found' })
    }
    if (error.message === 'VehicleNotFound') {
      return res.status(400).json({ message: 'Assigned vehicle not found' })
    }
    if (error.message === 'DriverNotFound') {
      return res.status(400).json({ message: 'Assigned driver not found' })
    }
    if (error.message === 'VehicleNotAvailable') {
      return res.status(400).json({ message: 'Assigned vehicle is not Available' })
    }
    if (error.message === 'DriverNotAvailable') {
      return res.status(400).json({ message: 'Assigned driver is not Available' })
    }
    if (error.message === 'DriverLicenseExpired') {
      return res.status(400).json({ message: 'Assigned driver has an expired license' })
    }
    if (error.message.startsWith('CapacityExceeded:')) {
      const excess = error.message.split(':')[1]
      return res.status(400).json({ message: `Capacity exceeded by ${excess}kg — dispatch blocked` })
    }
    return res.status(500).json({ message: 'Failed to dispatch trip' })
  }
})

module.exports = router
