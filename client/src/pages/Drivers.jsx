import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { hasRole } from '../constants/roles'
import AccessDenied from '../components/AccessDenied'
import { getDrivers, createDriver, updateDriver, deleteDriver, sendExpiryReminders } from '../services/driverService'

export default function Drivers() {
  const { user } = useAuth()
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  // Sorting
  const [sortField, setSortField] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  
  // Reminders states
  const [sendingReminders, setSendingReminders] = useState(false)
  const [reminderMessage, setReminderMessage] = useState('')

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState(null)

  // Form states
  const [formName, setFormName] = useState('')
  const [formLicenseNo, setFormLicenseNo] = useState('')
  const [formLicenseCategory, setFormLicenseCategory] = useState('HMV')
  const [formLicenseExpiry, setFormLicenseExpiry] = useState('')
  const [formContact, setFormContact] = useState('')
  const [formSafetyScore, setFormSafetyScore] = useState(90)
  const [formStatus, setFormStatus] = useState('Available')
  const [formError, setFormError] = useState('')

  const canWrite = hasRole(user, 'safety_officer', 'SafetyOfficer', 'fleet_manager', 'FleetManager')
  const isAuthorized = hasRole(
    user,
    'safety_officer',
    'SafetyOfficer',
    'dispatcher',
    'Dispatcher',
    'financial_analyst',
    'FinancialAnalyst',
  )

  const fetchDrivers = async () => {
    setLoading(true)
    try {
      const data = await getDrivers()
      setDrivers(data)
    } catch (err) {
      console.error(err)
      setError('Failed to fetch drivers. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthorized) fetchDrivers()
    else setLoading(false)
  }, [isAuthorized])

  const isLicenseExpired = (expiryDateStr) => {
    if (!expiryDateStr) return false
    const expiry = new Date(expiryDateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return expiry < today
  }

  // Open Modals
  const handleOpenAddModal = () => {
    setFormName('')
    setFormLicenseNo('')
    setFormLicenseCategory('HMV')
    setFormLicenseExpiry('')
    setFormContact('')
    setFormSafetyScore(90)
    setFormStatus('Available')
    setFormError('')
    setShowAddModal(true)
  }

  const handleOpenEditModal = (driver) => {
    setSelectedDriver(driver)
    setFormName(driver.name)
    setFormLicenseNo(driver.licenseNo)
    setFormLicenseCategory(driver.licenseCategory)
    const dateOnly = driver.licenseExpiry ? driver.licenseExpiry.substring(0, 10) : ''
    setFormLicenseExpiry(dateOnly)
    setFormContact(driver.contact)
    setFormSafetyScore(driver.safetyScore)
    setFormStatus(driver.status)
    setFormError('')
    setShowEditModal(true)
  }

  const handleOpenDeleteModal = (driver) => {
    setSelectedDriver(driver)
    setShowDeleteModal(true)
  }

  // Validations
  const validateForm = () => {
    if (!formName.trim()) return 'Name is required'
    if (!formLicenseNo.trim()) return 'License number is required'
    if (!formLicenseExpiry) return 'License expiry date is required'
    if (!formContact.trim()) return 'Contact number is required'
    
    const score = Number(formSafetyScore)
    if (isNaN(score) || score < 0 || score > 100) {
      return 'Safety score must be a number between 0 and 100'
    }
    return ''
  }

  // Submit Actions
  const handleAddDriver = async (e) => {
    e.preventDefault()
    const err = validateForm()
    if (err) {
      setFormError(err)
      return
    }

    try {
      await createDriver({
        name: formName.trim(),
        licenseNo: formLicenseNo.trim(),
        licenseCategory: formLicenseCategory,
        licenseExpiry: new Date(formLicenseExpiry).toISOString(),
        contact: formContact.trim(),
        safetyScore: Number(formSafetyScore),
        status: formStatus,
      })
      setShowAddModal(false)
      fetchDrivers()
    } catch (err) {
      console.error(err)
      setFormError(err.response?.data?.message || 'Failed to create driver')
    }
  }

  const handleEditDriver = async (e) => {
    e.preventDefault()
    const err = validateForm()
    if (err) {
      setFormError(err)
      return
    }

    try {
      await updateDriver(selectedDriver.id, {
        name: formName.trim(),
        licenseNo: formLicenseNo.trim(),
        licenseCategory: formLicenseCategory,
        licenseExpiry: new Date(formLicenseExpiry).toISOString(),
        contact: formContact.trim(),
        safetyScore: Number(formSafetyScore),
        status: formStatus,
      })
      setShowEditModal(false)
      fetchDrivers()
    } catch (err) {
      console.error(err)
      setFormError(err.response?.data?.message || 'Failed to update driver')
    }
  }

  const handleDeleteDriver = async () => {
    try {
      await deleteDriver(selectedDriver.id)
      setShowDeleteModal(false)
      fetchDrivers()
    } catch (err) {
      console.error(err)
      setError('Failed to delete driver')
    }
  }

  const handleSendReminders = async () => {
    setSendingReminders(true)
    setReminderMessage('')
    try {
      const res = await sendExpiryReminders()
      if (res.success) {
        setReminderMessage(`Email reminders sent successfully to ${res.count} driver(s).`)
        setTimeout(() => setReminderMessage(''), 4000)
      }
    } catch (err) {
      console.error(err)
      setError('Failed to send license expiry reminders.')
    } finally {
      setSendingReminders(false)
    }
  }

  // Search, Filter and Sort Logic
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const sortedDrivers = [...drivers]
    .filter((driver) => {
      const matchesSearch = driver.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'All' || driver.status === statusFilter
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      let valA = a[sortField]
      let valB = b[sortField]

      if (typeof valA === 'string') {
        valA = valA.toLowerCase()
        valB = valB.toLowerCase()
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

  // Helper safety score formatting
  const getSafetyScoreColor = (score) => {
    if (score >= 90) return 'text-green-400 font-semibold'
    if (score >= 70) return 'text-yellow-400 font-semibold'
    return 'text-red-400 font-semibold'
  }

  if (!isAuthorized) {
    return (
      <AccessDenied
        moduleName="Driver Management"
        requiredRole="Safety Officer, Dispatcher, or Financial Analyst"
        userRole={user?.role}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Driver Management</h2>
          <p className="mt-1 text-sm text-gray-400">View compliance, license status, safety scores, and driver assignments.</p>
        </div>

        {canWrite ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSendReminders}
              disabled={sendingReminders}
              className="flex items-center justify-center gap-2 rounded-lg bg-transit-dark border border-transit-dark-border px-4 py-2.5 text-sm font-semibold text-gray-300 hover:text-white hover:border-gray-500 transition-colors shadow-md disabled:opacity-50"
            >
              📧 {sendingReminders ? 'Sending Alerts…' : 'Send Expiry Alerts'}
            </button>
            <button
              onClick={handleOpenAddModal}
              className="flex items-center justify-center gap-2 rounded-lg bg-transit-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-transit-orange-hover shadow-md hover:shadow-transit-orange/20"
            >
              <span>+</span> Add Driver
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-transit-dark-border bg-transit-dark-elevated px-4 py-2.5 text-sm text-gray-400">
            <span className="text-base">🔒</span>
            <span>Read-Only Mode</span>
          </div>
        )}
      </div>

      {/* Reminder Notification */}
      {reminderMessage && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400 animate-pulse">
          ✓ {reminderMessage}
        </div>
      )}

      {/* Search / Filters */}
      <div className="flex flex-col gap-4 rounded-xl border border-transit-dark-border bg-transit-dark-elevated p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by driver name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-transit-dark-border bg-transit-dark px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-transit-orange"
          />
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="status-filter" className="text-xs uppercase tracking-wider text-gray-400 font-medium">Status:</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-transit-dark-border bg-transit-dark px-4 py-2.5 text-sm text-white outline-none focus:border-transit-orange"
          >
            <option value="All">All Statuses</option>
            <option value="Available">Available</option>
            <option value="OnTrip">On Trip</option>
            <option value="OffDuty">Off Duty</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-xl border border-transit-dark-border bg-transit-dark-elevated">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-transit-orange border-t-transparent" />
          </div>
        ) : error ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-center p-6">
            <span className="text-2xl">⚠️</span>
            <p className="text-red-400">{error}</p>
            <button onClick={fetchDrivers} className="mt-2 text-sm text-blue-400 hover:underline">Retry</button>
          </div>
        ) : sortedDrivers.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center p-6">
            <span className="text-2xl text-gray-500">📂</span>
            <p className="mt-2 text-gray-400 font-medium">No drivers found</p>
            <p className="text-xs text-gray-500 mt-1">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-transit-dark-border bg-transit-dark/40 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  <th className="px-6 py-4 cursor-pointer hover:text-white select-none transition-colors" onClick={() => handleSort('name')}>
                    Name {sortField === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:text-white select-none transition-colors" onClick={() => handleSort('licenseNo')}>
                    License No {sortField === 'licenseNo' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:text-white select-none transition-colors" onClick={() => handleSort('licenseCategory')}>
                    Category {sortField === 'licenseCategory' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:text-white select-none transition-colors" onClick={() => handleSort('licenseExpiry')}>
                    Expiry Date {sortField === 'licenseExpiry' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:text-white select-none transition-colors" onClick={() => handleSort('contact')}>
                    Contact {sortField === 'contact' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:text-white select-none transition-colors" onClick={() => handleSort('safetyScore')}>
                    Safety Score {sortField === 'safetyScore' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:text-white select-none transition-colors" onClick={() => handleSort('status')}>
                    Status {sortField === 'status' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="px-6 py-4 text-right select-none">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-transit-dark-border text-sm text-gray-300">
                {sortedDrivers.map((driver) => {
                  const expired = isLicenseExpired(driver.licenseExpiry)
                  return (
                    <tr key={driver.id} className="transition-colors hover:bg-white/[0.02]">
                      <td className="px-6 py-4 font-semibold text-white">{driver.name}</td>
                      <td className="px-6 py-4 font-mono text-gray-400">{driver.licenseNo}</td>
                      <td className="px-6 py-4">
                        <span className="rounded bg-white/5 px-2 py-0.5 text-xs text-gray-300 font-medium">
                          {driver.licenseCategory}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span>
                            {driver.licenseExpiry
                              ? new Date(driver.licenseExpiry).toLocaleDateString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : 'N/A'}
                          </span>
                          {expired && (
                            <span className="inline-flex w-fit items-center gap-1 rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
                              ⚠️ Expired
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-400">{driver.contact}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={getSafetyScoreColor(driver.safetyScore)}>
                            {driver.safetyScore}
                          </span>
                          <span className="text-[10px] text-gray-500">/100</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={[
                            'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border',
                            driver.status === 'Available'
                              ? 'bg-green-500/10 text-green-400 border-green-500/20'
                              : driver.status === 'OnTrip'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : 'bg-gray-500/10 text-gray-400 border-gray-500/20',
                          ].join(' ')}
                        >
                          {driver.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {canWrite ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditModal(driver)}
                              className="rounded border border-transit-dark-border bg-transit-dark px-2.5 py-1 text-xs text-blue-400 transition-colors hover:border-blue-400 hover:text-white"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleOpenDeleteModal(driver)}
                              className="rounded border border-transit-dark-border bg-transit-dark px-2.5 py-1 text-xs text-red-400 transition-colors hover:border-red-400 hover:text-white"
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 italic">Locked</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= ADD DRIVER MODAL ================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="relative w-full max-w-lg rounded-xl border border-transit-dark-border bg-transit-dark-elevated p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-white">Add New Driver</h3>
            <p className="text-xs text-gray-400 mt-0.5">Register a new driver profile with compliance details.</p>

            <form onSubmit={handleAddDriver} className="mt-4 space-y-4">
              {formError && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-400">
                  ✕ {formError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-2 text-sm text-white outline-none focus:border-transit-orange"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">License No</label>
                  <input
                    type="text"
                    required
                    value={formLicenseNo}
                    onChange={(e) => setFormLicenseNo(e.target.value)}
                    placeholder="e.g. DL-2020-45821"
                    className="w-full rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-2 text-sm text-white outline-none focus:border-transit-orange"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">License Category</label>
                  <select
                    value={formLicenseCategory}
                    onChange={(e) => setFormLicenseCategory(e.target.value)}
                    className="w-full rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-2 text-sm text-white outline-none focus:border-transit-orange"
                  >
                    <option value="HMV">HMV (Heavy Motor Vehicle)</option>
                    <option value="LMV">LMV (Light Motor Vehicle)</option>
                    <option value="MCWG">MCWG (Motorcycle With Gear)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">License Expiry</label>
                  <input
                    type="date"
                    required
                    value={formLicenseExpiry}
                    onChange={(e) => setFormLicenseExpiry(e.target.value)}
                    className="w-full rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-2 text-sm text-white outline-none focus:border-transit-orange"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Contact</label>
                  <input
                    type="text"
                    required
                    value={formContact}
                    onChange={(e) => setFormContact(e.target.value)}
                    placeholder="e.g. +91-9876543210"
                    className="w-full rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-2 text-sm text-white outline-none focus:border-transit-orange"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Safety Score (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={formSafetyScore}
                    onChange={(e) => setFormSafetyScore(e.target.value)}
                    className="w-full rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-2 text-sm text-white outline-none focus:border-transit-orange"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-2 text-sm text-white outline-none focus:border-transit-orange"
                  >
                    <option value="Available">Available</option>
                    <option value="OnTrip">On Trip</option>
                    <option value="OffDuty">Off Duty</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-transit-dark-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-transit-dark-border bg-transit-dark px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-transit-orange px-4 py-2 text-sm font-semibold text-white hover:bg-transit-orange-hover transition-colors"
                >
                  Save Driver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= EDIT DRIVER MODAL ================= */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="relative w-full max-w-lg rounded-xl border border-transit-dark-border bg-transit-dark-elevated p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-white">Edit Driver Profile</h3>
            <p className="text-xs text-gray-400 mt-0.5">Modify the registration/compliance records for {selectedDriver?.name}.</p>

            <form onSubmit={handleEditDriver} className="mt-4 space-y-4">
              {formError && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-400">
                  ✕ {formError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-2 text-sm text-white outline-none focus:border-transit-orange"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">License No</label>
                  <input
                    type="text"
                    required
                    value={formLicenseNo}
                    onChange={(e) => setFormLicenseNo(e.target.value)}
                    className="w-full rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-2 text-sm text-white outline-none focus:border-transit-orange"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">License Category</label>
                  <select
                    value={formLicenseCategory}
                    onChange={(e) => setFormLicenseCategory(e.target.value)}
                    className="w-full rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-2 text-sm text-white outline-none focus:border-transit-orange"
                  >
                    <option value="HMV">HMV (Heavy Motor Vehicle)</option>
                    <option value="LMV">LMV (Light Motor Vehicle)</option>
                    <option value="MCWG">MCWG (Motorcycle With Gear)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">License Expiry</label>
                  <input
                    type="date"
                    required
                    value={formLicenseExpiry}
                    onChange={(e) => setFormLicenseExpiry(e.target.value)}
                    className="w-full rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-2 text-sm text-white outline-none focus:border-transit-orange"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Contact</label>
                  <input
                    type="text"
                    required
                    value={formContact}
                    onChange={(e) => setFormContact(e.target.value)}
                    className="w-full rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-2 text-sm text-white outline-none focus:border-transit-orange"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Safety Score (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={formSafetyScore}
                    onChange={(e) => setFormSafetyScore(e.target.value)}
                    className="w-full rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-2 text-sm text-white outline-none focus:border-transit-orange"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full rounded-lg border border-transit-dark-border bg-transit-dark px-3 py-2 text-sm text-white outline-none focus:border-transit-orange"
                  >
                    <option value="Available">Available</option>
                    <option value="OnTrip">On Trip</option>
                    <option value="OffDuty">Off Duty</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-transit-dark-border">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="rounded-lg border border-transit-dark-border bg-transit-dark px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-transit-orange px-4 py-2 text-sm font-semibold text-white hover:bg-transit-orange-hover transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= DELETE CONFIRMATION MODAL ================= */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="relative w-full max-w-md rounded-xl border border-transit-dark-border bg-transit-dark-elevated p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-white">Delete Driver?</h3>
            <p className="mt-2 text-sm text-gray-400">
              Are you sure you want to delete <span className="font-semibold text-white">{selectedDriver?.name}</span>? This action is permanent and cannot be undone.
            </p>

            <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-transit-dark-border">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="rounded-lg border border-transit-dark-border bg-transit-dark px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteDriver}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
              >
                Delete Driver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
