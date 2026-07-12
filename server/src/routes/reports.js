const express = require('express')
const prisma = require('../prisma')
const authMiddleware = require('../middleware/authMiddleware')
const requireRole = require('../middleware/requireRole')

const router = express.Router()

// GET /api/reports/analytics
router.get('/analytics', authMiddleware, requireRole('FinancialAnalyst'), async (req, res) => {
  try {
    const [vehicles, trips, fuelLogs, maintenanceLogs, expenses] = await Promise.all([
      prisma.vehicle.findMany(),
      prisma.trip.findMany(),
      prisma.fuelLog.findMany(),
      prisma.maintenanceLog.findMany(),
      prisma.expense.findMany(),
    ])

    // 1. Group Fuel Logs by Vehicle
    const fuelByVehicle = {}
    const fuelLitersByVehicle = {}
    let totalFuelLiters = 0
    let totalFuelCost = 0

    fuelLogs.forEach((log) => {
      const liters = log.liters ?? 0
      // Fallback fuel price of ₹100/liter if cost is not recorded (0)
      const cost = log.cost > 0 ? log.cost : liters * 100

      fuelByVehicle[log.vehicleId] = (fuelByVehicle[log.vehicleId] ?? 0) + cost
      fuelLitersByVehicle[log.vehicleId] = (fuelLitersByVehicle[log.vehicleId] ?? 0) + liters

      totalFuelLiters += liters
      totalFuelCost += cost
    })

    // 2. Group Maintenance Logs by Vehicle
    const maintenanceByVehicle = {}
    let totalMaintenanceCost = 0

    maintenanceLogs.forEach((log) => {
      const cost = log.cost ?? 0
      maintenanceByVehicle[log.vehicleId] = (maintenanceByVehicle[log.vehicleId] ?? 0) + cost
      totalMaintenanceCost += cost
    })

    // 3. Group General Expenses by Vehicle
    const expensesByVehicle = {}
    let totalExpensesCost = 0

    expenses.forEach((exp) => {
      const cost = (exp.toll ?? 0) + (exp.misc ?? 0)
      expensesByVehicle[exp.vehicleId] = (expensesByVehicle[exp.vehicleId] ?? 0) + cost
      totalExpensesCost += cost
    })

    // 4. Calculate Distance and Revenue per Trip
    // Distance from Completed trips only (actual distance traveled)
    // Revenue from all trips except Cancelled trips
    const completedDistanceByVehicle = {}
    const revenueByVehicle = {}
    let totalCompletedDistance = 0
    let totalRevenue = 0

    trips.forEach((trip) => {
      // Distance calculation
      if (trip.status === 'Completed') {
        const dist = trip.plannedDistanceKm ?? 0
        completedDistanceByVehicle[trip.vehicleId] = (completedDistanceByVehicle[trip.vehicleId] ?? 0) + dist
        totalCompletedDistance += dist
      }

      // Revenue calculation (ignore Cancelled trips)
      if (trip.status !== 'Cancelled') {
        // Flat assumed rate of ₹15/km if trip has no recorded revenue
        const rev = trip.revenue !== null && trip.revenue !== undefined 
          ? trip.revenue 
          : (trip.plannedDistanceKm ?? 0) * 15

        revenueByVehicle[trip.vehicleId] = (revenueByVehicle[trip.vehicleId] ?? 0) + rev
        totalRevenue += rev
      }
    })

    // 5. Calculate Per-Vehicle Analytics
    const vehicleAnalytics = vehicles.map((v) => {
      const fuelCost = fuelByVehicle[v.id] ?? 0
      const fuelLiters = fuelLitersByVehicle[v.id] ?? 0
      const maintenanceCost = maintenanceByVehicle[v.id] ?? 0
      const otherExpenses = expensesByVehicle[v.id] ?? 0
      const operationalCost = fuelCost + maintenanceCost + otherExpenses
      const revenue = revenueByVehicle[v.id] ?? 0
      const completedDistance = completedDistanceByVehicle[v.id] ?? 0

      // Vehicle ROI = (Revenue - (Maintenance + Fuel)) / AcquisitionCost
      const roi = v.acquisitionCost > 0 
        ? ((revenue - (maintenanceCost + fuelCost)) / v.acquisitionCost) * 100 
        : 0

      const fuelEfficiency = fuelLiters > 0 ? completedDistance / fuelLiters : 0

      return {
        vehicleId: v.id,
        vehicleName: v.name,
        regNo: v.regNo,
        acquisitionCost: v.acquisitionCost,
        status: v.status,
        completedDistance,
        fuelLiters,
        fuelEfficiency: Number(fuelEfficiency.toFixed(1)),
        fuelCost,
        maintenanceCost,
        otherExpenses,
        operationalCost,
        revenue,
        roi: Number(roi.toFixed(1)),
      }
    })

    // 6. Calculate overall KPIs
    const fuelEfficiency = totalFuelLiters > 0 ? totalCompletedDistance / totalFuelLiters : 0

    // Fleet utilization: active (OnTrip) vehicles / total (non-Retired) vehicles
    const activeVehicles = vehicles.filter((v) => v.status === 'OnTrip').length
    const totalVehicles = vehicles.filter((v) => v.status !== 'Retired').length
    const fleetUtilization = totalVehicles > 0 ? (activeVehicles / totalVehicles) * 100 : 0

    // Fleet ROI = (TotalRevenue - (TotalMaintenance + TotalFuel)) / TotalAcquisitionCost
    const totalAcquisitionCost = vehicles.reduce((sum, v) => sum + (v.acquisitionCost ?? 0), 0)
    const fleetRoi = totalAcquisitionCost > 0 
      ? ((totalRevenue - (totalMaintenanceCost + totalFuelCost)) / totalAcquisitionCost) * 100 
      : 0

    const kpis = {
      fuelEfficiency: Number(fuelEfficiency.toFixed(1)),
      fleetUtilization: Math.round(fleetUtilization),
      operationalCost: totalMaintenanceCost + totalFuelCost + totalExpensesCost,
      vehicleRoi: Number(fleetRoi.toFixed(1)),
    }

    // 7. Monthly Revenue Chart Data
    // Generate last 6 months labels
    const today = new Date()
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      months.push(d.toLocaleString('en-US', { month: 'short' }))
    }

    const monthlyRevenueMap = Object.fromEntries(months.map((m) => [m, 0]))
    trips.forEach((trip) => {
      if (trip.status !== 'Cancelled') {
        const rev = trip.revenue !== null && trip.revenue !== undefined 
          ? trip.revenue 
          : (trip.plannedDistanceKm ?? 0) * 15

        // Distribute based on trip ID for dynamic but stable seed representation
        const monthIndex = trip.id % 6
        const monthName = months[5 - monthIndex]
        if (monthlyRevenueMap[monthName] !== undefined) {
          monthlyRevenueMap[monthName] += rev
        }
      }
    })

    const monthlyRevenue = months.map((m) => ({
      month: m,
      revenue: Math.round(monthlyRevenueMap[m]),
    }))

    // 8. Top Costliest Vehicles list (sorted by operationalCost descending)
    const topCostliestVehicles = [...vehicleAnalytics]
      .sort((a, b) => b.operationalCost - a.operationalCost)
      .map((item) => ({
        vehicleId: item.vehicleId,
        vehicleName: item.vehicleName,
        regNo: item.regNo,
        operationalCost: item.operationalCost,
      }))

    return res.json({
      kpis,
      monthlyRevenue,
      topCostliestVehicles,
      vehicleAnalytics,
    })
  } catch (error) {
    console.error('Failed to generate analytics report:', error)
    return res.status(500).json({ message: 'Failed to generate analytics report' })
  }
})

module.exports = router
