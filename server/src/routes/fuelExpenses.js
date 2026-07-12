const express = require('express')
const prisma = require('../prisma')
const authMiddleware = require('../middleware/authMiddleware')
const requireRole = require('../middleware/requireRole')

const router = express.Router()

// ─── Helper: resolve vehicle names in-memory ─────────────────────────────────
async function resolveVehicleMap(ids) {
  if (!ids.length) return {}
  const vehicles = await prisma.vehicle.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, regNo: true },
  })
  return Object.fromEntries(vehicles.map((v) => [v.id, v]))
}

// ─── Helper: resolve trip source→destination in-memory ───────────────────────
async function resolveTripMap(ids) {
  const filtered = ids.filter(Boolean)
  if (!filtered.length) return {}
  const trips = await prisma.trip.findMany({
    where: { id: { in: filtered } },
    select: { id: true, source: true, destination: true },
  })
  return Object.fromEntries(trips.map((t) => [t.id, t]))
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUEL LOGS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/fuel-logs
router.get('/fuel-logs', authMiddleware, requireRole('FinancialAnalyst'), async (req, res) => {
  try {
    const logs = await prisma.fuelLog.findMany({ orderBy: { date: 'desc' } })

    const vehicleIds = [...new Set(logs.map((l) => l.vehicleId))]
    const vehicleMap = await resolveVehicleMap(vehicleIds)

    const result = logs.map((log) => ({
      ...log,
      vehicleName: vehicleMap[log.vehicleId]?.name ?? 'Unknown',
      vehicleRegNo: vehicleMap[log.vehicleId]?.regNo ?? 'Unknown',
    }))

    return res.json(result)
  } catch (error) {
    console.error('Failed to fetch fuel logs:', error)
    return res.status(500).json({ message: 'Failed to fetch fuel logs' })
  }
})

// POST /api/fuel-logs
router.post('/fuel-logs', authMiddleware, requireRole('FinancialAnalyst'), async (req, res) => {
  const { vehicleId, liters, cost, date } = req.body

  if (!vehicleId || liters === undefined || cost === undefined || !date) {
    return res.status(400).json({ message: 'vehicleId, liters, cost and date are required' })
  }

  const vid = parseInt(vehicleId, 10)
  if (isNaN(vid)) return res.status(400).json({ message: 'Invalid vehicleId' })

  try {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vid } })
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' })

    const log = await prisma.fuelLog.create({
      data: {
        vehicleId: vid,
        liters: parseFloat(liters),
        cost: parseFloat(cost),
        date: new Date(date),
      },
    })

    return res.status(201).json({
      ...log,
      vehicleName: vehicle.name,
      vehicleRegNo: vehicle.regNo,
    })
  } catch (error) {
    console.error('Failed to create fuel log:', error)
    return res.status(500).json({ message: 'Failed to create fuel log' })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// EXPENSES
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/expenses
router.get('/expenses', authMiddleware, requireRole('FinancialAnalyst'), async (req, res) => {
  try {
    const expenses = await prisma.expense.findMany({ orderBy: { date: 'desc' } })

    const vehicleIds = [...new Set(expenses.map((e) => e.vehicleId))]
    const tripIds = [...new Set(expenses.map((e) => e.tripId))]

    const [vehicleMap, tripMap] = await Promise.all([
      resolveVehicleMap(vehicleIds),
      resolveTripMap(tripIds),
    ])

    const result = expenses.map((exp) => ({
      ...exp,
      total: (exp.toll ?? 0) + (exp.misc ?? 0),
      vehicleName: vehicleMap[exp.vehicleId]?.name ?? 'Unknown',
      vehicleRegNo: vehicleMap[exp.vehicleId]?.regNo ?? 'Unknown',
      tripRoute: exp.tripId
        ? `${tripMap[exp.tripId]?.source ?? '?'} → ${tripMap[exp.tripId]?.destination ?? '?'}`
        : null,
    }))

    return res.json(result)
  } catch (error) {
    console.error('Failed to fetch expenses:', error)
    return res.status(500).json({ message: 'Failed to fetch expenses' })
  }
})

// POST /api/expenses
router.post('/expenses', authMiddleware, requireRole('FinancialAnalyst'), async (req, res) => {
  const { vehicleId, tripId, toll, misc, date } = req.body

  if (!vehicleId || toll === undefined || misc === undefined || !date) {
    return res.status(400).json({ message: 'vehicleId, toll, misc and date are required' })
  }

  const vid = parseInt(vehicleId, 10)
  if (isNaN(vid)) return res.status(400).json({ message: 'Invalid vehicleId' })

  const tid = tripId ? parseInt(tripId, 10) : null

  try {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vid } })
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' })

    if (tid) {
      const trip = await prisma.trip.findUnique({ where: { id: tid } })
      if (!trip) return res.status(404).json({ message: 'Trip not found' })
    }

    const expense = await prisma.expense.create({
      data: {
        vehicleId: vid,
        tripId: tid,
        toll: parseFloat(toll),
        misc: parseFloat(misc),
        date: new Date(date),
      },
    })

    let tripRoute = null
    if (tid) {
      const trip = await prisma.trip.findUnique({ where: { id: tid }, select: { source: true, destination: true } })
      tripRoute = trip ? `${trip.source} → ${trip.destination}` : null
    }

    return res.status(201).json({
      ...expense,
      total: expense.toll + expense.misc,
      vehicleName: vehicle.name,
      vehicleRegNo: vehicle.regNo,
      tripRoute,
    })
  } catch (error) {
    console.error('Failed to create expense:', error)
    return res.status(500).json({ message: 'Failed to create expense' })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// OPERATIONAL COST PER VEHICLE
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/vehicles/:id/operational-cost
router.get('/vehicles/:id/operational-cost', authMiddleware, requireRole('FinancialAnalyst'), async (req, res) => {
  const vid = parseInt(req.params.id, 10)
  if (isNaN(vid)) return res.status(400).json({ message: 'Invalid vehicle ID' })

  try {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vid } })
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' })

    const [fuelLogs, maintenanceLogs, expenses] = await Promise.all([
      prisma.fuelLog.findMany({ where: { vehicleId: vid } }),
      prisma.maintenanceLog.findMany({ where: { vehicleId: vid } }),
      prisma.expense.findMany({ where: { vehicleId: vid } }),
    ])

    const totalFuelCost = fuelLogs.reduce((s, l) => s + (l.cost ?? 0), 0)
    const totalFuelLiters = fuelLogs.reduce((s, l) => s + (l.liters ?? 0), 0)
    const totalMaintenanceCost = maintenanceLogs.reduce((s, l) => s + (l.cost ?? 0), 0)
    const totalToll = expenses.reduce((s, e) => s + (e.toll ?? 0), 0)
    const totalMisc = expenses.reduce((s, e) => s + (e.misc ?? 0), 0)
    const totalExpenses = totalToll + totalMisc

    return res.json({
      vehicleId: vid,
      vehicleName: vehicle.name,
      vehicleRegNo: vehicle.regNo,
      vehicleStatus: vehicle.status,
      totalFuelCost,
      totalFuelLiters,
      totalMaintenanceCost,
      totalToll,
      totalMisc,
      totalExpenses,
      totalOperationalCost: totalFuelCost + totalMaintenanceCost + totalExpenses,
      fuelLogCount: fuelLogs.length,
      maintenanceLogCount: maintenanceLogs.length,
      expenseCount: expenses.length,
    })
  } catch (error) {
    console.error('Failed to fetch operational cost:', error)
    return res.status(500).json({ message: 'Failed to fetch operational cost' })
  }
})

