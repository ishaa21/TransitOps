const express = require('express')
const { PrismaClient } = require('@prisma/client')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()
const prisma = new PrismaClient()

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
