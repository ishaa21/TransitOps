import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { hasRole } from '../constants/roles'
import AccessDenied from '../components/AccessDenied'
import { fetchAnalyticsData } from '../services/reportsService'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

export default function Reports() {
  const { user } = useAuth()
  const isAuthorized = hasRole(user, 'financial_analyst', 'FinancialAnalyst')

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  const loadReportData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await fetchAnalyticsData()
      setData(result)
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message ?? 'Failed to load report data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthorized) {
      loadReportData()
    }
  }, [isAuthorized, loadReportData])

  // CSV Export handler
  const handleExportCSV = () => {
    if (!data || !data.vehicleAnalytics || data.vehicleAnalytics.length === 0) return

    setIsExporting(true)
    try {
      const headers = [
        'Vehicle Name',
        'Registration No',
        'Acquisition Cost (₹)',
        'Status',
        'Completed Distance (km)',
        'Fuel Consumed (Liters)',
        'Fuel Efficiency (km/l)',
        'Maintenance Cost (₹)',
        'Fuel Cost (₹)',
        'Other Expenses (₹)',
        'Total Operational Cost (₹)',
        'Total Revenue (₹)',
        'ROI (%)',
      ]

      const rows = data.vehicleAnalytics.map((v) => [
        `"${v.vehicleName.replace(/"/g, '""')}"`,
        `"${v.regNo.replace(/"/g, '""')}"`,
        v.acquisitionCost,
        `"${v.status}"`,
        v.completedDistance,
        v.fuelLiters,
        v.fuelEfficiency,
        v.maintenanceCost,
        v.fuelCost,
        v.otherExpenses,
        v.operationalCost,
        v.revenue,
        v.roi,
      ])

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

      const encodedUri = encodeURI(csvContent)
      const link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute(
        'download',
        `TransitOps_Analytics_Report_${new Date().toISOString().slice(0, 10)}.csv`
      )
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('CSV Export failed:', err)
    } finally {
      setIsExporting(false)
    }
  }

  if (!isAuthorized) {
    return (
      <AccessDenied
        moduleName="The Reports & Analytics dashboard"
        requiredRole="Financial Analyst"
        userRole={user?.role}
      />
    )
  }

  // Bar colors for Top Costliest Vehicles list matching mockup
  const costliestBarColors = ['#f87171', '#d97706', '#60a5fa', '#a78bfa', '#f472b6']

  const kpis = data?.kpis || { fuelEfficiency: 0, fleetUtilization: 0, operationalCost: 0, vehicleRoi: 0 }
  const monthlyRevenue = data?.monthlyRevenue || []
  const topCostliestVehicles = data?.topCostliestVehicles || []

  // Max cost to normalize progress bars
  const maxOperationalCost = topCostliestVehicles.length > 0 
    ? Math.max(...topCostliestVehicles.map(v => v.operationalCost)) 
    : 1

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .shimmer-loading {
          background: linear-gradient(90deg, #2a2f3d 25%, #333849 50%, #2a2f3d 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
      `}</style>

      <div className="space-y-6">
        {/* Header section */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Reports & Analytics</h2>
            <p className="mt-1 text-sm text-gray-400">Reports, trends, and operational insights.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadReportData}
              disabled={loading}
              className="rounded-lg border border-transit-dark-border bg-transit-dark-elevated px-3 py-2 text-xs font-semibold text-gray-300 hover:text-white hover:border-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ↻ Refresh
            </button>
            <button
              onClick={handleExportCSV}
              disabled={loading || isExporting || !data}
              className="rounded-lg bg-transit-orange hover:bg-transit-orange-hover px-4 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              📥 {isExporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            ⚠️ {error}
          </div>
        )}

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Fuel Efficiency */}
          <div 
            className="rounded-xl border border-transit-dark-border bg-transit-dark-elevated p-5 relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/5"
            style={{ borderTop: '4px solid #3b82f6' }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Fuel Efficiency</p>
            {loading ? (
              <div className="mt-3 h-9 w-2/3 rounded shimmer-loading" />
            ) : (
              <p className="mt-2 text-2xl font-extrabold text-white tracking-tight">
                {kpis.fuelEfficiency} <span className="text-sm font-medium text-gray-400">km/l</span>
              </p>
            )}
          </div>

          {/* Card 2: Fleet Utilization */}
          <div 
            className="rounded-xl border border-transit-dark-border bg-transit-dark-elevated p-5 relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/5"
            style={{ borderTop: '4px solid #10b981' }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Fleet Utilization</p>
            {loading ? (
              <div className="mt-3 h-9 w-2/3 rounded shimmer-loading" />
            ) : (
              <p className="mt-2 text-2xl font-extrabold text-white tracking-tight">
                {kpis.fleetUtilization}%
              </p>
            )}
          </div>

          {/* Card 3: Operational Cost */}
          <div 
            className="rounded-xl border border-transit-dark-border bg-transit-dark-elevated p-5 relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-500/5"
            style={{ borderTop: '4px solid #ea580c' }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Operational Cost</p>
            {loading ? (
              <div className="mt-3 h-9 w-2/3 rounded shimmer-loading" />
            ) : (
              <p className="mt-2 text-2xl font-extrabold text-white tracking-tight">
                {kpis.operationalCost.toLocaleString('en-IN')}
              </p>
            )}
          </div>

          {/* Card 4: Vehicle ROI */}
          <div 
            className="rounded-xl border border-transit-dark-border bg-transit-dark-elevated p-5 relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-500/5"
            style={{ borderTop: '4px solid #22c55e' }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Vehicle ROI</p>
            {loading ? (
              <div className="mt-3 h-9 w-2/3 rounded shimmer-loading" />
            ) : (
              <p className="mt-2 text-2xl font-extrabold text-white tracking-tight">
                {kpis.vehicleRoi}%
              </p>
            )}
          </div>
        </div>

        {/* Formula Subtext */}
        <p className="text-xs text-gray-500 italic mt-1 pl-1">
          ROI = (Revenue - (Maintenance + Fuel)) / Acquisition Cost
        </p>

        {/* Charts and Lists Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Monthly Revenue Chart */}
          <div className="rounded-xl border border-transit-dark-border bg-transit-dark-elevated p-6 lg:col-span-7 flex flex-col shadow-md">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-5">Monthly Revenue</h3>
            
            {loading ? (
              <div className="h-[300px] w-full rounded shimmer-loading" />
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyRevenue} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3d" vertical={false} />
                    <XAxis 
                      dataKey="month" 
                      stroke="#9ca3af" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={{ stroke: '#2a2f3d' }} 
                    />
                    <YAxis 
                      stroke="#9ca3af" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={{ stroke: '#2a2f3d' }}
                      tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                      contentStyle={{ 
                        backgroundColor: '#1a1d27', 
                        borderColor: '#2a2f3d', 
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '12px'
                      }}
                      formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                    />
                    <Bar 
                      dataKey="revenue" 
                      fill="#3b82f6" 
                      radius={[4, 4, 0, 0]} 
                      maxBarSize={45}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Top Costliest Vehicles List */}
          <div className="rounded-xl border border-transit-dark-border bg-transit-dark-elevated p-6 lg:col-span-5 flex flex-col shadow-md">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-5">Top Costliest Vehicles</h3>

            {loading ? (
              <div className="space-y-4 flex-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-1/3 rounded shimmer-loading" />
                    <div className="h-4 w-full rounded shimmer-loading" />
                  </div>
                ))}
              </div>
            ) : topCostliestVehicles.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-center p-6 text-gray-500 border border-dashed border-transit-dark-border rounded-xl">
                No vehicle operational costs recorded.
              </div>
            ) : (
              <div className="space-y-5 flex-1 flex flex-col justify-center">
                {topCostliestVehicles.slice(0, 5).map((vehicle, idx) => {
                  const pct = Math.max(8, Math.min(100, (vehicle.operationalCost / maxOperationalCost) * 100))
                  const barColor = costliestBarColors[idx % costliestBarColors.length]
                  return (
                    <div key={vehicle.vehicleId} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-300">{vehicle.vehicleName}</span>
                        <span className="font-bold text-white">₹{vehicle.operationalCost.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="h-3 rounded-full bg-transit-dark overflow-hidden p-[1px] border border-transit-dark-border">
                        <div 
                          className="h-full rounded-full transition-all duration-700 ease-out" 
                          style={{ 
                            width: `${pct}%`, 
                            backgroundColor: barColor,
                            boxShadow: `0 0 8px ${barColor}55`
                          }} 
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
