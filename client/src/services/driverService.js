import api from '../api'

export const getDrivers = async () => {
  const { data } = await api.get('/api/drivers')
  return data
}

export const createDriver = async (driverData) => {
  const { data } = await api.post('/api/drivers', driverData)
  return data
}

export const updateDriver = async (id, driverData) => {
  const { data } = await api.put(`/api/drivers/${id}`, driverData)
  return data
}

export const deleteDriver = async (id) => {
  const { data } = await api.delete(`/api/drivers/${id}`)
  return data
}

export const sendExpiryReminders = async () => {
  try {
    const { data } = await api.post('/api/drivers/send-reminders')
    return data
  } catch (error) {
    if (shouldFallbackToStub(error)) {
      await delay(300)
      const today = new Date()
      const thirtyDays = new Date()
      thirtyDays.setDate(today.getDate() + 30)

      const expiring = stubDrivers.filter((d) => {
        const exp = new Date(d.licenseExpiry)
        return exp <= thirtyDays
      })

      expiring.forEach((d) => {
        console.log(`[STUB EMAIL] Reminded driver ${d.name} (${d.contact}) about licence expiry: ${d.licenseExpiry}`)
      })

      return {
        success: true,
        count: expiring.length,
        emailedDrivers: expiring.map((d) => ({ id: d.id, name: d.name, contact: d.contact })),
      }
    }
    throw error
  }
}
