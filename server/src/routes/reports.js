const express = require('express')
const prisma = require('../prisma')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()

// ─── REVENUE ASSUMPTION ───────────────────────────────────────────────────────
// Trips that have no revenue value stored use a flat assumed rate of ₹15/km.
// This is applied only when trip.revenue is null / undefined.
// Formula: assumedRevenue = plannedDistanceKm * REVENUE_PER_KM_DEFAULT
const REVENUE_PER_KM_DEFAULT = 15

// ─── GET /api/reports/analytics ──────────────────────────────────────────────
// Returns:
//   fuelEfficiencyKmPerL  – total distance / total fuel consumed (litres)
//   fleetUtilizationPct   – vehicles currently OnTrip ÷ non-Retired vehicles × 100
//   totalOperationalCost  – fuel cost + maintenance cost + expenses (toll + misc)
//   vehicleRoi            – per-vehicle array: (revenue – (maintenance + fuel)) / acquisitionCost
//   monthlyRevenue        – last-12-months revenue grouped by month
//   topCostliestVehicles  – top-5 vehicles by total operational cost
router.get('/analytics', authMiddleware, async (req, res) => {
  try {
    // 1. Fetch all raw data in parallel
    const [vehicles, trips, fuelLogs, maintenanceLogs, expenses] = await Promise.all([
      prisma.vehicle.findMany(),
      prisma.trip.findMany(),
      prisma.fuelLog.findMany(),
      prisma.maintenanceLog.findMany(),
      prisma.expense.findMany(),
    ])

    // ── Fuel Efficiency ───────────────────────────────────────────────────────
    // Distance = sum of plannedDistanceKm for Completed trips
    // Fuel     = sum of all liters logged across FuelLog
    const completedTrips = trips.filter((t) => t.status === 'Completed')
    const totalDistanceKm = completedTrips.reduce((s, t) => s + (t.plannedDistanceKm ?? 0), 0)
    const totalFuelLiters = fuelLogs.reduce((s, l) => s + (l.liters ?? 0), 0)
    const fuelEfficiencyKmPerL =
      totalFuelLiters > 0 ? parseFloat((totalDistanceKm / totalFuelLiters).toFixed(2)) : 0

    // ── Fleet Utilisation ─────────────────────────────────────────────────────
    // Active fleet = all non-Retired vehicles
    // In-use = vehicles currently OnTrip
    const nonRetired = vehicles.filter((v) => v.status !== 'Retired')
    const onTrip = nonRetired.filter((v) => v.status === 'OnTrip')
    const fleetUtilizationPct =
      nonRetired.length > 0
        ? parseFloat(((onTrip.length / nonRetired.length) * 100).toFixed(1))
        : 0

    // ── Operational Cost (fleet-wide totals) ──────────────────────────────────
    const totalFuelCost = fuelLogs.reduce((s, l) => s + (l.cost ?? 0), 0)
    const totalMaintCost = maintenanceLogs.reduce((s, l) => s + (l.cost ?? 0), 0)
    const totalExpCost = expenses.reduce((s, e) => s + (e.toll ?? 0) + (e.misc ?? 0), 0)
    const totalOperationalCost = parseFloat(
      (totalFuelCost + totalMaintCost + totalExpCost).toFixed(2)
    )

    // ── Per-Vehicle Aggregates (for ROI + costliest list) ─────────────────────
    const fuelCostMap = {}
    const fuelLiterMap = {}
    const maintCostMap = {}
    const expCostMap = {}
    const revenueMap = {}

    fuelLogs.forEach((l) => {
      fuelCostMap[l.vehicleId] = (fuelCostMap[l.vehicleId] ?? 0) + (l.cost ?? 0)
      fuelLiterMap[l.vehicleId] = (fuelLiterMap[l.vehicleId] ?? 0) + (l.liters ?? 0)
    })
    maintenanceLogs.forEach((l) => {
      maintCostMap[l.vehicleId] = (maintCostMap[l.vehicleId] ?? 0) + (l.cost ?? 0)
    })
    expenses.forEach((e) => {
      expCostMap[e.vehicleId] = (expCostMap[e.vehicleId] ?? 0) + (e.toll ?? 0) + (e.misc ?? 0)
    })

    // Revenue per vehicle – use stored trip.revenue when available,
    // otherwise assume ₹15/km (REVENUE_PER_KM_DEFAULT).
    trips.forEach((t) => {
      // Only count Completed trips toward vehicle revenue
      if (t.status !== 'Completed') return
      const rev =
        t.revenue !== null && t.revenue !== undefined
          ? t.revenue
          : t.plannedDistanceKm * REVENUE_PER_KM_DEFAULT
      revenueMap[t.vehicleId] = (revenueMap[t.vehicleId] ?? 0) + rev
    })

    // ── Vehicle ROI ───────────────────────────────────────────────────────────
    // ROI = (Revenue – (Maintenance + Fuel)) / AcquisitionCost
    // Expressed as a percentage. 0 if acquisitionCost is 0.
    const vehicleRoi = vehicles.map((v) => {
      const revenue = revenueMap[v.id] ?? 0
      const fuel = fuelCostMap[v.id] ?? 0
      const maint = maintCostMap[v.id] ?? 0
      const exp = expCostMap[v.id] ?? 0
      const totalCost = fuel + maint + exp
      const profit = revenue - totalCost
      const roi =
        v.acquisitionCost > 0
          ? parseFloat(((profit / v.acquisitionCost) * 100).toFixed(2))
          : 0
      return {
        vehicleId: v.id,
        vehicleName: v.name,
        vehicleRegNo: v.regNo,
        acquisitionCost: v.acquisitionCost,
        revenue: parseFloat(revenue.toFixed(2)),
        totalFuelCost: parseFloat(fuel.toFixed(2)),
        totalMaintenanceCost: parseFloat(maint.toFixed(2)),
        totalExpenses: parseFloat(exp.toFixed(2)),
        totalOperationalCost: parseFloat(totalCost.toFixed(2)),
        roi,
      }
    })

    // Average ROI across vehicles that have a non-zero acquisition cost
    const roiVehicles = vehicleRoi.filter((v) => v.acquisitionCost > 0)
    const avgRoi =
      roiVehicles.length > 0
        ? parseFloat(
            (roiVehicles.reduce((s, v) => s + v.roi, 0) / roiVehicles.length).toFixed(2)
          )
        : 0

    // ── Monthly Revenue (last 12 months) ─────────────────────────────────────
    // Groups Completed trip revenues by calendar month (YYYY-MM).
    // For each trip: uses stored revenue or the ₹15/km assumed rate.
    const now = new Date()
    const monthlyMap = {}

    // Initialise last 12 months so they appear even with no data
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthlyMap[key] = 0
    }

    // We need a date for each trip – use createdAt if available, else skip
    // The Trip model has no createdAt; we approximate using the first fuelLog
    // date linked to the same vehicle, or fall back to current month.
    // ── NOTE: Trip model has no timestamp. We group ALL completed trips into
    //    the current month for simplicity. A future migration adding `completedAt`
    //    would make this more precise.
    completedTrips.forEach((t) => {
      const rev =
        t.revenue !== null && t.revenue !== undefined
          ? t.revenue
          : t.plannedDistanceKm * REVENUE_PER_KM_DEFAULT
      // Use current month key as fallback (no timestamp on Trip)
      const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      if (key in monthlyMap) {
        monthlyMap[key] = (monthlyMap[key] ?? 0) + rev
      }
    })

    // Convert map → sorted array for the chart
    const monthlyRevenue = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, revenue]) => ({
        month,
        label: new Date(month + '-01').toLocaleDateString('en-IN', {
          month: 'short',
          year: '2-digit',
        }),
        revenue: parseFloat(revenue.toFixed(2)),
      }))

    // ── Top 5 Costliest Vehicles ───────────────────────────────────────────────
    const topCostliestVehicles = [...vehicleRoi]
      .sort((a, b) => b.totalOperationalCost - a.totalOperationalCost)
      .slice(0, 5)
      .map((v) => ({
        vehicleId: v.vehicleId,
        vehicleName: v.vehicleName,
        vehicleRegNo: v.vehicleRegNo,
        totalOperationalCost: v.totalOperationalCost,
      }))

    return res.json({
      fuelEfficiencyKmPerL,
      fleetUtilizationPct,
      totalOperationalCost,
      avgRoi,
      vehicleRoi,
      monthlyRevenue,
      topCostliestVehicles,
      meta: {
        revenueAssumption: `Trips without a stored revenue value use ₹${REVENUE_PER_KM_DEFAULT}/km as a flat assumed rate.`,
        totalVehicles: vehicles.length,
        completedTrips: completedTrips.length,
        totalFuelLiters,
        totalDistanceKm,
      },
    })
  } catch (error) {
    console.error('Failed to fetch analytics:', error)
    return res.status(500).json({ message: 'Failed to fetch analytics' })
  }
})

module.exports = router
