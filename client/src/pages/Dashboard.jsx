function PageShell({ title, description, children }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
        {description && <p className="mt-1 text-sm text-gray-400">{description}</p>}
      </div>
      <div className="rounded-xl border border-transit-dark-border bg-transit-dark-elevated p-6">
        {children}
      </div>
    </div>
  )
}

export default function Dashboard() {
  return (
    <PageShell
      title="Dashboard"
      description="Overview of fleet operations, trips, and alerts."
    >
      <p className="text-gray-400">Dashboard widgets and KPIs will appear here.</p>
    </PageShell>
  )
}
