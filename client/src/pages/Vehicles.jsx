import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} from '../services/vehicleService'

// ─── Constants ────────────────────────────────────────────────────────────────
const VEHICLE_TYPES = [
  'Heavy Truck',
  'Container Truck',
  'Tipper',
  'Long Haul',
  'Light Commercial',
  'Tanker',
  'Flatbed',
  'Refrigerated',
]

const VEHICLE_STATUSES = ['Available', 'OnTrip', 'InShop', 'Retired']

const STATUS_STYLES = {
  Available:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  OnTrip:     'bg-blue-500/10   text-blue-400   border-blue-500/20',
  InShop:     'bg-amber-500/10  text-amber-400  border-amber-500/20',
  Retired:    'bg-gray-500/10   text-gray-400   border-gray-500/20',
}

const TYPE_ICON = {
  'Heavy Truck':       '🚛',
  'Container Truck':   '📦',
  'Tipper':            '🏗️',
  'Long Haul':         '🛣️',
  'Light Commercial':  '🚐',
  'Tanker':            '⛽',
  'Flatbed':           '🏎️',
  'Refrigerated':      '❄️',
}

const fmtNumber = (n) =>
  Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })

const fmtCurrency = (n) =>
  '₹' +
  Number(n).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  })

// ─── Empty form state ─────────────────────────────────────────────────────────
const emptyForm = () => ({
  regNo: '',
  name: '',
  type: 'Heavy Truck',
  capacityKg: '',
  odometer: '',
  acquisitionCost: '',
  status: 'Available',
})

