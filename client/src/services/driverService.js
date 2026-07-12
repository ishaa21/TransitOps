import api from '../api'

const USE_STUB = import.meta.env.VITE_USE_AUTH_STUB === 'true'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

let stubDrivers = [
  {
    id: 1,
    name: 'Rajesh Kumar',
    licenseNo: 'DL-2020-45821',
    licenseCategory: 'HMV',
    licenseExpiry: '2027-06-15',
    contact: '+91-9876543210',
    safetyScore: 92,
    status: 'Available',
  },
  {
    id: 2,
    name: 'Suresh Patel',
    licenseNo: 'GJ-2019-33102',
    licenseCategory: 'HMV',
    licenseExpiry: '2026-11-20',
    contact: '+91-9876543211',
    safetyScore: 88,
    status: 'OnTrip',
  },
  {
    id: 3,
    name: 'Amit Sharma',
    licenseNo: 'RJ-2021-77234',
    licenseCategory: 'HMV',
    licenseExpiry: '2028-03-10',
    contact: '+91-9876543212',
    safetyScore: 95,
    status: 'Available',
  },
  {
    id: 4,
    name: 'Vikram Singh',
    licenseNo: 'UP-2018-11987',
    licenseCategory: 'HMV',
    licenseExpiry: '2026-08-05',
    contact: '+91-9876543213',
    safetyScore: 76,
    status: 'OffDuty',
  },
  {
    id: 5,
    name: 'Deepak Reddy',
    licenseNo: 'AP-2022-55643',
    licenseCategory: 'HMV',
    licenseExpiry: '2029-01-25',
    contact: '+91-9876543214',
    safetyScore: 90,
    status: 'Available',
  },
]

const shouldFallbackToStub = (_error) => USE_STUB

export const getDrivers = async () => {
  try {
    const { data } = await api.get('/api/drivers')
    return data
  } catch (error) {
    if (shouldFallbackToStub(error)) {
      await delay(300)
      return [...stubDrivers]
    }
    throw error
  }
}

export const createDriver = async (driverData) => {
  try {
    const { data } = await api.post('/api/drivers', driverData)
    return data
  } catch (error) {
    if (shouldFallbackToStub(error)) {
      await delay(300)
      const newDriver = {
        id: stubDrivers.length ? Math.max(...stubDrivers.map((d) => d.id)) + 1 : 1,
        ...driverData,
        safetyScore: parseInt(driverData.safetyScore, 10),
      }
      stubDrivers.push(newDriver)
      return newDriver
    }
    throw error
  }
}

export const updateDriver = async (id, driverData) => {
  try {
    const { data } = await api.put(`/api/drivers/${id}`, driverData)
    return data
  } catch (error) {
    if (shouldFallbackToStub(error)) {
      await delay(300)
      const index = stubDrivers.findIndex((d) => d.id === Number(id))
      if (index === -1) {
        throw new Error('Driver not found')
      }
      const updated = {
        ...stubDrivers[index],
        ...driverData,
        id: Number(id),
        safetyScore: parseInt(driverData.safetyScore, 10),
      }
      stubDrivers[index] = updated
      return updated
    }
    throw error
  }
}

export const deleteDriver = async (id) => {
  try {
    const { data } = await api.delete(`/api/drivers/${id}`)
    return data
  } catch (error) {
    if (shouldFallbackToStub(error)) {
      await delay(300)
      const index = stubDrivers.findIndex((d) => d.id === Number(id))
      if (index === -1) {
        throw new Error('Driver not found')
      }
      stubDrivers.splice(index, 1)
      return { message: 'Driver deleted successfully' }
    }
    throw error
  }
}

// ─── Stub helpers for cross-service linking ──────────────────────────────────
export const _getStubDrivers = () => stubDrivers
export const _setStubDriverStatus = (id, status) => {
  const d = stubDrivers.find((x) => x.id === Number(id))
  if (d) d.status = status
}
