import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getVehicles } from '../services/vehicleService'
import {
  getMaintenanceLogs,
  createMaintenanceLog,
  completeMaintenanceLog,
} from '../services/maintenanceService'

// ─── Constants ────────────────────────────────────────────────────────────────
const SERVICE_TYPES = [
  'Engine Overhaul',
  'Brake Replacement',
  'Tyre Rotation',
  'Oil & Filter Change',
  'Transmission Service',
  'Suspension Repair',
  'Electrical Repair',
  'AC Service',
  'Body & Paint',
  'Annual Inspection',
  'Other',
]

const LOG_STATUS_STYLES = {
  Active:    'bg-amber-500/10  text-amber-400  border-amber-500/20',
  Completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}

const fmtCurrency = (n) =>
  '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

const emptyForm = () => ({
  vehicleId: '',
  serviceType: SERVICE_TYPES[0],
  cost: '',
  date: new Date().toISOString().substring(0, 10),
})

// ─── Summary card ─────────────────────────────────────────────────────────────
function SummaryCard({ label, value, color, icon }) {
  return (
    <div className="flex min-w-[140px] flex-col gap-1 rounded-xl border border-transit-dark-border bg-transit-dark-elevated p-4">
      <div className="flex items-center justify-between">
        <span className={`text-2xl font-bold ${color}`}>{value}</span>
        <span className="text-xl opacity-60">{icon}</span>
      </div>
      <span className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Maintenance() {
  const { user } = useAuth()

  const [logs, setLogs]         = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading]   = useState(true)
  const [pageError, setPageError] = useState('')

  // Filters
  const [statusFilter, setStatusFilter]   = useState('All')
  const [vehicleFilter, setVehicleFilter] = useState('All')

  // Form
  const [form, setForm]           = useState(emptyForm())
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  // Complete confirmation
  const [completingId, setCompletingId] = useState(null)

  const canWrite = user?.role === 'fleet_manager' || user?.role === 'FleetManager'

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchAll = async () => {
    setLoading(true)
    setPageError('')
    try {
      const [logsData, vehiclesData] = await Promise.all([
        getMaintenanceLogs(),
        getVehicles(),
      ])
      setLogs(logsData)
      setVehicles(vehiclesData)
    } catch (err) {
      console.error(err)
      setPageError('Failed to load maintenance data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  // ── Derived data ─────────────────────────────────────────────────────────────
  const activeLogs    = logs.filter((l) => l.status === 'Active')
  const completedLogs = logs.filter((l) => l.status === 'Completed')
  const totalCost     = logs.reduce((s, l) => s + Number(l.cost), 0)

  const filteredLogs = logs.filter((l) => {
    const matchStatus  = statusFilter  === 'All' || l.status    === statusFilter
    const matchVehicle = vehicleFilter === 'All' || String(l.vehicleId) === vehicleFilter
    return matchStatus && matchVehicle
  })

  // ── Form helpers ──────────────────────────────────────────────────────────────
  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const validateForm = () => {
    if (!form.vehicleId)          return 'Please select a vehicle'
    if (!form.serviceType.trim()) return 'Service type is required'
    const c = Number(form.cost)
    if (isNaN(c) || c < 0)        return 'Cost must be a non-negative number'
    if (!form.date)                return 'Date is required'
    return ''
  }

  // ── Submit new log ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validateForm()
    if (err) { setFormError(err); return }
    setSubmitting(true)
    setFormError('')
    setSuccessMsg('')

    // Find vehicle details for stub enrichment
    const vehicle = vehicles.find((v) => v.id === Number(form.vehicleId))

    try {
      await createMaintenanceLog({
        vehicleId:   Number(form.vehicleId),
        serviceType: form.serviceType.trim(),
        cost:        Number(form.cost),
        date:        new Date(form.date).toISOString(),
        // pass through for stub enrichment (server ignores)
        vehicleName:  vehicle?.name  ?? '',
        vehicleRegNo: vehicle?.regNo ?? '',
      })
      setSuccessMsg(`Service record created — ${vehicle?.regNo ?? ''} is now In Shop.`)
      setForm(emptyForm())
      fetchAll()
    } catch (err) {
      console.error(err)
      setFormError(err.response?.data?.message || 'Failed to create service record')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Mark complete ─────────────────────────────────────────────────────────────
  const handleComplete = async (logId) => {
    setCompletingId(logId)
    setSuccessMsg('')
    try {
      const updated = await completeMaintenanceLog(logId)
      const vehicleStatus = updated.vehicleStatus ?? 'Available'
      const wasRetired = vehicleStatus === 'Retired'
      setSuccessMsg(
        wasRetired
          ? `Log completed — vehicle remains Retired (no status change).`
          : `Log completed — vehicle is now Available.`
      )
      fetchAll()
    } catch (err) {
      console.error(err)
      setPageError(err.response?.data?.message || 'Failed to complete log')
    } finally {
      setCompletingId(null)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Maintenance</h2>
        <p className="mt-1 text-sm text-gray-400">
          Service records, work orders, and vehicle shop status.
        </p>
      </div>

      {/* ── State-transition notice ── */}
      <div className="flex items-start gap-3 rounded-xl border border-transit-dark-border bg-transit-dark-elevated px-5 py-4">
        <span className="mt-0.5 text-lg">🔄</span>
        <div className="text-sm text-gray-400 leading-relaxed">
          <span className="font-semibold text-white">Vehicle status flow: </span>
          <span className="text-emerald-400 font-medium">Available</span>
          {' → '}
          <span className="text-amber-400 font-medium">In Shop</span>
          {' → '}
          <span className="text-emerald-400 font-medium">Available</span>
          <span className="text-gray-500"> (unless Retired — Retired vehicles remain Retired after service)</span>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="flex flex-wrap gap-3">
        <SummaryCard label="Total Logs"    value={logs.length}           color="text-white"         icon="📋" />
        <SummaryCard label="Active"        value={activeLogs.length}     color="text-amber-400"     icon="🔧" />
        <SummaryCard label="Completed"     value={completedLogs.length}  color="text-emerald-400"   icon="✅" />
        <SummaryCard label="Total Cost"    value={fmtCurrency(totalCost)} color="text-transit-orange" icon="💰" />
      </div>

      {/* ── Two-column layout: form + table ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">

        {/* ══════════════ LOG SERVICE RECORD FORM ══════════════ */}
        <div className="rounded-xl border border-transit-dark-border bg-transit-dark-elevated p-5">
          <h3 className="text-base font-bold text-white">Log Service Record</h3>
          <p className="mt-0.5 text-xs text-gray-400">
            Creating a record will set the vehicle status to{' '}
            <span className="font-semibold text-amber-400">In Shop</span>.
          </p>

          {!canWrite && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-transit-dark-border bg-transit-dark px-4 py-3 text-sm text-gray-400">
              <span>🔒</span>
              <span>Read-Only — FleetManager role required to log service.</span>
            </div>
          )}

          {canWrite && (
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Inline errors / success */}
              {formError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400">
                  <span className="mt-0.5 shrink-0">✕</span>
                  <span>{formError}</span>
                </div>
              )}
              {successMsg && (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-400">
                  <span className="mt-0.5 shrink-0">✓</span>
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Vehicle */}
              <div>
                <label htmlFor="maint-vehicle" className="form-label">Vehicle</label>
                <select
                  id="maint-vehicle"
                  required
                  value={form.vehicleId}
                  onChange={setField('vehicleId')}
                  className="form-input"
                >
                  <option value="">— Select vehicle —</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.regNo} — {v.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Type */}
              <div>
                <label htmlFor="maint-service-type" className="form-label">Service Type</label>
                <select
                  id="maint-service-type"
                  required
                  value={form.serviceType}
                  onChange={setField('serviceType')}
                  className="form-input"
                >
                  {SERVICE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Cost */}
              <div>
                <label htmlFor="maint-cost" className="form-label">Cost (₹)</label>
                <input
                  id="maint-cost"
                  type="number"
                  min="0"
                  step="100"
                  required
                  value={form.cost}
                  onChange={setField('cost')}
                  placeholder="e.g. 25000"
                  className="form-input"
                />
              </div>

              {/* Date */}
              <div>
                <label htmlFor="maint-date" className="form-label">Service Date</label>
                <input
                  id="maint-date"
                  type="date"
                  required
                  value={form.date}
                  onChange={setField('date')}
                  className="form-input"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-transit-orange py-2.5 text-sm font-semibold text-white transition-colors hover:bg-transit-orange-hover disabled:opacity-60"
              >
                {submitting ? 'Saving…' : 'Save Service Record'}
              </button>
            </form>
          )}
        </div>

        {/* ══════════════ SERVICE LOG TABLE ══════════════ */}
        <div className="flex flex-col gap-4">

          {/* Filters bar */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-transit-dark-border bg-transit-dark-elevated p-4">
            <div className="flex items-center gap-2">
              <label htmlFor="log-status-filter" className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Status:
              </label>
              <select
                id="log-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-2 text-sm text-white outline-none focus:border-transit-orange"
              >
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="log-vehicle-filter" className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Vehicle:
              </label>
              <select
                id="log-vehicle-filter"
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                className="rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-2 text-sm text-white outline-none focus:border-transit-orange"
              >
                <option value="All">All Vehicles</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={String(v.id)}>
                    {v.regNo} — {v.name}
                  </option>
                ))}
              </select>
            </div>

            {(statusFilter !== 'All' || vehicleFilter !== 'All') && (
              <button
                onClick={() => { setStatusFilter('All'); setVehicleFilter('All') }}
                className="text-xs text-gray-400 underline underline-offset-2 hover:text-white transition-colors"
              >
                Clear filters
              </button>
            )}

            <span className="ml-auto text-xs text-gray-500">
              {filteredLogs.length} of {logs.length} record{logs.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-transit-dark-border bg-transit-dark-elevated">
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-transit-orange border-t-transparent" />
              </div>
            ) : pageError ? (
              <div className="flex h-64 flex-col items-center justify-center gap-2 p-6 text-center">
                <span className="text-2xl">⚠️</span>
                <p className="text-red-400">{pageError}</p>
                <button onClick={fetchAll} className="mt-2 text-sm text-blue-400 hover:underline">
                  Retry
                </button>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
                <span className="text-3xl text-gray-500">🔧</span>
                <p className="mt-2 font-medium text-gray-400">No service records found</p>
                <p className="mt-1 text-xs text-gray-500">
                  {statusFilter !== 'All' || vehicleFilter !== 'All'
                    ? 'Try clearing your filters.'
                    : 'Use the form to log your first service record.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-transit-dark-border bg-transit-dark/50 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      <th className="px-5 py-4">Vehicle</th>
                      <th className="px-5 py-4">Service Type</th>
                      <th className="px-5 py-4 text-right">Cost</th>
                      <th className="px-5 py-4">Date</th>
                      <th className="px-5 py-4">Status</th>
                      {canWrite && <th className="px-5 py-4 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-transit-dark-border text-sm text-gray-300">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="transition-colors hover:bg-white/[0.025]">
                        {/* Vehicle */}
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono text-xs font-semibold text-transit-orange">
                              {log.vehicleRegNo}
                            </span>
                            <span className="text-xs text-gray-400">{log.vehicleName}</span>
                          </div>
                        </td>

                        {/* Service Type */}
                        <td className="px-5 py-4 font-medium text-white">{log.serviceType}</td>

                        {/* Cost */}
                        <td className="px-5 py-4 text-right font-mono text-gray-300">
                          {fmtCurrency(log.cost)}
                        </td>

                        {/* Date */}
                        <td className="px-5 py-4 text-gray-400">{fmtDate(log.date)}</td>

                        {/* Status badge */}
                        <td className="px-5 py-4">
                          <span
                            className={[
                              'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                              LOG_STATUS_STYLES[log.status] ?? LOG_STATUS_STYLES.Active,
                            ].join(' ')}
                          >
                            {log.status}
                          </span>
                        </td>

                        {/* Action */}
                        {canWrite && (
                          <td className="px-5 py-4 text-right">
                            {log.status === 'Active' ? (
                              <button
                                id={`complete-log-${log.id}`}
                                disabled={completingId === log.id}
                                onClick={() => handleComplete(log.id)}
                                className="rounded border border-transit-dark-border bg-transit-dark px-3 py-1 text-xs font-medium text-emerald-400 transition-colors hover:border-emerald-400 hover:text-white disabled:opacity-50"
                              >
                                {completingId === log.id ? 'Completing…' : 'Mark Complete'}
                              </button>
                            ) : (
                              <span className="text-xs italic text-gray-600">Completed</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Footer */}
                <div className="border-t border-transit-dark-border px-5 py-3 text-xs text-gray-500">
                  Showing {filteredLogs.length} of {logs.length} service record{logs.length !== 1 ? 's' : ''}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
