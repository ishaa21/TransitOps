import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchDashboardKpis } from '../services/dashboardService'

/* ─── KPI configuration ───────────────────────────────────────────────────── */
const KPI_CONFIG = [
  {
    key: 'activeVehicles',
    label: 'Active Vehicles',
    icon: '🚛',
    gradient: 'from-blue-600/20 to-blue-500/5',
    ring: 'border-blue-500/30',
    accent: '#3b82f6',
    textAccent: 'text-blue-400',
  },
  {
    key: 'availableVehicles',
    label: 'Available Vehicles',
    icon: '✅',
    gradient: 'from-emerald-600/20 to-emerald-500/5',
    ring: 'border-emerald-500/30',
    accent: '#10b981',
    textAccent: 'text-emerald-400',
  },
  {
    key: 'vehiclesInMaintenance',
    label: 'In Maintenance',
    icon: '🔧',
    gradient: 'from-amber-600/20 to-amber-500/5',
    ring: 'border-amber-500/30',
    accent: '#f59e0b',
    textAccent: 'text-amber-400',
  },
  {
    key: 'activeTrips',
    label: 'Active Trips',
    icon: '🗺️',
    gradient: 'from-orange-600/20 to-orange-500/5',
    ring: 'border-orange-500/30',
    accent: '#ea580c',
    textAccent: 'text-transit-orange',
  },
  {
    key: 'pendingTrips',
    label: 'Pending Trips',
    icon: '⏳',
    gradient: 'from-purple-600/20 to-purple-500/5',
    ring: 'border-purple-500/30',
    accent: '#a855f7',
    textAccent: 'text-purple-400',
  },
  {
    key: 'driversOnDuty',
    label: 'Drivers On Duty',
    icon: '👤',
    gradient: 'from-cyan-600/20 to-cyan-500/5',
    ring: 'border-cyan-500/30',
    accent: '#06b6d4',
    textAccent: 'text-cyan-400',
  },
  {
    key: 'fleetUtilization',
    label: 'Fleet Utilization',
    icon: '📊',
    suffix: '%',
    gradient: 'from-transit-orange/20 to-transit-orange/5',
    ring: 'border-transit-orange/30',
    accent: '#ea580c',
    textAccent: 'text-transit-orange',
    isUtilization: true,
  },
]

const STATUS_STYLES = {
  Draft: {
    bg: 'rgba(107,114,128,0.15)',
    color: '#9ca3af',
    dot: '#6b7280',
    label: 'Draft',
  },
  Dispatched: {
    bg: 'rgba(234,88,12,0.15)',
    color: '#ea580c',
    dot: '#ea580c',
    label: 'Dispatched',
  },
  Completed: {
    bg: 'rgba(16,185,129,0.15)',
    color: '#10b981',
    dot: '#10b981',
    label: 'Completed',
  },
  Cancelled: {
    bg: 'rgba(239,68,68,0.15)',
    color: '#ef4444',
    dot: '#ef4444',
    label: 'Cancelled',
  },
}

const BAR_COLORS = {
  Available: '#10b981',
  OnTrip: '#ea580c',
  InShop: '#f59e0b',
  Retired: '#6b7280',
}

const BAR_LABELS = {
  Available: 'Available',
  OnTrip: 'On Trip',
  InShop: 'In Shop',
  Retired: 'Retired',
}

/* ─── Sub-components ───────────────────────────────────────────────────────── */

function FilterSelect({ id, label, value, onChange, options }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label
        htmlFor={id}
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#6b7280',
        }}
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          minWidth: 140,
          padding: '8px 12px',
          borderRadius: 8,
          border: '1px solid #2a2f3d',
          background: '#0f1117',
          color: value ? '#fff' : '#6b7280',
          fontSize: 13,
          outline: 'none',
          cursor: 'pointer',
          transition: 'border-color 0.2s',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 10px center',
          paddingRight: 32,
        }}
        onFocus={(e) => (e.target.style.borderColor = '#ea580c')}
        onBlur={(e) => (e.target.style.borderColor = '#2a2f3d')}
      >
        <option value="">All</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  )
}

