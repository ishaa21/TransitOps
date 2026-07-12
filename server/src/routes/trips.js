const express = require('express')
const prisma = require('../prisma')
const authMiddleware = require('../middleware/authMiddleware')
const requireRole = require('../middleware/requireRole')

const router = express.Router()

// GET /api/trips - Fetch all trips with vehicle/driver names resolved
router.get('/', authMiddleware, requireRole('Dispatcher', 'SafetyOfficer', 'FinancialAnalyst'), async (req, res) => {
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
router.post('/', authMiddleware, requireRole('Dispatcher'), async (req, res) => {
  const { source, destination, vehicleId, driverId, cargoWeightKg, plannedDistanceKm, revenue } = req.body

  if (!source || !destination || !vehicleId || !driverId || cargoWeightKg === undefined || plannedDistanceKm === undefined) {
    return res.status(400).json({ message: 'All trip fields are required' })
  }

  const vid = parseInt(vehicleId, 10)
  const did = parseInt(driverId, 10)
  if (isNaN(vid) || isNaN(did)) {
    return res.status(400).json({ message: 'Invalid vehicle or driver id' })
  }

  const cargo = parseFloat(cargoWeightKg)
  const distance = parseFloat(plannedDistanceKm)
  if (isNaN(cargo) || cargo < 0 || isNaN(distance) || distance < 0) {
    return res.status(400).json({ message: 'Cargo weight and planned distance must be non-negative numbers' })
  }

  try {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vid } })
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' })
    }
    if (vehicle.status !== 'Available') {
      return res.status(400).json({ message: 'Assigned vehicle must be Available' })
    }
    if (cargo > vehicle.capacityKg) {
      const excess = cargo - vehicle.capacityKg
      return res.status(400).json({ message: `Capacity exceeded by ${excess}kg` })
    }

    const driver = await prisma.driver.findUnique({ where: { id: did } })
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' })
    }
    if (driver.status === 'Suspended') {
      return res.status(400).json({ message: 'Suspended drivers cannot be assigned' })
    }
    if (driver.status !== 'Available') {
      return res.status(400).json({ message: 'Assigned driver must be Available' })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (new Date(driver.licenseExpiry) < today) {
      return res.status(400).json({ message: 'Assigned driver has an expired license' })
    }

    const trip = await prisma.trip.create({
      data: {
        source,
        destination,
        vehicleId: vid,
        driverId: did,
        cargoWeightKg: cargo,
        plannedDistanceKm: distance,
        status: 'Draft',
        ...(revenue !== undefined && revenue !== null && revenue !== '' && { revenue: parseFloat(revenue) }),
      }
    })
    return res.status(201).json(trip)
  } catch (error) {
    console.error('Failed to create trip:', error)
    return res.status(500).json({ message: 'Failed to create trip' })
  }
})

