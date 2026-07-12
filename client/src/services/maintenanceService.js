import api from '../api'

const USE_STUB = import.meta.env.VITE_USE_AUTH_STUB === 'true'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// ─── Stub data ────────────────────────────────────────────────────────────────
let stubLogs = [
  {
    id: 1,
    vehicleId: 1,
    vehicleName: 'Tata Prima 5530',
    vehicleRegNo: 'MH-12-AB-1234',
    serviceType: 'Engine Overhaul',
    cost: 85000,
    date: '2026-05-10T00:00:00.000Z',
    status: 'Completed',
  },
  {
    id: 2,
    vehicleId: 4,
    vehicleName: 'Mahindra Blazo X 49',
    vehicleRegNo: 'DL-01-XY-3456',
    serviceType: 'Brake Replacement',
    cost: 24000,
    date: '2026-06-18T00:00:00.000Z',
    status: 'Active',
  },
  {
    id: 3,
    vehicleId: 3,
    vehicleName: 'Eicher Pro 6048',
    vehicleRegNo: 'KA-05-MN-9012',
    serviceType: 'Tyre Rotation',
    cost: 8500,
    date: '2026-07-01T00:00:00.000Z',
    status: 'Completed',
  },
]

let stubNextId = 4

const shouldFallbackToStub = (_error) => USE_STUB

// ─── GET /api/maintenance ─────────────────────────────────────────────────────
export const getMaintenanceLogs = async () => {
  try {
    const { data } = await api.get('/api/maintenance')
    return data
  } catch (error) {
    if (shouldFallbackToStub(error)) {
      await delay(300)
      return [...stubLogs]
    }
    throw error
  }
}

import { _getStubVehicles, _setStubVehicleStatus } from './vehicleService'

// ─── POST /api/maintenance ────────────────────────────────────────────────────
export const createMaintenanceLog = async (payload) => {
  try {
    const { data } = await api.post('/api/maintenance', payload)
    return data
  } catch (error) {
    if (shouldFallbackToStub(error)) {
      await delay(300)
      const newLog = {
        id: stubNextId++,
        ...payload,
        vehicleId: Number(payload.vehicleId),
        cost: Number(payload.cost),
        vehicleName: payload.vehicleName ?? 'Unknown',
        vehicleRegNo: payload.vehicleRegNo ?? 'Unknown',
        status: 'Active',
      }
      stubLogs.unshift(newLog)
      _setStubVehicleStatus(payload.vehicleId, 'InShop')
      return newLog
    }
    throw error
  }
}

// ─── PUT /api/maintenance/:id/complete ───────────────────────────────────────
export const completeMaintenanceLog = async (id) => {
  try {
    const { data } = await api.put(`/api/maintenance/${id}/complete`)
    return data
  } catch (error) {
    if (shouldFallbackToStub(error)) {
      await delay(300)
      const idx = stubLogs.findIndex((l) => l.id === id)
      if (idx === -1) throw new Error('Log not found')
      stubLogs[idx] = { ...stubLogs[idx], status: 'Completed' }
      
      const v = _getStubVehicles().find((x) => x.id === Number(stubLogs[idx].vehicleId))
      const isRetired = v && v.status === 'Retired'
      const targetStatus = isRetired ? 'Retired' : 'Available'
      
      _setStubVehicleStatus(stubLogs[idx].vehicleId, targetStatus)
      
      return {
        ...stubLogs[idx],
        vehicleStatus: targetStatus
      }
    }
    throw error
  }
}

// ─── Stub helpers for cross-service linking ──────────────────────────────────
export const _getStubLogs = () => stubLogs
