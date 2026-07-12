import { useState, useEffect, useCallback } from 'react'
import {
  getTrips,
  createTrip,
  dispatchTrip,
  completeTrip,
  cancelDispatchedTrip,
} from '../services/tripService'
import { getVehicles, getAvailableVehicles } from '../services/vehicleService'
import { getDrivers } from '../services/driverService'

export default function Trips() {
  const [trips, setTrips] = useState([])
  const [allVehicles, setAllVehicles] = useState([])
  const [availableVehicles, setAvailableVehicles] = useState([])
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Create-trip form states
  const [source, setSource] = useState('')
  const [destination, setDestination] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [driverId, setDriverId] = useState('')
  const [cargoWeight, setCargoWeight] = useState('')
  const [plannedDistance, setPlannedDistance] = useState('')
  const [tripRevenue, setTripRevenue] = useState('')
  const [formError, setFormError] = useState('')

  // Selected trip for the lifecycle stepper
  const [selectedTrip, setSelectedTrip] = useState(null)

  // Complete trip modal
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [finalOdometer, setFinalOdometer] = useState('')
  const [fuelConsumed, setFuelConsumed] = useState('')
  const [completeError, setCompleteError] = useState('')

  const isLicenseExpired = (expiryString) => {
    if (!expiryString) return true
    const expiry = new Date(expiryString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return expiry < today
  }

  const showSuccess = (msg) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(''), 4000)
  }

  const fetchData = useCallback(async (keepSelection = true) => {
    setLoading(true)
    setError('')
    try {
      const [tripsData, allVehData, availVehData, driversData] = await Promise.all([
        getTrips(),
        getVehicles(),
        getAvailableVehicles(),
        getDrivers(),
      ])
      setTrips(tripsData)
      setAllVehicles(allVehData)
      setAvailableVehicles(availVehData)
      setDrivers(driversData)

      if (keepSelection) {
        setSelectedTrip((prev) => {
          if (!prev) return null
          return tripsData.find((t) => t.id === prev.id) || null
        })
      }
    } catch (err) {
      console.error(err)
      setError('Failed to load trips data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Create ────────────────────────────────────────────────────────────────
  const handleCreateTrip = async (e) => {
    e.preventDefault()
    setFormError('')

    const currentVeh = availableVehicles.find((v) => v.id === Number(vehicleId))
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
        plannedDistanceKm: plannedDistance,
        // Revenue is optional; if left blank, analytics will use ₹15/km assumed rate.
        ...(tripRevenue !== '' && { revenue: tripRevenue }),
      })

      await fetchData()
      setSource('')
      setDestination('')
      setVehicleId('')
      setDriverId('')
      setCargoWeight('')
      setPlannedDistance('')
      setTripRevenue('')
      setSelectedTrip(newTrip)
      showSuccess('Trip created successfully!')
    } catch (err) {
      console.error(err)
      setFormError(err.response?.data?.message || 'Failed to create trip')
    }
  }

  // ── Dispatch ──────────────────────────────────────────────────────────────
  const handleDispatchTrip = async (tripId) => {
    setActionLoading(true)
    setError('')
    try {
      await dispatchTrip(tripId)
      setTrips((prev) => prev.map((t) => (t.id === tripId ? { ...t, status: 'Dispatched' } : t)))
      setSelectedTrip((prev) => (prev?.id === tripId ? { ...prev, status: 'Dispatched' } : prev))
      await fetchData()
      showSuccess('Trip dispatched successfully!')
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || 'Failed to dispatch trip')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Complete (open modal) ─────────────────────────────────────────────────
  const openCompleteModal = () => {
    setFinalOdometer('')
    setFuelConsumed('')
    setCompleteError('')
    setShowCompleteModal(true)
  }

  const handleCompleteTrip = async () => {
    setCompleteError('')
    const odo = parseFloat(finalOdometer)
    const fuel = parseFloat(fuelConsumed)

    if (!finalOdometer || isNaN(odo) || odo < 0) {
      setCompleteError('Enter a valid final odometer reading (km)')
      return
    }
    if (!fuelConsumed || isNaN(fuel) || fuel < 0) {
      setCompleteError('Enter a valid fuel consumed value (litres)')
      return
    }

    setActionLoading(true)
    try {
      await completeTrip(selectedTrip.id, {
        finalOdometer: odo,
        fuelConsumedLiters: fuel,
      })

      setShowCompleteModal(false)
      setTrips((prev) =>
        prev.map((t) => (t.id === selectedTrip.id ? { ...t, status: 'Completed' } : t))
      )
      setSelectedTrip((prev) => (prev ? { ...prev, status: 'Completed' } : prev))
      await fetchData()
      showSuccess(`Trip completed! Odometer updated to ${odo} km. Fuel log recorded.`)
    } catch (err) {
      console.error(err)
      setCompleteError(err.response?.data?.message || 'Failed to complete trip')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Cancel (dispatched only) ──────────────────────────────────────────────
  const handleCancelDispatched = async (tripId) => {
    if (!window.confirm('Cancel this dispatched trip? The vehicle and driver will be restored to Available.')) return
    setActionLoading(true)
    setError('')
    try {
      await cancelDispatchedTrip(tripId)
      setTrips((prev) => prev.map((t) => (t.id === tripId ? { ...t, status: 'Cancelled' } : t)))
      setSelectedTrip((prev) => (prev?.id === tripId ? { ...prev, status: 'Cancelled' } : prev))
      await fetchData()
      showSuccess('Trip cancelled. Vehicle and driver are now Available again.')
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || 'Failed to cancel trip')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formAvailableDrivers = drivers.filter(
    (d) => d.status === 'Available' && !isLicenseExpired(d.licenseExpiry)
  )

  const statuses = ['Draft', 'Dispatched', 'Completed', 'Cancelled']
  const groupedTrips = {
    Draft: trips.filter((t) => t.status === 'Draft'),
    Dispatched: trips.filter((t) => t.status === 'Dispatched'),
    Completed: trips.filter((t) => t.status === 'Completed'),
    Cancelled: trips.filter((t) => t.status === 'Cancelled'),
  }

  const getStepIndex = (status) => statuses.indexOf(status)

  const getStatusPillClass = (status) => {
    switch (status) {
      case 'Draft':        return 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
      case 'Dispatched':   return 'bg-orange-500/10 text-transit-orange border border-transit-orange/20'
      case 'Completed':    return 'bg-green-500/10 text-green-400 border border-green-500/20'
      case 'Cancelled':    return 'bg-red-500/10 text-red-400 border border-red-500/20'
      default:             return 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
    }
  }

  // Inline validation for create form
  const selectedFormVeh = availableVehicles.find((v) => v.id === Number(vehicleId))
  const isFormOverCapacity = selectedFormVeh && Number(cargoWeight) > selectedFormVeh.capacityKg
  const formCapacityExcess = selectedFormVeh
    ? Math.max(0, Number(cargoWeight) - selectedFormVeh.capacityKg)
    : 0

  // Dispatch-button validation for selected trip
  const assignedVeh    = allVehicles.find((v) => v.id === selectedTrip?.vehicleId)
  const assignedDriver = drivers.find((d) => d.id === selectedTrip?.driverId)
  const vehNotAvail    = assignedVeh && assignedVeh.status !== 'Available'
  const driverNotAvail = assignedDriver && assignedDriver.status !== 'Available'
  const driverExpired  = assignedDriver && isLicenseExpired(assignedDriver.licenseExpiry)
  const isTripOverCap  = assignedVeh && selectedTrip?.cargoWeightKg > assignedVeh.capacityKg
  const tripCapExcess  = assignedVeh ? Math.max(0, selectedTrip.cargoWeightKg - assignedVeh.capacityKg) : 0

  const dispatchValidation = []
  if (isTripOverCap)    dispatchValidation.push(`Capacity exceeded by ${tripCapExcess}kg — dispatch blocked`)
  if (vehNotAvail)      dispatchValidation.push(`Vehicle is not Available (current: ${assignedVeh?.status})`)
  if (driverNotAvail)   dispatchValidation.push(`Driver is not Available (current: ${assignedDriver?.status})`)
  if (driverExpired)    dispatchValidation.push('Driver license is expired')

  const isDispatchDisabled = dispatchValidation.length > 0

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

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Create Trip Form ── */}
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
              <input type="text" required value={source} onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. Mumbai"
                className="w-full rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-2 text-sm text-white outline-none focus:border-transit-orange" />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Destination</label>
              <input type="text" required value={destination} onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. Pune"
                className="w-full rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-2 text-sm text-white outline-none focus:border-transit-orange" />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Vehicle</label>
              <select required value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}
                className="w-full rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-2 text-sm text-white outline-none focus:border-transit-orange">
                <option value="">Select an Available Vehicle</option>
                {availableVehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.name} ({v.regNo}) — Max {v.capacityKg} kg</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Driver</label>
              <select required value={driverId} onChange={(e) => setDriverId(e.target.value)}
                className="w-full rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-2 text-sm text-white outline-none focus:border-transit-orange">
                <option value="">Select an Available Driver</option>
                {formAvailableDrivers.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} (Score: {d.safetyScore})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Cargo (kg)</label>
                <input type="number" step="any" required value={cargoWeight}
                  onChange={(e) => setCargoWeight(e.target.value)} placeholder="e.g. 5000"
                  className="w-full rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-2 text-sm text-white outline-none focus:border-transit-orange" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Distance (km)</label>
                <input type="number" step="any" required value={plannedDistance}
                  onChange={(e) => setPlannedDistance(e.target.value)} placeholder="e.g. 140"
                  className="w-full rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-2 text-sm text-white outline-none focus:border-transit-orange" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                Revenue (₹) <span className="normal-case font-normal text-gray-500">— optional</span>
              </label>
              <input type="number" step="any" min="0" value={tripRevenue}
                onChange={(e) => setTripRevenue(e.target.value)} placeholder="Leave blank to use ₹15/km assumed rate"
                className="w-full rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-2 text-sm text-white outline-none focus:border-transit-orange" />
            </div>

            {isFormOverCapacity && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400">
                ⚠️ Capacity exceeded by {formCapacityExcess} kg — dispatch blocked
              </div>
            )}

            <button type="submit" disabled={isFormOverCapacity}
              className={[
                'w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-colors',
                isFormOverCapacity ? 'bg-gray-600 cursor-not-allowed opacity-60' : 'bg-transit-orange hover:bg-transit-orange-hover'
              ].join(' ')}>
              Create Trip
            </button>
          </form>
        </div>

        {/* ── Lifecycle Stepper ── */}
        <div className="rounded-xl border border-transit-dark-border bg-transit-dark-elevated p-6 lg:col-span-2 shadow-md">
          <h3 className="text-base font-bold text-white mb-4">Trip Lifecycle Status</h3>

          {selectedTrip ? (
            <div className="space-y-6">
              {/* Quick stats */}
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
                  <span className="block text-[10px] uppercase font-semibold text-gray-500">Cargo / Dist.</span>
                  <span className="text-sm font-semibold text-gray-300">{selectedTrip.cargoWeightKg} kg / {selectedTrip.plannedDistanceKm} km</span>
                </div>
              </div>

              {/* Stepper */}
              <div className="py-6">
                <div className="relative flex items-center justify-between">
                  <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-transit-dark-border" />
                  <div
                    className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-transit-orange transition-all duration-500"
                    style={{ width: `${(getStepIndex(selectedTrip.status) / (statuses.length - 1)) * 100}%` }}
                  />
                  {statuses.map((status, index) => {
                    const isActive = status === selectedTrip.status
                    const isCompleted = getStepIndex(selectedTrip.status) >= index
                    return (
                      <div key={status} className="relative z-10 flex flex-col items-center">
                        <div className={[
                          'flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-300',
                          isActive ? 'bg-transit-orange border-transit-orange text-white scale-110 shadow-lg shadow-transit-orange/30'
                            : isCompleted ? 'bg-transit-orange/20 border-transit-orange text-transit-orange'
                            : 'bg-transit-dark-elevated border-transit-dark-border text-gray-500'
                        ].join(' ')}>{index + 1}</div>
                        <span className={[
                          'absolute -bottom-7 text-xs font-semibold whitespace-nowrap tracking-wide transition-colors',
                          isActive ? 'text-transit-orange font-bold' : isCompleted ? 'text-gray-300' : 'text-gray-500'
                        ].join(' ')}>{status}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Dispatch validation errors */}
              {selectedTrip.status === 'Draft' && dispatchValidation.length > 0 && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 space-y-1">
                  <span className="font-bold block">⚠️ Cannot Dispatch Trip:</span>
                  <ul className="list-disc pl-4 space-y-0.5 text-xs">
                    {dispatchValidation.map((msg, i) => <li key={i}>{msg}</li>)}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-6 flex gap-3 flex-wrap border-t border-transit-dark-border justify-end">
                {selectedTrip.status === 'Draft' && (
                  <button
                    onClick={() => handleDispatchTrip(selectedTrip.id)}
                    disabled={isDispatchDisabled || actionLoading}
                    className={[
                      'rounded-lg px-4 py-2 text-xs font-semibold text-white transition-all duration-200',
                      (isDispatchDisabled || actionLoading) ? 'bg-gray-600 opacity-55 cursor-not-allowed' : 'bg-transit-orange hover:bg-transit-orange-hover'
                    ].join(' ')}>
                    {actionLoading ? 'Dispatching…' : 'Dispatch Trip'}
                  </button>
                )}

                {selectedTrip.status === 'Dispatched' && (
                  <>
                    <button
                      onClick={() => handleCancelDispatched(selectedTrip.id)}
                      disabled={actionLoading}
                      className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      {actionLoading ? 'Cancelling…' : 'Cancel Trip'}
                    </button>
                    <button
                      onClick={openCompleteModal}
                      disabled={actionLoading}
                      className="rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      Complete Trip
                    </button>
                  </>
                )}

                {(selectedTrip.status === 'Completed' || selectedTrip.status === 'Cancelled') && (
                  <span className="text-xs text-gray-500 italic">This trip is finalized. No further transitions available.</span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-48 flex-col items-center justify-center text-center rounded-lg border border-dashed border-transit-dark-border p-6 text-gray-500">
              <span className="text-2xl mb-2">↖</span>
              <p className="text-sm">Select a trip card from the Live Board below to view and manage its lifecycle.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Complete Trip Modal ── */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-xl border border-transit-dark-border bg-transit-dark-elevated p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Complete Trip</h3>
            <p className="text-xs text-gray-400 mb-5">
              Record the final odometer reading and fuel consumed for{' '}
              <span className="font-semibold text-gray-200">{selectedTrip?.source} → {selectedTrip?.destination}</span>.
            </p>

            {completeError && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                ✕ {completeError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Final Odometer Reading (km)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={finalOdometer}
                  onChange={(e) => setFinalOdometer(e.target.value)}
                  placeholder="e.g. 85420"
                  className="w-full rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-2 text-sm text-white outline-none focus:border-transit-orange"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Fuel Consumed (litres)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={fuelConsumed}
                  onChange={(e) => setFuelConsumed(e.target.value)}
                  placeholder="e.g. 120"
                  className="w-full rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-2 text-sm text-white outline-none focus:border-transit-orange"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowCompleteModal(false)}
                disabled={actionLoading}
                className="rounded-lg border border-transit-dark-border px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white hover:border-gray-500 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleCompleteTrip}
                disabled={actionLoading}
                className="rounded-lg bg-green-600 px-5 py-2 text-xs font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {actionLoading ? 'Completing…' : 'Confirm Completion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Live Dispatch Board ── */}
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
                      <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-transit-dark-border text-xs text-gray-500">
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
                              'group relative rounded-lg border p-3.5 cursor-pointer transition-all duration-200',
                              isSelected
                                ? 'bg-transit-dark-elevated border-transit-orange shadow-lg shadow-transit-orange/5'
                                : 'bg-transit-dark/50 border-transit-dark-border hover:bg-transit-dark-elevated hover:border-gray-500/35'
                            ].join(' ')}>
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
                                <span>Cargo / Dist.:</span>
                                <span className="font-medium text-gray-300">{trip.cargoWeightKg} kg / {trip.plannedDistanceKm} km</span>
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
