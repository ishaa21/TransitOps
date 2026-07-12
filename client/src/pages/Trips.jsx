import { useState, useEffect, useCallback } from 'react'
import { getTrips, createTrip, updateTripStatus, dispatchTrip } from '../services/tripService'
import { getVehicles, getAvailableVehicles } from '../services/vehicleService'
import { getDrivers } from '../services/driverService'

export default function Trips() {
  const [trips, setTrips] = useState([])
  const [allVehicles, setAllVehicles] = useState([])
  const [availableVehicles, setAvailableVehicles] = useState([])
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dispatching, setDispatching] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Form states
  const [source, setSource] = useState('')
  const [destination, setDestination] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [driverId, setDriverId] = useState('')
  const [cargoWeight, setCargoWeight] = useState('')
  const [plannedDistance, setPlannedDistance] = useState('')
  const [formError, setFormError] = useState('')

  // Selection state for Stepper
  const [selectedTrip, setSelectedTrip] = useState(null)

  const isLicenseExpired = (expiryString) => {
    if (!expiryString) return true
    const expiry = new Date(expiryString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return expiry < today
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [tripsData, allVehData, availVehData, driversData] = await Promise.all([
        getTrips(),
        getVehicles(),
        getAvailableVehicles(),
        getDrivers()
      ])
      setTrips(tripsData)
      setAllVehicles(allVehData)
      setAvailableVehicles(availVehData)
      setDrivers(driversData)

      // Keep selected trip reference fresh if it exists
      if (selectedTrip) {
        const freshSelected = tripsData.find(t => t.id === selectedTrip.id)
        setSelectedTrip(freshSelected || null)
      }
    } catch (err) {
      console.error(err)
      setError('Failed to load trips data.')
    } finally {
      setLoading(false)
    }
  }, [selectedTrip])

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreateTrip = async (e) => {
    e.preventDefault()
    setFormError('')

    const currentVeh = availableVehicles.find(v => v.id === Number(vehicleId))
    if (currentVeh && Number(cargoWeight) > currentVeh.capacityKg) {
      const excess = Number(cargoWeight) - currentVeh.capacityKg
      setFormError(`Capacity exceeded by ${excess} kg — dispatch blocked`)
      return
    }

    try {
      const newTrip = await createTrip({
        source,
        destination,
        vehicleId,
        driverId,
        cargoWeightKg: cargoWeight,
        plannedDistanceKm: plannedDistance
      })

      // Refresh data
      await fetchData()

      // Reset form
      setSource('')
      setDestination('')
      setVehicleId('')
      setDriverId('')
      setCargoWeight('')
      setPlannedDistance('')

      // Automatically select the newly created Draft trip
      setSelectedTrip(newTrip)
    } catch (err) {
      console.error(err)
      setFormError(err.response?.data?.message || 'Failed to create trip')
    }
  }

  const handleDispatchTrip = async (tripId) => {
    setDispatching(true)
    setError('')
    setSuccessMessage('')
    try {
      await dispatchTrip(tripId)
      setSuccessMessage('Trip successfully dispatched!')
      
      // Update local state directly for responsive feedback
      setTrips(prevTrips => prevTrips.map(t => t.id === tripId ? { ...t, status: 'Dispatched' } : t))
      setSelectedTrip(prev => prev && prev.id === tripId ? { ...prev, status: 'Dispatched' } : prev)
      
      // Fetch fresh data in background
      await fetchData()
      
      setTimeout(() => setSuccessMessage(''), 4000)
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || 'Failed to dispatch trip')
    } finally {
      setDispatching(false)
    }
  }

  const handleStatusTransition = async (tripId, nextStatus) => {
    try {
      await updateTripStatus(tripId, nextStatus)
      
      // Update local state directly
      setTrips(prevTrips => prevTrips.map(t => t.id === tripId ? { ...t, status: nextStatus } : t))
      setSelectedTrip(prev => prev && prev.id === tripId ? { ...prev, status: nextStatus } : prev)
      
      // Fetch fresh data in background
      fetchData()
    } catch (err) {
      console.error(err)
      setError('Failed to update trip status')
    }
  }

  // Filter drivers for the dropdown: Available and non-expired license
  const formAvailableDrivers = drivers.filter(
    d => d.status === 'Available' && !isLicenseExpired(d.licenseExpiry)
  )

  // Group trips by status for the Live Board
  const statuses = ['Draft', 'Dispatched', 'Completed', 'Cancelled']
  const groupedTrips = {
    Draft: trips.filter(t => t.status === 'Draft'),
    Dispatched: trips.filter(t => t.status === 'Dispatched'),
    Completed: trips.filter(t => t.status === 'Completed'),
    Cancelled: trips.filter(t => t.status === 'Cancelled')
  }

  // Stepper UI helper
  const getStepIndex = (status) => {
    return statuses.indexOf(status)
  }

  const getStatusPillClass = (status) => {
    switch (status) {
      case 'Draft':
        return 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
      case 'Dispatched':
        return 'bg-orange-500/10 text-transit-orange border border-transit-orange/20'
      case 'Completed':
        return 'bg-green-500/10 text-green-400 border border-green-500/20'
      case 'Cancelled':
        return 'bg-red-500/10 text-red-400 border border-red-500/20'
      default:
        return 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
    }
  }

  // Live Inline Capacity Validation for the Create form
  const selectedFormVeh = availableVehicles.find(v => v.id === Number(vehicleId))
  const isFormOverCapacity = selectedFormVeh && Number(cargoWeight) > selectedFormVeh.capacityKg
  const formCapacityExcess = selectedFormVeh ? Math.max(0, Number(cargoWeight) - selectedFormVeh.capacityKg) : 0

  // Validation checks for Dispatching the Selected Trip
  const assignedVeh = allVehicles.find(v => v.id === selectedTrip?.vehicleId)
  const assignedDriver = drivers.find(d => d.id === selectedTrip?.driverId)
  const vehNotAvail = assignedVeh && assignedVeh.status !== 'Available'
  const driverNotAvail = assignedDriver && assignedDriver.status !== 'Available'
  const driverExpired = assignedDriver && isLicenseExpired(assignedDriver.licenseExpiry)
  const isTripOverCapacity = assignedVeh && selectedTrip?.cargoWeightKg > assignedVeh.capacityKg
  const tripCapacityExcess = assignedVeh ? Math.max(0, selectedTrip.cargoWeightKg - assignedVeh.capacityKg) : 0

  const dispatchValidationMessages = []
  if (isTripOverCapacity) {
    dispatchValidationMessages.push(`Capacity exceeded by ${tripCapacityExcess}kg — dispatch blocked`)
  }
  if (vehNotAvail) {
    dispatchValidationMessages.push(`Assigned vehicle is not Available (current status: ${assignedVeh?.status || 'Unknown'})`)
  }
  if (driverNotAvail) {
    dispatchValidationMessages.push(`Assigned driver is not Available (current status: ${assignedDriver?.status || 'Unknown'})`)
  }
  if (driverExpired) {
    dispatchValidationMessages.push('Assigned driver license is expired')
  }

  const isDispatchDisabled = dispatchValidationMessages.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Trip Dispatcher</h2>
        <p className="mt-1 text-sm text-gray-400">Plan routes, assign drivers/vehicles, and track dispatch status.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          ⚠️ {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          ✓ {successMessage}
        </div>
      )}

      {/* Main Grid: Create form + Selected Stepper details */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Side: Create Trip Form */}
        <div className="rounded-xl border border-transit-dark-border bg-transit-dark-elevated p-6 lg:col-span-1 shadow-md">
          <h3 className="text-base font-bold text-white mb-4">Create New Trip</h3>
          <form onSubmit={handleCreateTrip} className="space-y-4">
            {formError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                ✕ {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Source</label>
              <input
                type="text"
                required
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. Mumbai"
                className="w-full rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-2 text-sm text-white outline-none focus:border-transit-orange"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Destination</label>
              <input
                type="text"
                required
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. Pune"
                className="w-full rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-2 text-sm text-white outline-none focus:border-transit-orange"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Vehicle</label>
              <select
                required
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-2 text-sm text-white outline-none focus:border-transit-orange"
              >
                <option value="">Select an Available Vehicle</option>
                {availableVehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name} ({vehicle.regNo}) - Max: {vehicle.capacityKg}kg
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Driver</label>
              <select
                required
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                className="w-full rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-2 text-sm text-white outline-none focus:border-transit-orange"
              >
                <option value="">Select an Available Driver</option>
                {formAvailableDrivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name} (Score: {driver.safetyScore})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Cargo Weight (kg)</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={cargoWeight}
                  onChange={(e) => setCargoWeight(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-2 text-sm text-white outline-none focus:border-transit-orange"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Distance (km)</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={plannedDistance}
                  onChange={(e) => setPlannedDistance(e.target.value)}
                  placeholder="e.g. 140"
                  className="w-full rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-2 text-sm text-white outline-none focus:border-transit-orange"
                />
              </div>
            </div>

            {/* Inline Capacity Warning for Form */}
            {isFormOverCapacity && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400">
                ⚠️ Capacity exceeded by {formCapacityExcess}kg — dispatch blocked
              </div>
            )}

            <button
              type="submit"
              disabled={isFormOverCapacity}
              className={[
                'w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-colors',
                isFormOverCapacity 
                  ? 'bg-gray-600 cursor-not-allowed opacity-60' 
                  : 'bg-transit-orange hover:bg-transit-orange-hover'
              ].join(' ')}
            >
              Create Trip
            </button>
          </form>
        </div>

        {/* Right Side: Selected Trip details & Lifecycle Stepper */}
        <div className="rounded-xl border border-transit-dark-border bg-transit-dark-elevated p-6 lg:col-span-2 shadow-md flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white mb-4">Trip Lifecycle Status</h3>
            {selectedTrip ? (
              <div className="space-y-6">
                {/* Trip quick stats */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 rounded-lg bg-transit-dark/40 p-4 border border-transit-dark-border">
                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-gray-500">Route</span>
                    <span className="text-sm font-bold text-white">{selectedTrip.source} → {selectedTrip.destination}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-gray-500">Vehicle</span>
                    <span className="text-sm font-semibold text-gray-300">{selectedTrip.vehicleName}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-gray-500">Driver</span>
                    <span className="text-sm font-semibold text-gray-300">{selectedTrip.driverName}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-gray-500">Cargo / Distance</span>
                    <span className="text-sm font-semibold text-gray-300">{selectedTrip.cargoWeightKg} kg / {selectedTrip.plannedDistanceKm} km</span>
                  </div>
                </div>

                {/* Vertical/Horizontal Stepper */}
                <div className="py-6">
                  <div className="relative flex items-center justify-between">
                    {/* Background Progress Line */}
                    <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-transit-dark-border" />
                    
                    {/* Active Progress Line */}
                    <div 
                      className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-transit-orange transition-all duration-500"
                      style={{
                        width: `${(getStepIndex(selectedTrip.status) / (statuses.length - 1)) * 100}%`
                      }}
                    />

                    {/* Steps */}
                    {statuses.map((status, index) => {
                      const isActive = status === selectedTrip.status
                      const isCompleted = getStepIndex(selectedTrip.status) >= index
                      
                      return (
                        <div key={status} className="relative z-10 flex flex-col items-center">
                          <div 
                            className={[
                              'flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-300',
                              isActive 
                                ? 'bg-transit-orange border-transit-orange text-white scale-110 shadow-lg shadow-transit-orange/30'
                                : isCompleted
                                ? 'bg-transit-orange/20 border-transit-orange text-transit-orange'
                                : 'bg-transit-dark-elevated border-transit-dark-border text-gray-500'
                            ].join(' ')}
                          >
                            {index + 1}
                          </div>
                          <span 
                            className={[
                              'absolute -bottom-7 text-xs font-semibold whitespace-nowrap tracking-wide transition-colors',
                              isActive ? 'text-transit-orange font-bold' : isCompleted ? 'text-gray-300' : 'text-gray-500'
                            ].join(' ')}
                          >
                            {status}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Dispatch validation errors rendering */}
                {selectedTrip.status === 'Draft' && dispatchValidationMessages.length > 0 && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 space-y-1">
                    <span className="font-bold block">⚠️ Cannot Dispatch Trip:</span>
                    <ul className="list-disc pl-4 space-y-0.5 text-xs">
                      {dispatchValidationMessages.map((msg, i) => (
                        <li key={i}>{msg}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Transition Action Buttons */}
                <div className="pt-6 flex gap-3 border-t border-transit-dark-border justify-end">
                  {selectedTrip.status === 'Draft' && (
                    <>
                      <button
                        onClick={() => handleStatusTransition(selectedTrip.id, 'Cancelled')}
                        className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        Cancel Trip
                      </button>
                      <button
                        onClick={() => handleDispatchTrip(selectedTrip.id)}
                        disabled={isDispatchDisabled || dispatching}
                        className={[
                          'rounded-lg px-4 py-2 text-xs font-semibold text-white transition-all duration-200',
                          (isDispatchDisabled || dispatching)
                            ? 'bg-gray-600 opacity-55 cursor-not-allowed'
                            : 'bg-transit-orange hover:bg-transit-orange-hover'
                        ].join(' ')}
                      >
                        {dispatching ? 'Dispatching...' : 'Dispatch Trip'}
                      </button>
                    </>
                  )}

                  {selectedTrip.status === 'Dispatched' && (
                    <>
                      <button
                        onClick={() => handleStatusTransition(selectedTrip.id, 'Cancelled')}
                        className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        Cancel Trip
                      </button>
                      <button
                        onClick={() => handleStatusTransition(selectedTrip.id, 'Completed')}
                        className="rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 transition-colors"
                      >
                        Complete Trip
                      </button>
                    </>
                  )}

                  {(selectedTrip.status === 'Completed' || selectedTrip.status === 'Cancelled') && (
                    <span className="text-xs text-gray-500 italic">This trip is finalized and archived. No further transitions available.</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-48 flex-col items-center justify-center text-center rounded-lg border border-dashed border-transit-dark-border p-6 text-gray-500">
                <span>↖</span>
                <p className="mt-2 text-sm">Select a trip card from the Live Board below to view and transition its lifecycle status.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Board */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-transit-dark-border pb-3">
          <h3 className="text-lg font-bold text-white tracking-tight">Live Dispatch Board</h3>
          <span className="rounded-full bg-transit-dark-elevated border border-transit-dark-border px-3 py-0.5 text-xs text-gray-400 font-medium">
            Grouped by dispatch status
          </span>
        </div>

        {loading && trips.length === 0 ? (
          <div className="flex h-40 items-center justify-center rounded-xl border border-transit-dark-border bg-transit-dark-elevated">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-transit-orange border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statuses.map((status) => {
              const statusTrips = groupedTrips[status] || []
              return (
                <div key={status} className="flex flex-col rounded-xl border border-transit-dark-border bg-transit-dark-elevated/40 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-transit-dark-border pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{status}</span>
                    <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-gray-300 font-bold">{statusTrips.length}</span>
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto max-h-[360px] pr-1">
                    {statusTrips.length === 0 ? (
                      <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-transit-dark-border text-center p-3 text-xs text-gray-500">
                        No trips in {status}
                      </div>
                    ) : (
                      statusTrips.map((trip) => {
                        const isSelected = selectedTrip?.id === trip.id
                        return (
                          <div
                            key={trip.id}
                            onClick={() => setSelectedTrip(trip)}
                            className={[
                              'group relative rounded-lg border p-3.5 cursor-pointer transition-all duration-200 hover:bg-transit-dark-elevated',
                              isSelected 
                                ? 'bg-transit-dark-elevated border-transit-orange shadow-lg shadow-transit-orange/5' 
                                : 'bg-transit-dark/50 border-transit-dark-border hover:border-gray-500/35'
                            ].join(' ')}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-bold text-white group-hover:text-transit-orange transition-colors">
                                {trip.source} → {trip.destination}
                              </span>
                              <span className={['rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border', getStatusPillClass(trip.status)].join(' ')}>
                                {trip.status}
                              </span>
                            </div>

                            <div className="space-y-1 text-xs text-gray-400">
                              <div className="flex justify-between">
                                <span>Vehicle:</span>
                                <span className="font-medium text-gray-300">{trip.vehicleName || '—'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Driver:</span>
                                <span className="font-medium text-gray-300">{trip.driverName || '—'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Cargo Weight:</span>
                                <span className="font-medium text-gray-300">{trip.cargoWeightKg} kg</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Distance:</span>
                                <span className="font-medium text-gray-300">{trip.plannedDistanceKm} km</span>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
