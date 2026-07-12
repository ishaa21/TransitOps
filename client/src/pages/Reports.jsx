import { useCallback, useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { fetchAnalytics } from '../services/reportsService'

/* ─── Design tokens ─────────────────────────────────────────────────────────── */
const ORANGE = '#ea580c'
const GREEN  = '#10b981'
const CYAN   = '#06b6d4'
const PURPLE = '#a855f7'

const KPI_CONFIG = [
  {
    key: 'fuelEfficiencyKmPerL',
    label: 'Fuel Efficiency',
    suffix: ' km/l',
    icon: '⛽',
    accent: GREEN,
    border: 'rgba(16,185,129,0.3)',
    glow: 'rgba(16,185,129,0.06)',
    textColor: '#10b981',
    description: 'Total distance ÷ total fuel consumed',
  },
  {
    key: 'fleetUtilizationPct',
    label: 'Fleet Utilisation',
    suffix: '%',
    icon: '🚛',
    accent: CYAN,
    border: 'rgba(6,182,212,0.3)',
    glow: 'rgba(6,182,212,0.06)',
    textColor: '#06b6d4',
    description: 'Vehicles on-trip ÷ active fleet',
    isBar: true,
  },
  {
    key: 'totalOperationalCost',
    label: 'Operational Cost',
    prefix: '₹',
    icon: '💰',
    accent: ORANGE,
    border: 'rgba(234,88,12,0.3)',
    glow: 'rgba(234,88,12,0.06)',
    textColor: '#ea580c',
    description: 'Fuel + Maintenance + Expenses',
    formatNumber: true,
  },
  {
    key: 'avgRoi',
    label: 'Vehicle ROI',
    suffix: '%',
    icon: '📈',
    accent: PURPLE,
    border: 'rgba(168,85,247,0.3)',
    glow: 'rgba(168,85,247,0.06)',
    textColor: '#a855f7',
    description: '(Revenue − Costs) ÷ Acquisition Cost',
  },
]

/* ─── Helpers ───────────────────────────────────────────────────────────────── */
function formatINR(n) {
  if (n === null || n === undefined) return '—'
  const abs = Math.abs(n)
  let str
  if (abs >= 1_000_000) str = (n / 1_000_000).toFixed(1) + 'M'
  else if (abs >= 1_000) str = (n / 1_000).toFixed(1) + 'K'
  else str = n.toFixed(0)
  return str
}

function fmtNum(value, prefix = '', suffix = '', formatNumber = false) {
  if (value === null || value === undefined) return '—'
  const display = formatNumber ? formatINR(value) : value
  return `${prefix}${display}${suffix}`
}

/* ─── CSV Export ────────────────────────────────────────────────────────────── */
function exportCSV(data) {
  if (!data) return

  const rows = []

  // KPI Summary
  rows.push(['=== KPI SUMMARY ==='])
  rows.push(['Metric', 'Value'])
  rows.push(['Fuel Efficiency (km/l)', data.fuelEfficiencyKmPerL])
  rows.push(['Fleet Utilisation (%)', data.fleetUtilizationPct])
  rows.push(['Total Operational Cost (₹)', data.totalOperationalCost])
  rows.push(['Avg Vehicle ROI (%)', data.avgRoi])
  rows.push([])

  // Monthly Revenue
  rows.push(['=== MONTHLY REVENUE ==='])
  rows.push(['Month', 'Revenue (₹)'])
  ;(data.monthlyRevenue || []).forEach((m) => rows.push([m.label, m.revenue]))
  rows.push([])

  // Per-vehicle ROI
  rows.push(['=== VEHICLE ROI ==='])
  rows.push([
    'Vehicle', 'Reg No', 'Revenue (₹)', 'Fuel Cost (₹)',
    'Maintenance (₹)', 'Expenses (₹)', 'Total Cost (₹)',
    'Acquisition Cost (₹)', 'ROI (%)',
  ])
  ;(data.vehicleRoi || []).forEach((v) =>
    rows.push([
      v.vehicleName, v.vehicleRegNo, v.revenue, v.totalFuelCost,
      v.totalMaintenanceCost, v.totalExpenses, v.totalOperationalCost,
      v.acquisitionCost, v.roi,
    ])
  )
  rows.push([])
  rows.push([data.meta?.revenueAssumption || ''])

  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `transitops-analytics-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/* ─── Shimmer skeleton ──────────────────────────────────────────────────────── */
function Shimmer({ w = '100%', h = 20, radius = 6 }) {
  return (
    <div
      style={{
        width: w, height: h, borderRadius: radius,
        background: 'linear-gradient(90deg,#2a2f3d 25%,#333849 50%,#2a2f3d 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
      }}
    />
  )
}

/* ─── KPI Card ──────────────────────────────────────────────────────────────── */
function KpiCard({ cfg, value, loading }) {
  const display = fmtNum(value, cfg.prefix || '', cfg.suffix || '', cfg.formatNumber)
  const pct = cfg.isBar && typeof value === 'number' ? Math.min(value, 100) : 0

  return (
    <div
      id={`kpi-${cfg.key}`}
      style={{
        borderRadius: 14,
        border: `1px solid ${cfg.border}`,
        background: 'linear-gradient(135deg,#1a1d27,#141720)',
        padding: '20px 22px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = `0 8px 32px ${cfg.accent}22`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Glow blob */}
      <div style={{
        position: 'absolute', top: 0, right: 0, width: 100, height: 100,
        borderRadius: '50%', background: cfg.accent, opacity: 0.06,
        filter: 'blur(30px)', transform: 'translate(30px,-30px)', pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280' }}>
          {cfg.label}
        </p>
        <span style={{ fontSize: 16, opacity: 0.75 }}>{cfg.icon}</span>
      </div>

      {/* Value */}
      {loading ? (
        <Shimmer w="60%" h={36} radius={6} />
      ) : (
        <p style={{ margin: 0, fontSize: 34, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em', color: cfg.textColor }}>
          {display}
        </p>
      )}

      {/* Utilisation bar */}
      {cfg.isBar && !loading && (
        <div style={{ marginTop: 12, height: 4, borderRadius: 99, background: '#2a2f3d', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${pct}%`, borderRadius: 99,
            background: `linear-gradient(90deg,${cfg.accent},${cfg.accent}bb)`,
            transition: 'width 0.9s ease',
          }} />
        </div>
      )}

      {/* Description */}
      <p style={{ margin: '10px 0 0', fontSize: 10, color: '#4b5563', letterSpacing: '0.02em' }}>
        {cfg.description}
      </p>
    </div>
  )
}

