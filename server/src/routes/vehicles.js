const express = require('express')
const prisma = require('../prisma')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()

// GET /api/vehicles - Fetch all vehicles (protected)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany()
    return res.json(vehicles)
  } catch (error) {
    console.error('Failed to fetch vehicles:', error)
    return res.status(500).json({ message: 'Failed to fetch vehicles' })
  }
})

module.exports = router
