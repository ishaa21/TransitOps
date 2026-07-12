import api from '../api'

const USE_STUB = import.meta.env.VITE_USE_AUTH_STUB === 'true'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

let stubVehicles = [
  {
    id: 1,
    regNo: 'MH-12-AB-1234',
    name: 'Tata Prima 5530',
    type: 'Heavy Truck',
    capacityKg: 25000,
    odometer: 142500,
    acquisitionCost: 3200000,
    status: 'Available',
  },
  {
    id: 2,
    regNo: 'MH-14-CD-5678',
    name: 'Ashok Leyland 4220',
    type: 'Container Truck',
    capacityKg: 18000,
    odometer: 98500,
    acquisitionCost: 2850000,
    status: 'OnTrip',
  },
  {
    id: 3,
    regNo: 'KA-05-MN-9012',
    name: 'Eicher Pro 6048',
    type: 'Tipper',
    capacityKg: 22000,
    odometer: 67800,
    acquisitionCost: 2650000,
    status: 'Available',
  },
  {
    id: 4,
    regNo: 'DL-01-XY-3456',
    name: 'Mahindra Blazo X 49',
    type: 'Heavy Truck',
    capacityKg: 31000,
    odometer: 201300,
    acquisitionCost: 3450000,
    status: 'InShop',
  },
  {
    id: 5,
    regNo: 'TN-09-PQ-7890',
    name: 'Volvo FM 460',
    type: 'Long Haul',
    capacityKg: 28000,
    odometer: 175600,
    acquisitionCost: 5200000,
    status: 'Available',
  },
]

let stubNextId = 6

const shouldFallbackToStub = (error) =>
  USE_STUB ||
  error.code === 'ERR_NETWORK' ||
  error.response?.status === 404 ||
  error.response?.status === 502

export const getVehicles = async () => {
  try {
    const { data } = await api.get('/api/vehicles')
    return data
  } catch (error) {
    if (shouldFallbackToStub(error)) {
      await delay(300)
      return [...stubVehicles]
    }
    throw error
  }
}

export const createVehicle = async (payload) => {
  try {
    const { data } = await api.post('/api/vehicles', payload)
    return data
  } catch (error) {
    if (shouldFallbackToStub(error)) {
      await delay(300)
      // Simulate uniqueness check
      if (stubVehicles.some((v) => v.regNo === payload.regNo)) {
        const err = new Error('Registration No. must be unique')
        err.response = { status: 409, data: { message: 'Registration No. must be unique' } }
        throw err
      }
      const newVehicle = { id: stubNextId++, ...payload }
      stubVehicles.push(newVehicle)
      return newVehicle
    }
    throw error
  }
}

export const updateVehicle = async (id, payload) => {
  try {
    const { data } = await api.put(`/api/vehicles/${id}`, payload)
    return data
  } catch (error) {
    if (shouldFallbackToStub(error)) {
      await delay(300)
      // Simulate uniqueness check (exclude self)
      if (stubVehicles.some((v) => v.regNo === payload.regNo && v.id !== id)) {
        const err = new Error('Registration No. must be unique')
        err.response = { status: 409, data: { message: 'Registration No. must be unique' } }
        throw err
      }
      stubVehicles = stubVehicles.map((v) => (v.id === id ? { ...v, ...payload } : v))
      return stubVehicles.find((v) => v.id === id)
    }
    throw error
  }
}

export const deleteVehicle = async (id) => {
  try {
    await api.delete(`/api/vehicles/${id}`)
  } catch (error) {
    if (shouldFallbackToStub(error)) {
      await delay(300)
      stubVehicles = stubVehicles.filter((v) => v.id !== id)
      return
    }
    throw error
  }
}