function KpiCard({ label, value, icon, suffix = '', gradient, ring, accent, textAccent, isUtilization, loading }) {
  const displayValue = loading ? null : (value ?? '—')

  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid`,
        borderColor: loading ? '#2a2f3d' : undefined,
        background: 'linear-gradient(135deg, #1a1d27, #141720)',
        padding: '20px 22px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      className={`kpi-card ${ring}`}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = `0 8px 30px ${accent}22`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: accent,
          opacity: 0.06,
          filter: 'blur(30px)',
          transform: 'translate(30px, -30px)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            color: '#6b7280',
            margin: 0,
          }}
        >
          {label}
        </p>
        <span style={{ fontSize: 18, opacity: 0.7 }}>{icon}</span>
      </div>

      {loading ? (
        <div
          style={{
            marginTop: 14,
            height: 36,
            width: '60%',
            borderRadius: 6,
            background: 'linear-gradient(90deg, #2a2f3d 25%, #333849 50%, #2a2f3d 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }}
        />
      ) : (
        <p
          className={textAccent}
          style={{
            marginTop: 12,
            fontSize: 34,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          {displayValue}
          {suffix && (
            <span style={{ fontSize: 18, fontWeight: 500, marginLeft: 2 }}>{suffix}</span>
          )}
        </p>
      )}

      {isUtilization && !loading && typeof value === 'number' && (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              height: 4,
              borderRadius: 99,
              background: '#2a2f3d',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${value}%`,
                background: `linear-gradient(90deg, ${accent}, ${accent}cc)`,
                borderRadius: 99,
                transition: 'width 0.8s ease',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function VehicleStatusBar({ breakdown, loading }) {
  const total = breakdown.reduce((sum, item) => sum + item.count, 0)
  const [animated, setAnimated] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!loading && breakdown.length > 0) {
      setTimeout(() => setAnimated(true), 80)
    } else {
      setAnimated(false)
    }
  }, [loading, breakdown])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            height: 36,
            borderRadius: 10,
            background: 'linear-gradient(90deg, #2a2f3d 25%, #333849 50%, #2a2f3d 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }}
        />
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div
              style={{
                height: 14,
                width: '50%',
                borderRadius: 4,
                background: '#2a2f3d',
                animation: 'shimmer 1.5s infinite',
              }}
            />
            <div
              style={{
                height: 14,
                width: 24,
                borderRadius: 4,
                background: '#2a2f3d',
                animation: 'shimmer 1.5s infinite',
              }}
            />
          </div>
        ))}
      </div>
    )
  }

  if (total === 0) {
    return (
      <p style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', padding: '20px 0' }}>
        No vehicles match the current filters.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stacked bar */}
      <div
        style={{
          display: 'flex',
          height: 36,
          borderRadius: 10,
          overflow: 'hidden',
          gap: 2,
        }}
      >
        {breakdown.map((item) => {
          const pct = (item.count / total) * 100
          return (
            <div
              key={item.status}
              title={`${BAR_LABELS[item.status] ?? item.status}: ${item.count}`}
              style={{
                width: animated ? `${pct}%` : '0%',
                background: BAR_COLORS[item.status] ?? '#6b7280',
                transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                cursor: 'default',
                borderRadius: 4,
              }}
            />
          )
        })}
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px 16px',
        }}
      >
        {breakdown.map((item) => {
          const pct = total > 0 ? Math.round((item.count / total) * 100) : 0
          return (
            <div
              key={item.status}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: BAR_COLORS[item.status] ?? '#6b7280',
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 13, color: '#9ca3af', flex: 1 }}>
                {BAR_LABELS[item.status] ?? item.status}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                {item.count}
              </span>
              <span style={{ fontSize: 11, color: '#6b7280', minWidth: 30 }}>
                {pct}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] ?? { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af', dot: '#6b7280' }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 10px',
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 600,
        background: style.bg,
        color: style.color,
        letterSpacing: '0.02em',
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: style.dot,
          flexShrink: 0,
        }}
      />
      {status}
    </span>
  )
}

