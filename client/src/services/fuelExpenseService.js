import api from '../api'

const USE_STUB = import.meta.env.VITE_USE_AUTH_STUB === 'true'
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const shouldFallbackToStub = (_error) => USE_STUB

// ─── Stub data ────────────────────────────────────────────────────────────────
let stubFuelLogs = [
  { id: 1, vehicleId: 1, vehicleName: 'Tata Prima 5530', vehicleRegNo: 'MH-12-AB-1234', liters: 120, cost: 9600, date: '2026-06-01T00:00:00.000Z' },
  { id: 2, vehicleId: 2, vehicleName: 'Ashok Leyland 4220', vehicleRegNo: 'MH-14-CD-5678', liters: 95, cost: 7600, date: '2026-06-15T00:00:00.000Z' },
]
let fuelNextId = 3

let stubExpenses = [
  { id: 1, vehicleId: 1, tripId: 1, tripRoute: 'Mumbai → Pune', vehicleName: 'Tata Prima 5530', vehicleRegNo: 'MH-12-AB-1234', toll: 240, misc: 500, total: 740, date: '2026-06-01T00:00:00.000Z' },
]
let expNextId = 2

const stubOpCosts = [
  { vehicleId: 1, vehicleName: 'Tata Prima 5530', vehicleRegNo: 'MH-12-AB-1234', vehicleStatus: 'Available', totalFuelCost: 9600, totalFuelLiters: 120, totalMaintenanceCost: 85000, totalExpenses: 740, totalOperationalCost: 95340 },
  { vehicleId: 2, vehicleName: 'Ashok Leyland 4220', vehicleRegNo: 'MH-14-CD-5678', vehicleStatus: 'OnTrip', totalFuelCost: 7600, totalFuelLiters: 95, totalMaintenanceCost: 24000, totalExpenses: 0, totalOperationalCost: 31600 },
]

// ═══════════════════════════════════════════════════════════════════════════════
// FUEL LOGS
// ═══════════════════════════════════════════════════════════════════════════════

export const getFuelLogs = async () => {
  try {
    const { data } = await api.get('/api/fuel-logs')
    return data
  } catch (error) {
    if (shouldFallbackToStub(error)) {
      await delay(300)
      return [...stubFuelLogs]
    }
    throw error
  }
}

export const createFuelLog = async (payload) => {
  try {
    const { data } = await api.post('/api/fuel-logs', payload)
    return data
  } catch (error) {
    if (shouldFallbackToStub(error)) {
      await delay(300)
      const newLog = {
        id: fuelNextId++,
        vehicleId: Number(payload.vehicleId),
        vehicleName: payload.vehicleName ?? 'Unknown',
        vehicleRegNo: payload.vehicleRegNo ?? 'Unknown',
        liters: Number(payload.liters),
        cost: Number(payload.cost),
        date: payload.date,
      }
      stubFuelLogs.unshift(newLog)
      return newLog
    }
    throw error
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPENSES
// ═══════════════════════════════════════════════════════════════════════════════

export const getExpenses = async () => {
  try {
    const { data } = await api.get('/api/expenses')
    return data
  } catch (error) {
    if (shouldFallbackToStub(error)) {
      await delay(300)
      return [...stubExpenses]
    }
    throw error
  }
}

export const createExpense = async (payload) => {
  try {
    const { data } = await api.post('/api/expenses', payload)
    return data
  } catch (error) {
    if (shouldFallbackToStub(error)) {
      await delay(300)
      const newExp = {
        id: expNextId++,
        vehicleId: Number(payload.vehicleId),
        tripId: payload.tripId ? Number(payload.tripId) : null,
        tripRoute: payload.tripRoute ?? null,
        vehicleName: payload.vehicleName ?? 'Unknown',
        vehicleRegNo: payload.vehicleRegNo ?? 'Unknown',
        toll: Number(payload.toll),
        misc: Number(payload.misc),
        total: Number(payload.toll) + Number(payload.misc),
        date: payload.date,
      }
      stubExpenses.unshift(newExp)
      return newExp
    }
    throw error
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPERATIONAL COST
// ═══════════════════════════════════════════════════════════════════════════════

export const getAllOperationalCosts = async () => {
  try {
    const { data } = await api.get('/api/vehicles/operational-cost')
    return data
  } catch (error) {
    if (shouldFallbackToStub(error)) {
      await delay(300)
      return [...stubOpCosts]
    }
    throw error
  }
}

export const getVehicleOperationalCost = async (vehicleId) => {
  try {
    const { data } = await api.get(`/api/vehicles/${vehicleId}/operational-cost`)
    return data
  } catch (error) {
    if (shouldFallbackToStub(error)) {
      await delay(300)
      return stubOpCosts.find((c) => c.vehicleId === Number(vehicleId)) ?? null
    }
    throw error
  }
}
