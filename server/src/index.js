require('dotenv').config()

const express = require('express')
const cors = require('cors')
const authRoutes = require('./routes/auth')
const dashboardRoutes = require('./routes/dashboard')
const driverRoutes = require('./routes/drivers')
const vehicleRoutes = require('./routes/vehicles')
const tripRoutes = require('./routes/trips')
const maintenanceRoutes = require('./routes/maintenance')
const fuelExpensesRoutes = require('./routes/fuelExpenses')
const reportsRoutes = require('./routes/reports')

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/drivers', driverRoutes)
app.use('/api/vehicles', vehicleRoutes)
app.use('/api/trips', tripRoutes)
app.use('/api/maintenance', maintenanceRoutes)
app.use('/api/reports', reportsRoutes)
app.use('/api', fuelExpensesRoutes)

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ message: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`TransitOps API listening on port ${PORT}`)
})