/* ─── Custom Bar Tooltip ─────────────────────────────────────────────────────── */
function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1a1d27', border: '1px solid #2a2f3d', borderRadius: 10,
      padding: '10px 14px', fontSize: 13, color: '#fff',
    }}>
      <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#9ca3af', fontSize: 11 }}>{label}</p>
      <p style={{ margin: 0, fontWeight: 700, color: ORANGE }}>
        ₹{Number(payload[0].value).toLocaleString('en-IN')}
      </p>
    </div>
  )
}

/* ─── Top Costliest Vehicles list ───────────────────────────────────────────── */
const COST_COLORS = [ORANGE, '#f59e0b', CYAN, PURPLE, GREEN]

function CostBar({ vehicle, maxCost, rank, loading }) {
  const pct = maxCost > 0 ? (vehicle.totalOperationalCost / maxCost) * 100 : 0
  const color = COST_COLORS[rank] ?? '#6b7280'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{
        minWidth: 90, fontSize: 12, fontWeight: 600, color: '#d1d5db',
        textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
      }} title={`${vehicle.vehicleName} (${vehicle.vehicleRegNo})`}>
        {vehicle.vehicleName}
      </span>
      <div style={{ flex: 1, height: 12, borderRadius: 99, background: '#1f2332', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 99,
          background: color, transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
      <span style={{ minWidth: 70, fontSize: 11, fontWeight: 700, color, textAlign: 'right' }}>
        ₹{Number(vehicle.totalOperationalCost).toLocaleString('en-IN')}
      </span>
    </div>
  )
}