// GET /api/vehicles/operational-cost  (all vehicles summary)
router.get('/vehicles/operational-cost', authMiddleware, requireRole('FinancialAnalyst'), async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({ orderBy: { id: 'asc' } })

    const [allFuel, allMaint, allExp] = await Promise.all([
      prisma.fuelLog.findMany(),
      prisma.maintenanceLog.findMany(),
      prisma.expense.findMany(),
    ])

    const fuelByVehicle = {}
    const fuelLitersByVehicle = {}
    const maintByVehicle = {}
    const expByVehicle = {}

    allFuel.forEach((l) => {
      fuelByVehicle[l.vehicleId] = (fuelByVehicle[l.vehicleId] ?? 0) + (l.cost ?? 0)
      fuelLitersByVehicle[l.vehicleId] = (fuelLitersByVehicle[l.vehicleId] ?? 0) + (l.liters ?? 0)
    })
    allMaint.forEach((l) => {
      maintByVehicle[l.vehicleId] = (maintByVehicle[l.vehicleId] ?? 0) + (l.cost ?? 0)
    })
    allExp.forEach((e) => {
      expByVehicle[e.vehicleId] = (expByVehicle[e.vehicleId] ?? 0) + (e.toll ?? 0) + (e.misc ?? 0)
    })

    const result = vehicles.map((v) => {
      const fuel = fuelByVehicle[v.id] ?? 0
      const maint = maintByVehicle[v.id] ?? 0
      const exp = expByVehicle[v.id] ?? 0
      return {
        vehicleId: v.id,
        vehicleName: v.name,
        vehicleRegNo: v.regNo,
        vehicleStatus: v.status,
        totalFuelCost: fuel,
        totalFuelLiters: fuelLitersByVehicle[v.id] ?? 0,
        totalMaintenanceCost: maint,
        totalExpenses: exp,
        totalOperationalCost: fuel + maint + exp,
      }
    })

    return res.json(result)
  } catch (error) {
    console.error('Failed to fetch all operational costs:', error)
    return res.status(500).json({ message: 'Failed to fetch operational costs' })
  }
})

module.exports = router
