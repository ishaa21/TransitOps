import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { hasRole } from '../constants/roles'
import AccessDenied from '../components/AccessDenied'
import {
  getFuelLogs,
  createFuelLog,
  getExpenses,
  createExpense,
  getAllOperationalCosts,
} from '../services/fuelExpenseService'
import { getVehicles } from '../services/vehicleService'
import { getTrips } from '../services/tripService'

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n ?? 0)

const fmtCur = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n ?? 0)

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

const today = () => new Date().toISOString().slice(0, 10)

/* ─── Shared sub-components ──────────────────────────────────────────────── */
function SectionHeader({ title, subtitle, onAdd, addLabel }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-transit-dark-border pb-4">
      <div>
        <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
      </div>
      {onAdd && (
        <button
          onClick={onAdd}
          className="flex items-center gap-2 rounded-lg bg-transit-orange px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-transit-orange-hover shadow-md"
        >
          + {addLabel}
        </button>
      )}
    </div>
  )
}

function StatusPill({ label, color }) {
  const palette = {
    orange: 'bg-orange-500/10 text-transit-orange border-transit-orange/20',
    green:  'bg-green-500/10 text-green-400 border-green-500/20',
    blue:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
    amber:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
    gray:   'bg-gray-500/10 text-gray-400 border-gray-500/20',
    red:    'bg-red-500/10 text-red-400 border-red-500/20',
  }
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${palette[color] ?? palette.gray}`}>
      {label}
    </span>
  )
}

const STATUS_COLOR = {
  Available: 'green',
  OnTrip: 'orange',
  InShop: 'amber',
  Retired: 'gray',
}

/* ─── Modal wrapper ──────────────────────────────────────────────────────── */
function Modal({ title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-xl border border-transit-dark-border bg-transit-dark-elevated p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-white text-lg leading-none"
        >
          ✕
        </button>
        <h3 className="text-base font-bold text-white">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-gray-400 mb-5">{subtitle}</p>}
        {!subtitle && <div className="mt-4" />}
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-2 text-sm text-white outline-none focus:border-transit-orange placeholder-gray-600'
const selectCls =
  'w-full rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-2 text-sm text-white outline-none focus:border-transit-orange'

/* ════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════════════════════ */
export default function FuelExpenses() {
  const { user } = useAuth()
  const isAuthorized = hasRole(user, 'financial_analyst', 'FinancialAnalyst')

  const [fuelLogs, setFuelLogs] = useState([])
  const [expenses, setExpenses] = useState([])
  const [opCosts, setOpCosts] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [trips, setTrips] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  /* ── Log Fuel modal state ── */
  const [showFuelModal, setShowFuelModal] = useState(false)
  const [fVehicleId, setFVehicleId] = useState('')
  const [fLiters, setFLiters] = useState('')
  const [fCost, setFCost] = useState('')
  const [fDate, setFDate] = useState(today())
  const [fError, setFError] = useState('')
  const [fSaving, setFSaving] = useState(false)

  /* ── Add Expense modal state ── */
  const [showExpModal, setShowExpModal] = useState(false)
  const [eVehicleId, setEVehicleId] = useState('')
  const [eTripId, setETripId] = useState('')
  const [eToll, setEToll] = useState('')
  const [eMisc, setEMisc] = useState('')
  const [eDate, setEDate] = useState(today())
  const [eError, setEError] = useState('')
  const [eSaving, setESaving] = useState(false)

  /* ── Data fetch ─────────────────────────────────────────────────────────── */
  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [fl, ex, oc, veh, tr] = await Promise.all([
        getFuelLogs(),
        getExpenses(),
        getAllOperationalCosts(),
        getVehicles(),
        getTrips(),
      ])
      setFuelLogs(fl)
      setExpenses(ex)
      setOpCosts(oc)
      setVehicles(veh)
      setTrips(tr)
    } catch (err) {
      console.error(err)
      setError('Failed to load data. Please retry.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAuthorized) {
      setLoading(false)
      return
    }
    fetchAll()
  }, [isAuthorized, fetchAll])

  const flash = (msg) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  /* ── Log Fuel submit ────────────────────────────────────────────────────── */
  const handleLogFuel = async (e) => {
    e.preventDefault()
    setFError('')
    if (!fVehicleId) { setFError('Select a vehicle'); return }
    if (!fLiters || isNaN(Number(fLiters)) || Number(fLiters) <= 0) { setFError('Enter a valid litres value'); return }
    if (!fCost || isNaN(Number(fCost)) || Number(fCost) < 0) { setFError('Enter a valid cost'); return }
    if (!fDate) { setFError('Select a date'); return }

    setFSaving(true)
    try {
      await createFuelLog({
        vehicleId: fVehicleId,
        liters: fLiters,
        cost: fCost,
        date: new Date(fDate).toISOString(),
      })
      setShowFuelModal(false)
      setFVehicleId(''); setFLiters(''); setFCost(''); setFDate(today())
      await fetchAll()
      flash('Fuel log recorded successfully.')
    } catch (err) {
      setFError(err.response?.data?.message || 'Failed to log fuel')
    } finally {
      setFSaving(false)
    }
  }

  /* ── Add Expense submit ─────────────────────────────────────────────────── */
  const handleAddExpense = async (e) => {
    e.preventDefault()
    setEError('')
    if (!eVehicleId) { setEError('Select a vehicle'); return }
    if (isNaN(Number(eToll)) || Number(eToll) < 0) { setEError('Enter a valid toll amount (can be 0)'); return }
    if (isNaN(Number(eMisc)) || Number(eMisc) < 0) { setEError('Enter a valid misc amount (can be 0)'); return }
    if (!eDate) { setEError('Select a date'); return }

    setESaving(true)
    try {
      await createExpense({
        vehicleId: eVehicleId,
        tripId: eTripId || null,
        toll: eToll || 0,
        misc: eMisc || 0,
        date: new Date(eDate).toISOString(),
      })
      setShowExpModal(false)
      setEVehicleId(''); setETripId(''); setEToll(''); setEMisc(''); setEDate(today())
      await fetchAll()
      flash('Expense recorded successfully.')
    } catch (err) {
      setEError(err.response?.data?.message || 'Failed to add expense')
    } finally {
      setESaving(false)
    }
  }

  /* ── Totals for summary row ─────────────────────────────────────────────── */
  const grandFuel = fuelLogs.reduce((s, l) => s + (l.cost ?? 0), 0)
  const grandFuelL = fuelLogs.reduce((s, l) => s + (l.liters ?? 0), 0)
  const grandToll = expenses.reduce((s, e) => s + (e.toll ?? 0), 0)
  const grandMisc = expenses.reduce((s, e) => s + (e.misc ?? 0), 0)
  const grandTotal = opCosts.reduce((s, c) => s + (c.totalOperationalCost ?? 0), 0)

  if (!isAuthorized) {
    return (
      <AccessDenied
        moduleName="Fuel & Expense Management"
        requiredRole="Financial Analyst"
        userRole={user?.role}
      />
    )
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Fuel & Expense Management</h2>
        <p className="mt-1 text-sm text-gray-400">Track fuel consumption, trip expenses, and total operational cost per vehicle.</p>
      </div>

      {/* ── Global alerts ── */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={fetchAll} className="ml-4 text-xs underline hover:no-underline">Retry</button>
        </div>
      )}
      {successMsg && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          ✓ {successMsg}
        </div>
      )}

      {/* ── Summary KPI strip ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Fuel Cost', value: fmtCur(grandFuel), icon: '⛽', color: '#ea580c' },
          { label: 'Fuel Consumed', value: `${fmt(grandFuelL)} L`, icon: '🛢️', color: '#3b82f6' },
          { label: 'Total Toll & Misc', value: fmtCur(grandToll + grandMisc), icon: '🏷️', color: '#a855f7' },
          { label: 'Total Op. Cost', value: fmtCur(grandTotal), icon: '📊', color: '#10b981' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-transit-dark-border bg-transit-dark-elevated p-4"
            style={{ boxShadow: `0 0 0 1px ${kpi.color}18` }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{kpi.label}</p>
              <span className="text-base opacity-60">{kpi.icon}</span>
            </div>
            <p className="text-xl font-bold" style={{ color: kpi.color }}>
              {loading ? <span className="block h-5 w-24 rounded bg-transit-dark animate-pulse" /> : kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          FUEL LOGS TABLE
          ════════════════════════════════════════════════════════════════════════ */}
      <div className="rounded-xl border border-transit-dark-border bg-transit-dark-elevated overflow-hidden">
        <div className="p-5">
          <SectionHeader
            title="Fuel Logs"
            subtitle="All fuel fill-up records across the fleet"
            onAdd={() => setShowFuelModal(true)}
            addLabel="Log Fuel"
          />
        </div>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-transit-orange border-t-transparent" />
          </div>
        ) : fuelLogs.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-center p-6 text-gray-500">
            <span className="text-2xl mb-1">⛽</span>
            <p className="text-sm">No fuel logs yet. Click "Log Fuel" to add the first entry.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-y border-transit-dark-border bg-transit-dark/40 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-3">Vehicle</th>
                  <th className="px-5 py-3">Reg No.</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Litres</th>
                  <th className="px-5 py-3 text-right">Cost (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-transit-dark-border text-gray-300">
                {fuelLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 font-semibold text-white">{log.vehicleName}</td>
                    <td className="px-5 py-3 font-mono text-gray-400 text-xs">{log.vehicleRegNo}</td>
                    <td className="px-5 py-3 text-gray-400">{fmtDate(log.date)}</td>
                    <td className="px-5 py-3 text-right font-medium text-blue-400">{fmt(log.liters)} L</td>
                    <td className="px-5 py-3 text-right font-semibold text-transit-orange">{fmtCur(log.cost)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-transit-dark-border bg-transit-dark/60 text-xs font-bold text-gray-400">
                  <td colSpan={3} className="px-5 py-3">TOTAL ({fuelLogs.length} entries)</td>
                  <td className="px-5 py-3 text-right text-blue-300">{fmt(grandFuelL)} L</td>
                  <td className="px-5 py-3 text-right text-transit-orange">{fmtCur(grandFuel)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          EXPENSES TABLE
          ════════════════════════════════════════════════════════════════════════ */}
      <div className="rounded-xl border border-transit-dark-border bg-transit-dark-elevated overflow-hidden">
        <div className="p-5">
          <SectionHeader
            title="Other Expenses"
            subtitle="Toll and miscellaneous charges per trip"
            onAdd={() => setShowExpModal(true)}
            addLabel="Add Expense"
          />
        </div>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-transit-orange border-t-transparent" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-center p-6 text-gray-500">
            <span className="text-2xl mb-1">🏷️</span>
            <p className="text-sm">No expense records yet. Click "Add Expense" to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-y border-transit-dark-border bg-transit-dark/40 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-3">Trip</th>
                  <th className="px-5 py-3">Vehicle</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Toll (₹)</th>
                  <th className="px-5 py-3 text-right">Misc (₹)</th>
                  <th className="px-5 py-3 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-transit-dark-border text-gray-300">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 text-gray-400 text-xs">{exp.tripRoute ?? <span className="italic text-gray-600">No trip</span>}</td>
                    <td className="px-5 py-3 font-semibold text-white">{exp.vehicleName}</td>
                    <td className="px-5 py-3 text-gray-400">{fmtDate(exp.date)}</td>
                    <td className="px-5 py-3 text-right text-gray-300">{fmtCur(exp.toll)}</td>
                    <td className="px-5 py-3 text-right text-gray-300">{fmtCur(exp.misc)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-purple-400">{fmtCur(exp.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-transit-dark-border bg-transit-dark/60 text-xs font-bold text-gray-400">
                  <td colSpan={3} className="px-5 py-3">TOTAL ({expenses.length} entries)</td>
                  <td className="px-5 py-3 text-right text-gray-300">{fmtCur(grandToll)}</td>
                  <td className="px-5 py-3 text-right text-gray-300">{fmtCur(grandMisc)}</td>
                  <td className="px-5 py-3 text-right text-purple-300">{fmtCur(grandToll + grandMisc)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          OPERATIONAL COST PER VEHICLE
          ════════════════════════════════════════════════════════════════════════ */}
      <div className="rounded-xl border border-transit-dark-border bg-transit-dark-elevated overflow-hidden">
        <div className="p-5">
          <SectionHeader
            title="Total Operational Cost — Fleet View"
            subtitle="Running total of fuel + maintenance + expenses per vehicle"
          />
        </div>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-transit-orange border-t-transparent" />
          </div>
        ) : opCosts.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-center p-6 text-gray-500 text-sm">
            No cost data available.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-y border-transit-dark-border bg-transit-dark/40 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-3">Vehicle</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Fuel Cost</th>
                  <th className="px-5 py-3 text-right">Maintenance</th>
                  <th className="px-5 py-3 text-right">Expenses</th>
                  <th className="px-5 py-3 text-right">Total Op. Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-transit-dark-border text-gray-300">
                {opCosts.map((oc) => (
                  <tr key={oc.vehicleId} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-semibold text-white">{oc.vehicleName}</div>
                      <div className="text-[11px] font-mono text-gray-500">{oc.vehicleRegNo}</div>
                    </td>
                    <td className="px-5 py-3">
                      <StatusPill label={oc.vehicleStatus} color={STATUS_COLOR[oc.vehicleStatus] ?? 'gray'} />
                    </td>
                    <td className="px-5 py-3 text-right text-blue-400">{fmtCur(oc.totalFuelCost)}</td>
                    <td className="px-5 py-3 text-right text-amber-400">{fmtCur(oc.totalMaintenanceCost)}</td>
                    <td className="px-5 py-3 text-right text-purple-400">{fmtCur(oc.totalExpenses)}</td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-bold text-transit-orange text-base">{fmtCur(oc.totalOperationalCost)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-transit-dark-border bg-transit-dark/60 text-xs font-bold">
                  <td colSpan={2} className="px-5 py-3 text-gray-400">FLEET TOTAL</td>
                  <td className="px-5 py-3 text-right text-blue-300">
                    {fmtCur(opCosts.reduce((s, c) => s + c.totalFuelCost, 0))}
                  </td>
                  <td className="px-5 py-3 text-right text-amber-300">
                    {fmtCur(opCosts.reduce((s, c) => s + c.totalMaintenanceCost, 0))}
                  </td>
                  <td className="px-5 py-3 text-right text-purple-300">
                    {fmtCur(opCosts.reduce((s, c) => s + c.totalExpenses, 0))}
                  </td>
                  <td className="px-5 py-3 text-right text-transit-orange text-base font-extrabold">
                    {fmtCur(grandTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          LOG FUEL MODAL
          ════════════════════════════════════════════════════════════════════════ */}
      {showFuelModal && (
        <Modal
          title="Log Fuel Fill-Up"
          subtitle="Record a fuel refill event for a fleet vehicle."
          onClose={() => { setShowFuelModal(false); setFError('') }}
        >
          <form onSubmit={handleLogFuel} className="space-y-4">
            {fError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">✕ {fError}</div>
            )}

            <Field label="Vehicle">
              <select required value={fVehicleId} onChange={(e) => setFVehicleId(e.target.value)} className={selectCls}>
                <option value="">— Select vehicle —</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.name} ({v.regNo})</option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Litres">
                <input type="number" step="0.01" min="0.01" required value={fLiters}
                  onChange={(e) => setFLiters(e.target.value)} placeholder="e.g. 120" className={inputCls} />
              </Field>
              <Field label="Cost (₹)">
                <input type="number" step="0.01" min="0" required value={fCost}
                  onChange={(e) => setFCost(e.target.value)} placeholder="e.g. 9600" className={inputCls} />
              </Field>
            </div>

            <Field label="Date">
              <input type="date" required value={fDate} max={today()}
                onChange={(e) => setFDate(e.target.value)} className={inputCls} />
            </Field>

            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => { setShowFuelModal(false); setFError('') }}
                className="rounded-lg border border-transit-dark-border px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white hover:border-gray-500 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={fSaving}
                className="rounded-lg bg-transit-orange px-5 py-2 text-xs font-semibold text-white hover:bg-transit-orange-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {fSaving ? 'Saving…' : 'Save Log'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          ADD EXPENSE MODAL
          ════════════════════════════════════════════════════════════════════════ */}
      {showExpModal && (
        <Modal
          title="Add Expense"
          subtitle="Record toll charges and miscellaneous expenses."
          onClose={() => { setShowExpModal(false); setEError('') }}
        >
          <form onSubmit={handleAddExpense} className="space-y-4">
            {eError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">✕ {eError}</div>
            )}

            <Field label="Vehicle">
              <select required value={eVehicleId} onChange={(e) => setEVehicleId(e.target.value)} className={selectCls}>
                <option value="">— Select vehicle —</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.name} ({v.regNo})</option>
                ))}
              </select>
            </Field>

            <Field label="Trip (optional)">
              <select value={eTripId} onChange={(e) => setETripId(e.target.value)} className={selectCls}>
                <option value="">— No trip —</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>{t.source} → {t.destination} ({t.status})</option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Toll (₹)">
                <input type="number" step="0.01" min="0" value={eToll}
                  onChange={(e) => setEToll(e.target.value)} placeholder="0" className={inputCls} />
              </Field>
              <Field label="Misc (₹)">
                <input type="number" step="0.01" min="0" value={eMisc}
                  onChange={(e) => setEMisc(e.target.value)} placeholder="0" className={inputCls} />
              </Field>
            </div>

            {(eToll || eMisc) && (
              <div className="rounded-lg bg-white/5 border border-transit-dark-border px-3 py-2 text-xs">
                <span className="text-gray-400">Total: </span>
                <span className="font-bold text-white">{fmtCur((Number(eToll) || 0) + (Number(eMisc) || 0))}</span>
              </div>
            )}

            <Field label="Date">
              <input type="date" required value={eDate} max={today()}
                onChange={(e) => setEDate(e.target.value)} className={inputCls} />
            </Field>

            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => { setShowExpModal(false); setEError('') }}
                className="rounded-lg border border-transit-dark-border px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white hover:border-gray-500 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={eSaving}
                className="rounded-lg bg-transit-orange px-5 py-2 text-xs font-semibold text-white hover:bg-transit-orange-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {eSaving ? 'Saving…' : 'Save Expense'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