function TripsTableSkeleton() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <tr key={i}>
          {[1, 2, 3, 4, 5].map((j) => (
            <td key={j} style={{ padding: '14px 20px' }}>
              <div
                style={{
                  height: 14,
                  borderRadius: 4,
                  width: j === 1 ? '80%' : j === 4 ? 70 : '60%',
                  background: 'linear-gradient(90deg, #2a2f3d 25%, #333849 50%, #2a2f3d 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s infinite',
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

/* ─── Main Dashboard ────────────────────────────────────────────────────────── */

export default function Dashboard() {
  const [filters, setFilters] = useState({ vehicleType: '', status: '', region: '' })
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastRefreshed, setLastRefreshed] = useState(null)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await fetchDashboardKpis(filters)
      setData(result)
      setLastRefreshed(new Date())
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadDashboard()

    // Re-fetch when the window gains focus
    const handleFocus = () => loadDashboard()
    window.addEventListener('focus', handleFocus)

    // Re-fetch periodically every 10 seconds (polling)
    const interval = setInterval(() => {
      loadDashboard()
    }, 10000)

    return () => {
      window.removeEventListener('focus', handleFocus)
      clearInterval(interval)
    }
  }, [loadDashboard])

  const filterOptions = useMemo(
    () => ({
      vehicleTypes: data?.filterOptions?.vehicleTypes ?? [],
      statuses: data?.filterOptions?.statuses ?? [],
      regions: data?.filterOptions?.regions ?? [],
    }),
    [data],
  )

  const updateFilter = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value }))

  const hasActiveFilters = Object.values(filters).some(Boolean)

  return (
    <>
      {/* Shimmer keyframe */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .kpi-card { border-style: solid; }
        select option { background: #1a1d27; color: #fff; }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* ── Header row ── */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            alignItems: 'flex-end',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#ea580c',
                margin: '0 0 4px',
              }}
            >
              TransitOps
            </p>
            <h2
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: '#fff',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              Fleet Dashboard
            </h2>
            <p style={{ marginTop: 4, fontSize: 13, color: '#6b7280' }}>
              {lastRefreshed
                ? `Last updated ${lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
                : 'Loading fleet data…'}
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
            <FilterSelect
              id="filter-vehicle-type"
              label="Vehicle Type"
              value={filters.vehicleType}
              onChange={(v) => updateFilter('vehicleType', v)}
              options={filterOptions.vehicleTypes}
            />
            <FilterSelect
              id="filter-status"
              label="Status"
              value={filters.status}
              onChange={(v) => updateFilter('status', v)}
              options={filterOptions.statuses}
            />
            <FilterSelect
              id="filter-region"
              label="Region"
              value={filters.region}
              onChange={(v) => updateFilter('region', v)}
              options={filterOptions.regions}
            />
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => setFilters({ vehicleType: '', status: '', region: '' })}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1px solid #ea580c44',
                  background: '#ea580c11',
                  color: '#ea580c',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  alignSelf: 'flex-end',
                  marginBottom: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#ea580c22'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ea580c11'
                }}
              >
                ✕ Clear filters
              </button>
            )}
            <button
              type="button"
              onClick={loadDashboard}
              disabled={loading}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid #2a2f3d',
                background: loading ? '#2a2f3d' : '#1a1d27',
                color: loading ? '#6b7280' : '#fff',
                fontSize: 12,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                alignSelf: 'flex-end',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ display: 'inline-block', animation: loading ? 'spin 1s linear infinite' : 'none' }}>
                ↻
              </span>
              Refresh
            </button>
          </div>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 10,
              border: '1px solid rgba(239,68,68,0.3)',
              background: 'rgba(239,68,68,0.08)',
              color: '#fca5a5',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>⚠️</span> {error}
          </div>
        )}

        {/* ── KPI Grid ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 14,
          }}
        >
          {KPI_CONFIG.map((kpi) => (
            <KpiCard
              key={kpi.key}
              label={kpi.label}
              value={data?.[kpi.key]}
              icon={kpi.icon}
              suffix={kpi.suffix}
              gradient={kpi.gradient}
              ring={kpi.ring}
              accent={kpi.accent}
              textAccent={kpi.textAccent}
              isUtilization={kpi.isUtilization}
              loading={loading}
            />
          ))}
        </div>

        {/* ── Bottom section: Trips + Status ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 340px',
            gap: 20,
          }}
          className="dashboard-bottom"
        >
          {/* Recent Trips */}
          <div
            style={{
              borderRadius: 14,
              border: '1px solid #2a2f3d',
              background: '#1a1d27',
              overflow: 'hidden',
              minWidth: 0,
            }}
          >
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #2a2f3d',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>
                  Recent Trips
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#6b7280' }}>
                  Latest activity across the fleet
                </p>
              </div>
              {!loading && data?.recentTrips?.length > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#6b7280',
                    background: '#0f1117',
                    border: '1px solid #2a2f3d',
                    borderRadius: 6,
                    padding: '3px 8px',
                  }}
                >
                  {data.recentTrips.length} trips
                </span>
              )}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  minWidth: 580,
                  borderCollapse: 'collapse',
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid #2a2f3d',
                    }}
                  >
                    {['Trip Route', 'Vehicle', 'Driver', 'Status', 'ETA'].map((col) => (
                      <th
                        key={col}
                        style={{
                          padding: '10px 20px',
                          textAlign: 'left',
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: '#4b5563',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TripsTableSkeleton />
                  ) : data?.recentTrips?.length ? (
                    data.recentTrips.map((trip, idx) => (
                      <tr
                        key={trip.id}
                        style={{
                          borderBottom:
                            idx < data.recentTrips.length - 1
                              ? '1px solid #1f2332'
                              : 'none',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = 'transparent')
                        }
                      >
                        <td
                          style={{
                            padding: '14px 20px',
                            fontWeight: 600,
                            color: '#fff',
                            whiteSpace: 'nowrap',
                            maxWidth: 220,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {trip.trip}
                        </td>
                        <td style={{ padding: '14px 20px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                          {trip.vehicle}
                        </td>
                        <td style={{ padding: '14px 20px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                          {trip.driver}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <StatusBadge status={trip.status} />
                        </td>
                        <td
                          style={{
                            padding: '14px 20px',
                            color: '#6b7280',
                            fontSize: 12,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {trip.eta}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          padding: '48px 20px',
                          textAlign: 'center',
                          color: '#4b5563',
                          fontSize: 13,
                        }}
                      >
                        <div style={{ marginBottom: 8, fontSize: 32 }}>🚫</div>
                        No recent trips found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vehicle Status Breakdown */}
          <div
            style={{
              borderRadius: 14,
              border: '1px solid #2a2f3d',
              background: '#1a1d27',
              padding: '22px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
            }}
          >
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>
                Fleet Status
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: '#6b7280' }}>
                Vehicle breakdown by status
              </p>
            </div>

            <VehicleStatusBar
              breakdown={data?.vehicleStatusBreakdown ?? []}
              loading={loading}
            />

            {!loading && data && (
              <div
                style={{
                  marginTop: 20,
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: '#0f1117',
                  border: '1px solid #2a2f3d',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>Fleet Utilization</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#ea580c' }}>
                    {data.fleetUtilization}%
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    borderRadius: 99,
                    background: '#2a2f3d',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${data.fleetUtilization}%`,
                      background: 'linear-gradient(90deg, #ea580c, #f97316)',
                      borderRadius: 99,
                      transition: 'width 1s ease',
                    }}
                  />
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 11, color: '#4b5563', lineHeight: 1.5 }}>
                  of non-retired fleet is actively on trip
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Responsive override */}
      <style>{`
        @media (max-width: 900px) {
          .dashboard-bottom {
            grid-template-columns: 1fr !important;
          }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}
