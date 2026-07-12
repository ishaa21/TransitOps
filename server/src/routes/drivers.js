const express = require('express')
const prisma = require('../prisma')
const authMiddleware = require('../middleware/authMiddleware')
const requireRole = require('../middleware/requireRole')

const router = express.Router()

// GET /api/drivers - Fetch all drivers (protected)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const drivers = await prisma.driver.findMany()
    return res.json(drivers)
  } catch (error) {
    console.error('Failed to fetch drivers:', error)
    return res.status(500).json({ message: 'Failed to fetch drivers' })
  }
})

// POST /api/drivers - Create a driver (write restricted)
router.post('/', authMiddleware, requireRole('SafetyOfficer', 'FleetManager'), async (req, res) => {
  const { name, licenseNo, licenseCategory, licenseExpiry, contact, safetyScore, status } = req.body

  if (!name || !licenseNo || !licenseCategory || !licenseExpiry || !contact || safetyScore === undefined) {
    return res.status(400).json({ message: 'All driver fields are required' })
  }

  const scoreInt = parseInt(safetyScore, 10)
  if (isNaN(scoreInt) || scoreInt < 0 || scoreInt > 100) {
    return res.status(400).json({ message: 'Safety score must be between 0 and 100' })
  }

  try {
    const expiryDate = new Date(licenseExpiry)
    if (isNaN(expiryDate.getTime())) {
      return res.status(400).json({ message: 'Invalid license expiry date' })
    }

    const driver = await prisma.driver.create({
      data: {
        name,
        licenseNo,
        licenseCategory,
        licenseExpiry: expiryDate,
        contact,
        safetyScore: scoreInt,
        status: status || 'Available',
      },
    })
    return res.status(201).json(driver)
  } catch (error) {
    console.error('Failed to create driver:', error)
    return res.status(500).json({ message: 'Failed to create driver' })
  }
})

// PUT /api/drivers/:id - Update a driver (write restricted)
router.put('/:id', authMiddleware, requireRole('SafetyOfficer', 'FleetManager'), async (req, res) => {
  const { id } = req.params
  const { name, licenseNo, licenseCategory, licenseExpiry, contact, safetyScore, status } = req.body

  const driverId = parseInt(id, 10)
  if (isNaN(driverId)) {
    return res.status(400).json({ message: 'Invalid driver ID' })
  }

  if (!name || !licenseNo || !licenseCategory || !licenseExpiry || !contact || safetyScore === undefined) {
    return res.status(400).json({ message: 'All driver fields are required' })
  }

  const scoreInt = parseInt(safetyScore, 10)
  if (isNaN(scoreInt) || scoreInt < 0 || scoreInt > 100) {
    return res.status(400).json({ message: 'Safety score must be between 0 and 100' })
  }

  try {
    const expiryDate = new Date(licenseExpiry)
    if (isNaN(expiryDate.getTime())) {
      return res.status(400).json({ message: 'Invalid license expiry date' })
    }

    const updated = await prisma.driver.update({
      where: { id: driverId },
      data: {
        name,
        licenseNo,
        licenseCategory,
        licenseExpiry: expiryDate,
        contact,
        safetyScore: scoreInt,
        status: status || 'Available',
      },
    })
    return res.json(updated)
  } catch (error) {
    console.error('Failed to update driver:', error)
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Driver not found' })
    }
    return res.status(500).json({ message: 'Failed to update driver' })
  }
})

// DELETE /api/drivers/:id - Delete a driver (write restricted)
router.delete('/:id', authMiddleware, requireRole('SafetyOfficer', 'FleetManager'), async (req, res) => {
  const { id } = req.params

  const driverId = parseInt(id, 10)
  if (isNaN(driverId)) {
    return res.status(400).json({ message: 'Invalid driver ID' })
  }

  try {
    await prisma.driver.delete({
      where: { id: driverId },
    })
    return res.json({ message: 'Driver deleted successfully' })
  } catch (error) {
    console.error('Failed to delete driver:', error)
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Driver not found' })
    }
    return res.status(500).json({ message: 'Failed to delete driver' })
  }
})

module.exports = router
