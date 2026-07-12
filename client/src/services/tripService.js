import api from '../api'

const USE_STUB = import.meta.env.VITE_USE_AUTH_STUB === 'true'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

let stubTrips = [
  {
    id: 1,
    source: 'Mumbai',
    destination: 'Pune',
    vehicleId: 2,
    driverId: 2,
    cargoWeightKg: 15000,
    plannedDistanceKm: 150,
    status: 'Dispatched',
    vehicleName: 'Ashok Leyland 4220',
    vehicleRegNo: 'MH-14-CD-5678',
    driverName: 'Suresh Patel',
  },
  {
    id: 2,
    source: 'Delhi',
    destination: 'Jaipur',
    vehicleId: 1,
    driverId: 1,
    cargoWeightKg: 10000,
    plannedDistanceKm: 270,
    status: 'Draft',
    vehicleName: 'Tata Prima 5530',
    vehicleRegNo: 'MH-12-AB-1234',
    driverName: 'Rajesh Kumar',
  },
]

const shouldFallbackToStub = (_error) => USE_STUB

export const getTrips = async () => {
  try {
    const { data } = await api.get('/api/trips')
    return data
  } catch (error) {
    if (shouldFallbackToStub(error)) {
      await delay(300)
      return [...stubTrips]
    }
    throw error
  }
}

export const createTrip = async (tripData) => {
  try {
    const { data } = await api.post('/api/trips', tripData)
    return data
  } catch (error) {
    if (shouldFallbackToStub(error)) {
      await delay(300)
      
      const vNames = {
        1: { name: 'Tata Prima 5530', regNo: 'MH-12-AB-1234' },
        2: { name: 'Ashok Leyland 4220', regNo: 'MH-14-CD-5678' },
        3: { name: 'Eicher Pro 6048', regNo: 'KA-05-MN-9012' },
        4: { name: 'Mahindra Blazo X 49', regNo: 'DL-01-XY-3456' },
        5: { name: 'Volvo FM 460', regNo: 'TN-09-PQ-7890' }
      }

      const dNames = {
        1: 'Rajesh Kumar',
        2: 'Suresh Patel',
        3: 'Amit Sharma',
        4: 'Vikram Singh',
        5: 'Deepak Reddy'
      }

      const newTrip = {
        id: stubTrips.length ? Math.max(...stubTrips.map((t) => t.id)) + 1 : 1,
        source: tripData.source,
        destination: tripData.destination,
        vehicleId: Number(tripData.vehicleId),
        driverId: Number(tripData.driverId),
        cargoWeightKg: Number(tripData.cargoWeightKg),
        plannedDistanceKm: Number(tripData.plannedDistanceKm),
        status: 'Draft',
        vehicleName: vNames[Number(tripData.vehicleId)]?.name ?? 'Unknown Vehicle',
        vehicleRegNo: vNames[Number(tripData.vehicleId)]?.regNo ?? 'Unknown Reg',
        driverName: dNames[Number(tripData.driverId)] ?? 'Unknown Driver'
      }

      stubTrips.push(newTrip)
      return newTrip
    }
    throw error
  }
}

export const updateTripStatus = async (id, status) => {
  try {
    const { data } = await api.put(`/api/trips/${id}/status`, { status })
    return data
  } catch (error) {
    if (shouldFallbackToStub(error)) {
      await delay(300)
      const index = stubTrips.findIndex((t) => t.id === Number(id))
      if (index === -1) {
        throw new Error('Trip not found')
      }
      stubTrips[index] = {
        ...stubTrips[index],
        status,
      }
      return stubTrips[index]
    }
    throw error
  }
}

export const dispatchTrip = async (id) => {
  try {
    const { data } = await api.put(`/api/trips/${id}/dispatch`)
    return data
  } catch (error) {
    if (shouldFallbackToStub(error)) {
      await delay(300)
      const index = stubTrips.findIndex((t) => t.id === Number(id))
      if (index === -1) {
        throw new Error('Trip not found')
      }
      stubTrips[index] = {
        ...stubTrips[index],
        status: 'Dispatched',
      }
      return stubTrips[index]
    }
    throw error
  }
}
