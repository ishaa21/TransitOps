const express = require('express')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const prisma = require('../prisma')
const { isValidRole } = require('../constants/roles')

const router = express.Router()

const SALT_ROUNDS = 10

router.post('/register', async (req, res) => {
  const { email, password, role } = req.body

  if (!email || !password || !role) {
    return res.status(400).json({ message: 'Email, password, and role are required' })
  }

  if (!isValidRole(role)) {
    return res.status(400).json({
      message: 'Invalid role',
      allowedRoles: ['FleetManager', 'Dispatcher', 'SafetyOfficer', 'FinancialAnalyst'],
    })
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' })
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

    const user = await prisma.user.create({
      data: { email, password: hashedPassword, role },
      select: { id: true, email: true, role: true, createdAt: true },
    })

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
    )

    return res.status(201).json({
      token,
      user: { id: user.id, email: user.email, role: user.role },
    })
  } catch (error) {
    console.error('Register error:', error)
    return res.status(500).json({ message: 'Registration failed' })
  }
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' })
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
    )

    return res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role },
    })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ message: 'Login failed' })
  }
})

module.exports = router