// ─── Fleet summary cards ──────────────────────────────────────────────────────
function SummaryCard({ label, value, color }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-transit-dark-border bg-transit-dark-elevated p-4 min-w-[130px]">
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      <span className="text-xs uppercase tracking-wider text-gray-400 font-medium">{label}</span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Vehicles() {
  const { user } = useAuth()
  const [vehicles, setVehicles]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [pageError, setPageError]   = useState('')

  // Filters
  const [searchQuery, setSearchQuery]   = useState('')
  const [typeFilter, setTypeFilter]     = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  // Modals
  const [showAddModal, setShowAddModal]       = useState(false)
  const [showEditModal, setShowEditModal]     = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState(null)

  // Form
  const [form, setForm]         = useState(emptyForm())
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // canWrite: only fleet_manager role (stored as 'fleet_manager' in AuthContext)
  const canWrite = user?.role === 'fleet_manager' || user?.role === 'FleetManager'

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchVehicles = async () => {
    setLoading(true)
    setPageError('')
    try {
      const data = await getVehicles()
      setVehicles(data)
    } catch (err) {
      console.error(err)
      setPageError('Failed to fetch vehicles. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchVehicles() }, [])

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filteredVehicles = vehicles.filter((v) => {
    const q = searchQuery.toLowerCase()
    const matchSearch =
      v.regNo.toLowerCase().includes(q) ||
      v.name.toLowerCase().includes(q)
    const matchType   = typeFilter   === 'All' || v.type   === typeFilter
    const matchStatus = statusFilter === 'All' || v.status === statusFilter
    return matchSearch && matchType && matchStatus
  })

  // ── Summary counts ─────────────────────────────────────────────────────────
  const counts = vehicles.reduce((acc, v) => {
    acc[v.status] = (acc[v.status] || 0) + 1
    return acc
  }, {})

  // ── Form helpers ───────────────────────────────────────────────────────────
  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const validateForm = () => {
    if (!form.regNo.trim())  return 'Registration No. is required'
    if (!form.name.trim())   return 'Name / Model is required'
    if (!form.type.trim())   return 'Type is required'
    const cap = Number(form.capacityKg)
    if (isNaN(cap) || cap < 0) return 'Capacity must be a non-negative number'
    const odo = Number(form.odometer)
    if (isNaN(odo) || odo < 0) return 'Odometer must be a non-negative number'
    const cost = Number(form.acquisitionCost)
    if (isNaN(cost) || cost < 0) return 'Acquisition cost must be a non-negative number'
    return ''
  }

  // ── Open modals ────────────────────────────────────────────────────────────
  const handleOpenAdd = () => {
    setForm(emptyForm())
    setFormError('')
    setShowAddModal(true)
  }

  const handleOpenEdit = (vehicle) => {
    setSelectedVehicle(vehicle)
    setForm({
      regNo:           vehicle.regNo,
      name:            vehicle.name,
      type:            vehicle.type,
      capacityKg:      vehicle.capacityKg,
      odometer:        vehicle.odometer,
      acquisitionCost: vehicle.acquisitionCost,
      status:          vehicle.status,
    })
    setFormError('')
    setShowEditModal(true)
  }

  const handleOpenDelete = (vehicle) => {
    setSelectedVehicle(vehicle)
    setShowDeleteModal(true)
  }

  // ── Submit handlers ────────────────────────────────────────────────────────
  const handleAdd = async (e) => {
    e.preventDefault()
    const err = validateForm()
    if (err) { setFormError(err); return }
    setSubmitting(true)
    try {
      await createVehicle({
        regNo:           form.regNo.trim(),
        name:            form.name.trim(),
        type:            form.type.trim(),
        capacityKg:      Number(form.capacityKg),
        odometer:        Number(form.odometer),
        acquisitionCost: Number(form.acquisitionCost),
        status:          form.status,
      })
      setShowAddModal(false)
      fetchVehicles()
    } catch (err) {
      console.error(err)
      setFormError(err.response?.data?.message || 'Failed to add vehicle')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    const err = validateForm()
    if (err) { setFormError(err); return }
    setSubmitting(true)
    try {
      await updateVehicle(selectedVehicle.id, {
        regNo:           form.regNo.trim(),
        name:            form.name.trim(),
        type:            form.type.trim(),
        capacityKg:      Number(form.capacityKg),
        odometer:        Number(form.odometer),
        acquisitionCost: Number(form.acquisitionCost),
        status:          form.status,
      })
      setShowEditModal(false)
      fetchVehicles()
    } catch (err) {
      console.error(err)
      setFormError(err.response?.data?.message || 'Failed to update vehicle')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setSubmitting(true)
    try {
      await deleteVehicle(selectedVehicle.id)
      setShowDeleteModal(false)
      fetchVehicles()
    } catch (err) {
      console.error(err)
      setPageError('Failed to delete vehicle')
      setShowDeleteModal(false)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Shared form JSX ────────────────────────────────────────────────────────
  const renderForm = (onSubmit, submitLabel) => (
    <form onSubmit={onSubmit} className="mt-5 space-y-4">
      {formError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400">
          <span className="mt-0.5 shrink-0">✕</span>
          <span>{formError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Reg No */}
        <div>
          <label className="form-label">Registration No.</label>
          <input
            type="text"
            required
            value={form.regNo}
            onChange={setField('regNo')}
            placeholder="e.g. MH-12-AB-1234"
            className="form-input"
          />
        </div>

        {/* Name / Model */}
        <div>
          <label className="form-label">Name / Model</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={setField('name')}
            placeholder="e.g. Tata Prima 5530"
            className="form-input"
          />
        </div>

        {/* Type */}
        <div>
          <label className="form-label">Type</label>
          <select value={form.type} onChange={setField('type')} className="form-input">
            {VEHICLE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Capacity */}
        <div>
          <label className="form-label">Capacity (kg)</label>
          <input
            type="number"
            min="0"
            step="100"
            required
            value={form.capacityKg}
            onChange={setField('capacityKg')}
            placeholder="e.g. 25000"
            className="form-input"
          />
        </div>

        {/* Odometer */}
        <div>
          <label className="form-label">Odometer (km)</label>
          <input
            type="number"
            min="0"
            step="1"
            required
            value={form.odometer}
            onChange={setField('odometer')}
            placeholder="e.g. 142500"
            className="form-input"
          />
        </div>

        {/* Acquisition Cost */}
        <div>
          <label className="form-label">Acquisition Cost (₹)</label>
          <input
            type="number"
            min="0"
            step="1000"
            required
            value={form.acquisitionCost}
            onChange={setField('acquisitionCost')}
            placeholder="e.g. 3200000"
            className="form-input"
          />
        </div>

        {/* Status */}
        <div className="sm:col-span-2">
          <label className="form-label">Status</label>
          <select value={form.status} onChange={setField('status')} className="form-input">
            {VEHICLE_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-transit-dark-border pt-4">
        <button
          type="button"
          onClick={() => { setShowAddModal(false); setShowEditModal(false) }}
          className="rounded-lg border border-transit-dark-border bg-transit-dark px-4 py-2 text-sm text-gray-300 transition-colors hover:text-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-transit-orange px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-transit-orange-hover disabled:opacity-60"
        >
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Vehicle Registry</h2>
          <p className="mt-1 text-sm text-gray-400">
            Manage your fleet — registration details, capacity, odometer and status.
          </p>
        </div>

        {canWrite ? (
          <button
            id="add-vehicle-btn"
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 rounded-lg bg-transit-orange px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-transit-orange-hover hover:shadow-transit-orange/20"
          >
            <span className="text-base leading-none">+</span>
            Add Vehicle
          </button>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-transit-dark-border bg-transit-dark-elevated px-4 py-2.5 text-sm text-gray-400">
            <span className="text-base">🔒</span>
            <span>Read-Only Mode</span>
          </div>
        )}
      </div>

      {/* ── Fleet summary row ── */}
      <div className="flex flex-wrap gap-3">
        <SummaryCard label="Total"     value={vehicles.length}           color="text-white" />
        <SummaryCard label="Available" value={counts.Available  || 0}   color="text-emerald-400" />
        <SummaryCard label="On Trip"   value={counts.OnTrip     || 0}   color="text-blue-400" />
        <SummaryCard label="In Shop"   value={counts.InShop     || 0}   color="text-amber-400" />
        <SummaryCard label="Retired"   value={counts.Retired    || 0}   color="text-gray-400" />
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col gap-3 rounded-xl border border-transit-dark-border bg-transit-dark-elevated p-4 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-500 text-sm">
            🔍
          </span>
          <input
            id="vehicle-search"
            type="text"
            placeholder="Search by Reg No. or Name…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-transit-dark-border bg-transit-dark py-2.5 pl-9 pr-4 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-transit-orange"
          />
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="type-filter" className="text-xs font-medium uppercase tracking-wider text-gray-400">
            Type:
          </label>
          <select
            id="type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-2.5 text-sm text-white outline-none focus:border-transit-orange"
          >
            <option value="All">All Types</option>
            {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="text-xs font-medium uppercase tracking-wider text-gray-400">
            Status:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-2.5 text-sm text-white outline-none focus:border-transit-orange"
          >
            <option value="All">All Statuses</option>
            {VEHICLE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Clear filters */}
        {(searchQuery || typeFilter !== 'All' || statusFilter !== 'All') && (
          <button
            onClick={() => { setSearchQuery(''); setTypeFilter('All'); setStatusFilter('All') }}
            className="text-xs text-gray-400 underline underline-offset-2 hover:text-white transition-colors whitespace-nowrap"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-xl border border-transit-dark-border bg-transit-dark-elevated">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-transit-orange border-t-transparent" />
          </div>
        ) : pageError ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 p-6 text-center">
            <span className="text-2xl">⚠️</span>
            <p className="text-red-400">{pageError}</p>
            <button onClick={fetchVehicles} className="mt-2 text-sm text-blue-400 hover:underline">
              Retry
            </button>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
            <span className="text-3xl text-gray-500">🚛</span>
            <p className="mt-2 font-medium text-gray-400">No vehicles found</p>
            <p className="mt-1 text-xs text-gray-500">
              {searchQuery || typeFilter !== 'All' || statusFilter !== 'All'
                ? 'Try adjusting your filters or search terms.'
                : 'Add your first vehicle to get started.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-transit-dark-border bg-transit-dark/50 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  <th className="px-5 py-4">Reg No.</th>
                  <th className="px-5 py-4">Name / Model</th>
                  <th className="px-5 py-4">Type</th>
                  <th className="px-5 py-4 text-right">Capacity (kg)</th>
                  <th className="px-5 py-4 text-right">Odometer (km)</th>
                  <th className="px-5 py-4 text-right">Acq. Cost</th>
                  <th className="px-5 py-4">Status</th>
                  {canWrite && <th className="px-5 py-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-transit-dark-border text-sm text-gray-300">
                {filteredVehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="transition-colors hover:bg-white/[0.025]">
                    {/* Reg No */}
                    <td className="px-5 py-4 font-mono text-sm font-semibold text-transit-orange">
                      {vehicle.regNo}
                    </td>

                    {/* Name / Model */}
                    <td className="px-5 py-4 font-medium text-white">
                      {vehicle.name}
                    </td>

                    {/* Type */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-transit-dark-border bg-transit-dark px-2.5 py-0.5 text-xs font-medium text-gray-300">
                        <span>{TYPE_ICON[vehicle.type] || '🚗'}</span>
                        {vehicle.type}
                      </span>
                    </td>

                    {/* Capacity */}
                    <td className="px-5 py-4 text-right font-mono text-gray-300">
                      {fmtNumber(vehicle.capacityKg)}
                    </td>

                    {/* Odometer */}
                    <td className="px-5 py-4 text-right font-mono text-gray-300">
                      {fmtNumber(vehicle.odometer)}
                    </td>

                    {/* Acquisition Cost */}
                    <td className="px-5 py-4 text-right font-mono text-gray-300">
                      {fmtCurrency(vehicle.acquisitionCost)}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span
                        className={[
                          'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                          STATUS_STYLES[vehicle.status] || STATUS_STYLES.Retired,
                        ].join(' ')}
                      >
                        {vehicle.status === 'OnTrip' ? 'On Trip' : vehicle.status}
                      </span>
                    </td>

                    {/* Actions */}
                    {canWrite && (
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            id={`edit-vehicle-${vehicle.id}`}
                            onClick={() => handleOpenEdit(vehicle)}
                            className="rounded border border-transit-dark-border bg-transit-dark px-2.5 py-1 text-xs text-blue-400 transition-colors hover:border-blue-400 hover:text-white"
                          >
                            Edit
                          </button>
                          <button
                            id={`delete-vehicle-${vehicle.id}`}
                            onClick={() => handleOpenDelete(vehicle)}
                            className="rounded border border-transit-dark-border bg-transit-dark px-2.5 py-1 text-xs text-red-400 transition-colors hover:border-red-400 hover:text-white"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Row count footer */}
            <div className="border-t border-transit-dark-border px-5 py-3 text-xs text-gray-500">
              Showing {filteredVehicles.length} of {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════ ADD VEHICLE MODAL ═══════════════════════════ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-xl border border-transit-dark-border bg-transit-dark-elevated p-6 shadow-2xl">
            {/* Close */}
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 text-gray-500 transition-colors hover:text-white"
              aria-label="Close"
            >
              ✕
            </button>

            <h3 className="text-lg font-bold text-white">Add New Vehicle</h3>
            <p className="mt-0.5 text-xs text-gray-400">
              Register a new vehicle in the fleet registry.
            </p>

            {renderForm(handleAdd, 'Save Vehicle')}
          </div>
        </div>
      )}

      {/* ═══════════════════════ EDIT VEHICLE MODAL ══════════════════════════ */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-xl border border-transit-dark-border bg-transit-dark-elevated p-6 shadow-2xl">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute right-4 top-4 text-gray-500 transition-colors hover:text-white"
              aria-label="Close"
            >
              ✕
            </button>

            <h3 className="text-lg font-bold text-white">Edit Vehicle</h3>
            <p className="mt-0.5 text-xs text-gray-400">
              Update details for{' '}
              <span className="font-semibold text-white">{selectedVehicle?.regNo}</span>.
            </p>

            {renderForm(handleEdit, 'Save Changes')}
          </div>
        </div>
      )}

      {/* ═══════════════════════ DELETE MODAL ════════════════════════════════ */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-xl border border-transit-dark-border bg-transit-dark-elevated p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Delete Vehicle?</h3>
            <p className="mt-2 text-sm text-gray-400">
              Are you sure you want to permanently remove{' '}
              <span className="font-semibold text-white">{selectedVehicle?.name}</span>{' '}
              (<span className="font-mono text-transit-orange">{selectedVehicle?.regNo}</span>)?
              This action cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-3 border-t border-transit-dark-border pt-4">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="rounded-lg border border-transit-dark-border bg-transit-dark px-4 py-2 text-sm text-gray-300 transition-colors hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={submitting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {submitting ? 'Deleting…' : 'Delete Vehicle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
