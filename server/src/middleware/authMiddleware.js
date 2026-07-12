const jwt = require('jsonwebtoken')

const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization

  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' })
  }

  const token = header.slice(7)

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.user = {
      userId: payload.userId,
      role: payload.role,
    }
    next()
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

module.exports = authMiddleware