/* ─── ROI table ─────────────────────────────────────────────────────────────── */
function RoiRow({ v, idx }) {
  const roiPositive = v.roi >= 0
  return (
    <tr
      style={{ borderBottom: '1px solid #1f2332', transition: 'background 0.15s' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <td style={{ padding: '11px 16px', color: '#9ca3af', fontSize: 12 }}>{idx + 1}</td>
      <td style={{ padding: '11px 16px' }}>
        <div style={{ fontWeight: 600, color: '#fff', fontSize: 13 }}>{v.vehicleName}</div>
        <div style={{ fontSize: 10, color: '#6b7280' }}>{v.vehicleRegNo}</div>
      </td>
      <td style={{ padding: '11px 16px', fontSize: 12, color: '#10b981', textAlign: 'right' }}>
        ₹{Number(v.revenue).toLocaleString('en-IN')}
      </td>
      <td style={{ padding: '11px 16px', fontSize: 12, color: '#ea580c', textAlign: 'right' }}>
        ₹{Number(v.totalOperationalCost).toLocaleString('en-IN')}
      </td>
      <td style={{ padding: '11px 16px', textAlign: 'right' }}>
        <span style={{
          padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700,
          background: roiPositive ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
          color: roiPositive ? '#10b981' : '#f87171',
        }}>
          {roiPositive ? '+' : ''}{v.roi}%
        </span>
      </td>
    </tr>
  )
}

/* ─── Main Component ────────────────────────────────────────────────────────── */
export default function Reports() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await fetchAnalytics()
      setData(result)
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const maxCost = data?.topCostliestVehicles?.length
    ? data.topCostliestVehicles[0].totalOperationalCost
    : 1

  // Highlight the highest-revenue month bar
  const maxRevenue = data?.monthlyRevenue?.length
    ? Math.max(...data.monthlyRevenue.map((m) => m.revenue))
    : 1

  return (
    <>
      {/* Keyframe for shimmer */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .analytics-table th { font-size:10px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#4b5563; padding:10px 16px; text-align:left; border-bottom:1px solid #2a2f3d; }
        .analytics-table td:last-child { text-align:right; }
        .analytics-table th:last-child { text-align:right; }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: ORANGE }}>
              TransitOps
            </p>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
              Reports &amp; Analytics
            </h2>
            <p style={{ marginTop: 4, fontSize: 12, color: '#6b7280' }}>
              ROI = (Revenue − (Maintenance + Fuel)) ÷ Acquisition Cost
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {/* Refresh */}
            <button
              id="btn-refresh-analytics"
              onClick={load}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: '1px solid #2a2f3d', background: loading ? '#2a2f3d' : '#1a1d27',
                color: loading ? '#6b7280' : '#fff', cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ display: 'inline-block', animation: loading ? 'spin 1s linear infinite' : 'none' }}>↻</span>
              Refresh
            </button>

            {/* CSV Export */}
            <button
              id="btn-export-csv"
              onClick={() => exportCSV(data)}
              disabled={!data || loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: `1px solid ${ORANGE}44`,
                background: (!data || loading) ? '#1a1d27' : `${ORANGE}11`,
                color: (!data || loading) ? '#6b7280' : ORANGE,
                cursor: (!data || loading) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { if (data && !loading) e.currentTarget.style.background = `${ORANGE}22` }}
              onMouseLeave={(e) => { if (data && !loading) e.currentTarget.style.background = `${ORANGE}11` }}
            >
              ↓ Export CSV
            </button>
          </div>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div style={{
            padding: '12px 16px', borderRadius: 10, fontSize: 13,
            border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#fca5a5',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── 4 KPI Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 14 }}>
          {KPI_CONFIG.map((cfg) => (
            <KpiCard key={cfg.key} cfg={cfg} value={data?.[cfg.key]} loading={loading} />
          ))}
        </div>

        {/* ── Assumption notice ── */}
        {data?.meta?.revenueAssumption && (
          <div style={{
            padding: '10px 16px', borderRadius: 8, fontSize: 11,
            border: '1px solid rgba(234,88,12,0.2)', background: 'rgba(234,88,12,0.06)', color: '#9ca3af',
            display: 'flex', gap: 8, alignItems: 'flex-start',
          }}>
            <span style={{ color: ORANGE, fontWeight: 700, flexShrink: 0 }}>ℹ</span>
            <span>{data.meta.revenueAssumption}</span>
          </div>
        )}

        {/* ── Charts row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }} className="analytics-charts">
          {/* Monthly Revenue Bar Chart */}
          <div style={{
            borderRadius: 14, border: '1px solid #2a2f3d', background: '#1a1d27',
            padding: '22px 24px', overflow: 'hidden',
          }}>
            <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>Monthly Revenue</h3>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: '#6b7280' }}>Last 12 months — completed trip earnings</p>
              </div>
              {!loading && data && (
                <span style={{
                  fontSize: 11, fontWeight: 700, color: '#10b981',
                  background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                  borderRadius: 6, padding: '3px 10px',
                }}>
                  ₹{Number(data.monthlyRevenue?.reduce((s, m) => s + m.revenue, 0) || 0).toLocaleString('en-IN')} total
                </span>
              )}
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Shimmer h={160} radius={8} />
                <Shimmer h={14} w="80%" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data?.monthlyRevenue || []} barCategoryGap="30%" margin={{ top: 0, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2332" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${formatINR(v)}`}
                    width={52}
                  />
                  <Tooltip content={<RevenueTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 4 }} />
                  <Bar dataKey="revenue" radius={[5, 5, 0, 0]}>
                    {(data?.monthlyRevenue || []).map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={entry.revenue === maxRevenue ? ORANGE : '#3b82f6'}
                        fillOpacity={entry.revenue === maxRevenue ? 1 : 0.75}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top Costliest Vehicles */}
          <div style={{
            borderRadius: 14, border: '1px solid #2a2f3d', background: '#1a1d27',
            padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>Top Costliest Vehicles</h3>
              <p style={{ margin: '3px 0 0', fontSize: 11, color: '#6b7280' }}>By total operational cost</p>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Shimmer w={80} h={12} />
                    <Shimmer h={12} />
                    <Shimmer w={60} h={12} />
                  </div>
                ))}
              </div>
            ) : data?.topCostliestVehicles?.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {data.topCostliestVehicles.map((v, i) => (
                  <CostBar key={v.vehicleId} vehicle={v} maxCost={maxCost} rank={i} />
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', marginTop: 20 }}>
                No vehicle cost data available
              </p>
            )}
          </div>
        </div>

        {/* ── Per-vehicle ROI Table ── */}
        <div style={{
          borderRadius: 14, border: '1px solid #2a2f3d', background: '#1a1d27',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '18px 24px', borderBottom: '1px solid #2a2f3d',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>Vehicle ROI Breakdown</h3>
              <p style={{ margin: '3px 0 0', fontSize: 11, color: '#6b7280' }}>
                Per-vehicle revenue, costs, and return on investment
              </p>
            </div>
            {!loading && data?.vehicleRoi?.length > 0 && (
              <span style={{
                fontSize: 11, fontWeight: 600, background: '#0f1117',
                border: '1px solid #2a2f3d', borderRadius: 6, padding: '3px 8px', color: '#6b7280',
              }}>
                {data.vehicleRoi.length} vehicles
              </span>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            {loading ? (
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1, 2, 3].map((i) => <Shimmer key={i} h={20} radius={6} />)}
              </div>
            ) : data?.vehicleRoi?.length ? (
              <table className="analytics-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Vehicle</th>
                    <th style={{ textAlign: 'right' }}>Revenue</th>
                    <th style={{ textAlign: 'right' }}>Total Cost</th>
                    <th style={{ textAlign: 'right' }}>ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {data.vehicleRoi
                    .slice()
                    .sort((a, b) => b.roi - a.roi)
                    .map((v, idx) => <RoiRow key={v.vehicleId} v={v} idx={idx} />)}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '40px 24px', textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
                No vehicle data available
              </div>
            )}
          </div>
        </div>

      </div>
    </>
  )
}
