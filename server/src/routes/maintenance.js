const express = require('express')
const prisma = require('../prisma')
const authMiddleware = require('../middleware/authMiddleware')
const requireRole = require('../middleware/requireRole')

const router = express.Router()

// ─── GET /api/maintenance ─────────────────────────────────────────────────────
// Fetch all maintenance logs, enriched with vehicle reg/name (protected)
router.get('/', authMiddleware, requireRole('FleetManager'), async (req, res) => {
  try {
    const logs = await prisma.maintenanceLog.findMany({
      orderBy: { date: 'desc' },
    })

    // Resolve vehicle names in-memory (no Prisma relations in schema)
    const vehicleIds = [...new Set(logs.map((l) => l.vehicleId))]
    const vehicles = vehicleIds.length
      ? await prisma.vehicle.findMany({
          where: { id: { in: vehicleIds } },
          select: { id: true, name: true, regNo: true },
        })
      : []

    const vehicleMap = Object.fromEntries(vehicles.map((v) => [v.id, v]))

    const result = logs.map((log) => ({
      ...log,
      vehicleName:  vehicleMap[log.vehicleId]?.name  ?? 'Unknown',
      vehicleRegNo: vehicleMap[log.vehicleId]?.regNo ?? 'Unknown',
    }))

    return res.json(result)
  } catch (error) {
    console.error('Failed to fetch maintenance logs:', error)
    return res.status(500).json({ message: 'Failed to fetch maintenance logs' })
  }
})

// ─── POST /api/maintenance ────────────────────────────────────────────────────
// Create a maintenance log and set vehicle status → InShop (transaction)
// Restricted to FleetManager
router.post('/', authMiddleware, requireRole('FleetManager'), async (req, res) => {
  const { vehicleId, serviceType, cost, date } = req.body

  if (!vehicleId || !serviceType || cost === undefined || !date) {
    return res.status(400).json({ message: 'vehicleId, serviceType, cost and date are required' })
  }

  const vid = parseInt(vehicleId, 10)
  if (isNaN(vid)) {
    return res.status(400).json({ message: 'Invalid vehicleId' })
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Verify vehicle exists
      const vehicle = await tx.vehicle.findUnique({ where: { id: vid } })
      if (!vehicle) throw new Error('VehicleNotFound')

      // Create the log
      const log = await tx.maintenanceLog.create({
        data: {
          vehicleId: vid,
          serviceType: serviceType.trim(),
          cost: parseFloat(cost),
          date: new Date(date),
          status: 'Active',
        },
      })

      // Set vehicle → InShop
      await tx.vehicle.update({
        where: { id: vid },
        data: { status: 'InShop' },
      })

      return { log, vehicle: { ...vehicle, status: 'InShop' } }
    })

    return res.status(201).json({
      ...result.log,
      vehicleName:  result.vehicle.name,
      vehicleRegNo: result.vehicle.regNo,
    })
  } catch (error) {
    if (error.message === 'VehicleNotFound') {
      return res.status(404).json({ message: 'Vehicle not found' })
    }
    console.error('Failed to create maintenance log:', error)
    return res.status(500).json({ message: 'Failed to create maintenance log' })
  }
})

// ─── PUT /api/maintenance/:id/complete ───────────────────────────────────────
// Mark log Completed and set vehicle → Available, UNLESS vehicle is Retired
// Restricted to FleetManager
router.put('/:id/complete', authMiddleware, requireRole('FleetManager'), async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) {
    return res.status(400).json({ message: 'Invalid maintenance log id' })
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Verify log exists and is not already completed
      const log = await tx.maintenanceLog.findUnique({ where: { id } })
      if (!log) throw new Error('LogNotFound')
      if (log.status === 'Completed') throw new Error('AlreadyCompleted')

      // Fetch the linked vehicle
      const vehicle = await tx.vehicle.findUnique({ where: { id: log.vehicleId } })
      if (!vehicle) throw new Error('VehicleNotFound')

      // Mark log as Completed
      const updatedLog = await tx.maintenanceLog.update({
        where: { id },
        data: { status: 'Completed' },
      })

      // Only restore to Available if vehicle is NOT Retired
      const newVehicleStatus = vehicle.status === 'Retired' ? 'Retired' : 'Available'
      const updatedVehicle = await tx.vehicle.update({
        where: { id: log.vehicleId },
        data: { status: newVehicleStatus },
      })

      return { log: updatedLog, vehicle: updatedVehicle }
    })

    return res.json({
      ...result.log,
      vehicleName:  result.vehicle.name,
      vehicleRegNo: result.vehicle.regNo,
      vehicleStatus: result.vehicle.status,
    })
  } catch (error) {
    if (error.message === 'LogNotFound') {
      return res.status(404).json({ message: 'Maintenance log not found' })
    }
    if (error.message === 'AlreadyCompleted') {
      return res.status(409).json({ message: 'Maintenance log is already completed' })
    }
    if (error.message === 'VehicleNotFound') {
      return res.status(404).json({ message: 'Linked vehicle not found' })
    }
    console.error('Failed to complete maintenance log:', error)
    return res.status(500).json({ message: 'Failed to complete maintenance log' })
  }
})

module.exports = router
