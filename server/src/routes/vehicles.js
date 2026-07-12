const express = require('express')
const prisma = require('../prisma')
const authMiddleware = require('../middleware/authMiddleware')
const requireRole = require('../middleware/requireRole')

const router = express.Router()

// GET /api/vehicles - Fetch all vehicles (protected)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      orderBy: { id: 'asc' },
    })
    return res.json(vehicles)
  } catch (error) {
    console.error('Failed to fetch vehicles:', error)
    return res.status(500).json({ message: 'Failed to fetch vehicles' })
  }
})

// POST /api/vehicles - Create a vehicle (FleetManager only)
router.post('/', authMiddleware, requireRole('FleetManager'), async (req, res) => {
  const { regNo, name, type, capacityKg, odometer, acquisitionCost, status } = req.body

  if (!regNo || !name || !type) {
    return res.status(400).json({ message: 'regNo, name and type are required' })
  }

  try {
    const vehicle = await prisma.vehicle.create({
      data: {
        regNo: regNo.trim(),
        name: name.trim(),
        type: type.trim(),
        capacityKg: Number(capacityKg) || 0,
        odometer: Number(odometer) || 0,
        acquisitionCost: Number(acquisitionCost) || 0,
        status: status || 'Available',
      },
    })
    return res.status(201).json(vehicle)
  } catch (error) {
    if (error.code === 'P2002' && error.meta?.target?.includes('regNo')) {
      return res.status(409).json({ message: 'Registration No. must be unique' })
    }
    console.error('Failed to create vehicle:', error)
    return res.status(500).json({ message: 'Failed to create vehicle' })
  }
})

// PUT /api/vehicles/:id - Update a vehicle (FleetManager only)
router.put('/:id', authMiddleware, requireRole('FleetManager'), async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) {
    return res.status(400).json({ message: 'Invalid vehicle id' })
  }

  const { regNo, name, type, capacityKg, odometer, acquisitionCost, status } = req.body

  try {
    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        ...(regNo !== undefined && { regNo: regNo.trim() }),
        ...(name !== undefined && { name: name.trim() }),
        ...(type !== undefined && { type: type.trim() }),
        ...(capacityKg !== undefined && { capacityKg: Number(capacityKg) }),
        ...(odometer !== undefined && { odometer: Number(odometer) }),
        ...(acquisitionCost !== undefined && { acquisitionCost: Number(acquisitionCost) }),
        ...(status !== undefined && { status }),
      },
    })
    return res.json(vehicle)
  } catch (error) {
    if (error.code === 'P2002' && error.meta?.target?.includes('regNo')) {
      return res.status(409).json({ message: 'Registration No. must be unique' })
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Vehicle not found' })
    }
    console.error('Failed to update vehicle:', error)
    return res.status(500).json({ message: 'Failed to update vehicle' })
  }
})

// DELETE /api/vehicles/:id - Delete a vehicle (FleetManager only)
router.delete('/:id', authMiddleware, requireRole('FleetManager'), async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) {
    return res.status(400).json({ message: 'Invalid vehicle id' })
  }

  try {
    await prisma.vehicle.delete({ where: { id } })
    return res.status(204).send()
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Vehicle not found' })
    }
    console.error('Failed to delete vehicle:', error)
    return res.status(500).json({ message: 'Failed to delete vehicle' })
  }
})

module.exports = router
