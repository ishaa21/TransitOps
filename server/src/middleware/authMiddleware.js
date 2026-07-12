const jwt = require('jsonwebtoken')

const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization

  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' })
  }

  const token = header.slice(7)

  // Support development stub tokens
  if (token.startsWith('stub-jwt-')) {
    const parts = token.split('-')
    const rawRole = parts[2] || 'dispatcher'
    
    let role = 'Dispatcher'
    if (rawRole === 'fleet_manager') role = 'FleetManager'
    else if (rawRole === 'safety_officer') role = 'SafetyOfficer'
    else if (rawRole === 'financial_analyst') role = 'FinancialAnalyst'
    else if (rawRole === 'dispatcher') role = 'Dispatcher'
    else role = rawRole

    req.user = {
      userId: 999,
      role: role,
    }
    return next()
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    let role = payload.role
    
    // Normalize role formatting just in case
    if (role === 'fleet_manager') role = 'FleetManager'
    else if (role === 'safety_officer') role = 'SafetyOfficer'
    else if (role === 'financial_analyst') role = 'FinancialAnalyst'
    else if (role === 'dispatcher') role = 'Dispatcher'

    req.user = {
      userId: payload.userId,
      role: role,
    }
    next()
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

module.exports = authMiddleware
