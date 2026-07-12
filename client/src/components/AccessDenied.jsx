export default function AccessDenied({ moduleName, requiredRole, userRole }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md rounded-2xl border border-transit-dark-border bg-transit-dark-elevated p-8 shadow-xl">
        <span className="mb-4 block text-5xl">🔒</span>
        <h2 className="mb-2 text-xl font-bold text-white">Access Restricted</h2>
        <p className="mb-6 text-sm leading-relaxed text-gray-400">
          {moduleName} is reserved for users with the{' '}
          <span className="font-semibold text-transit-orange">{requiredRole}</span> role.
        </p>
        <div className="inline-block rounded-lg border border-transit-dark-border bg-transit-dark/40 px-4 py-2 text-xs text-gray-500">
          Your current role:{' '}
          <span className="font-mono text-gray-300">{userRole || 'Guest'}</span>
        </div>
      </div>
    </div>
  )
}