// PUT /api/trips/:id/dispatch - Dispatch a trip in a single transaction (protected)
router.put('/:id/dispatch', authMiddleware, requireRole('Dispatcher'), async (req, res) => {
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
      if (driver.status === 'Suspended') {
        throw new Error('DriverSuspended')
      }
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
    if (error.message === 'DriverSuspended') {
      return res.status(400).json({ message: 'Assigned driver is Suspended — dispatch blocked' })
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

// PUT /api/trips/:id/complete - Complete a dispatched trip (records odometer + fuel)
router.put('/:id/complete', authMiddleware, requireRole('Dispatcher'), async (req, res) => {
  const { id } = req.params
  const tripId = parseInt(id, 10)
  if (isNaN(tripId)) {
    return res.status(400).json({ message: 'Invalid trip ID' })
  }

  const { finalOdometer, fuelConsumedLiters } = req.body

  if (finalOdometer === undefined || fuelConsumedLiters === undefined) {
    return res.status(400).json({ message: 'finalOdometer and fuelConsumedLiters are required' })
  }

  const odometerVal = parseFloat(finalOdometer)
  const fuelVal = parseFloat(fuelConsumedLiters)

  if (isNaN(odometerVal) || odometerVal < 0) {
    return res.status(400).json({ message: 'finalOdometer must be a non-negative number' })
  }
  if (isNaN(fuelVal) || fuelVal < 0) {
    return res.status(400).json({ message: 'fuelConsumedLiters must be a non-negative number' })
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({ where: { id: tripId } })
      if (!trip) throw new Error('TripNotFound')
      if (trip.status !== 'Dispatched') throw new Error('TripNotDispatched')

      const vehicle = await tx.vehicle.findUnique({ where: { id: trip.vehicleId } })
      if (!vehicle) throw new Error('VehicleNotFound')

      if (odometerVal < vehicle.odometer) {
        throw new Error(`OdometerRegression:${vehicle.odometer}`)
      }

      // Update trip status
      const updatedTrip = await tx.trip.update({
        where: { id: tripId },
        data: { status: 'Completed' }
      })

      // Restore vehicle to Available and update its odometer
      await tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: 'Available', odometer: odometerVal }
      })

      // Restore driver to Available
      await tx.driver.update({
        where: { id: trip.driverId },
        data: { status: 'Available' }
      })

      // Record fuel log
      await tx.fuelLog.create({
        data: {
          vehicleId: trip.vehicleId,
          liters: fuelVal,
          cost: 0, // cost can be filled in separately
          date: new Date()
        }
      })

      return updatedTrip
    })

    // Resolve names for response
    const [freshVehicle, freshDriver] = await Promise.all([
      prisma.vehicle.findUnique({ where: { id: result.vehicleId }, select: { id: true, name: true, regNo: true, odometer: true } }),
      prisma.driver.findUnique({ where: { id: result.driverId }, select: { id: true, name: true } })
    ])

    return res.json({
      ...result,
      vehicleName: freshVehicle?.name ?? 'Unknown',
      vehicleRegNo: freshVehicle?.regNo ?? 'Unknown',
      vehicleOdometer: freshVehicle?.odometer ?? null,
      driverName: freshDriver?.name ?? 'Unknown'
    })
  } catch (error) {
    console.error('Complete transaction error:', error)
    if (error.message === 'TripNotFound') return res.status(404).json({ message: 'Trip not found' })
    if (error.message === 'TripNotDispatched') return res.status(400).json({ message: 'Only Dispatched trips can be completed' })
    if (error.message === 'VehicleNotFound') return res.status(400).json({ message: 'Assigned vehicle not found' })
    if (error.message.startsWith('OdometerRegression:')) {
      const current = error.message.split(':')[1]
      return res.status(400).json({ message: `Final odometer (${odometerVal} km) must be ≥ current odometer (${current} km)` })
    }
    return res.status(500).json({ message: 'Failed to complete trip' })
  }
})

// PUT /api/trips/:id/cancel - Cancel a dispatched trip (restores vehicle + driver)
router.put('/:id/cancel', authMiddleware, requireRole('Dispatcher'), async (req, res) => {
  const { id } = req.params
  const tripId = parseInt(id, 10)
  if (isNaN(tripId)) {
    return res.status(400).json({ message: 'Invalid trip ID' })
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({ where: { id: tripId } })
      if (!trip) throw new Error('TripNotFound')
      if (trip.status !== 'Dispatched') throw new Error('TripNotDispatched')

      // Update trip status
      const updatedTrip = await tx.trip.update({
        where: { id: tripId },
        data: { status: 'Cancelled' }
      })

      // Restore vehicle to Available
      await tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: 'Available' }
      })

      // Restore driver to Available
      await tx.driver.update({
        where: { id: trip.driverId },
        data: { status: 'Available' }
      })

      return updatedTrip
    })

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
    console.error('Cancel transaction error:', error)
    if (error.message === 'TripNotFound') return res.status(404).json({ message: 'Trip not found' })
    if (error.message === 'TripNotDispatched') return res.status(400).json({ message: 'Only Dispatched trips can be cancelled via this endpoint' })
    return res.status(500).json({ message: 'Failed to cancel trip' })
  }
})

module.exports = router
