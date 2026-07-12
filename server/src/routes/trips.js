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

module.exports = router
