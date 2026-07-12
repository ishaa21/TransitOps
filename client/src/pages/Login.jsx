import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ROLES, ROLE_ACCESS, getHomeRouteForRole } from '../constants/roles'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, login, register, loading, user } = useAuth()

  const [email, setEmail] = useState('raven.k@transitops.in')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('dispatcher')
  const [rememberMe, setRememberMe] = useState(true)
  const [isRegister, setIsRegister] = useState(false)
  const [error, setError] = useState('')

  const from = location.state?.from?.pathname

  if (isAuthenticated) {
    return <Navigate to={from ?? getHomeRouteForRole(user?.role)} replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    try {
      let loggedInUser
      if (isRegister) {
        const data = await register({ email, password, role })
        loggedInUser = data.user
      } else {
        const data = await login({ email, password, role })
        loggedInUser = data.user
      }
      navigate(from ?? getHomeRouteForRole(loggedInUser.role), { replace: true })
    } catch (err) {
      const message =
        err.response?.data?.message ??
        err.message ??
        (isRegister ? 'Registration failed. Please check your details.' : 'Invalid credentials. Account locked after 5 failed attempts.')
      setError(message)
    }
  }

  return (
    <div className="flex min-h-svh">
      {/* Left panel */}
      <section className="hidden w-[40%] flex-col justify-between bg-transit-panel px-10 py-8 text-gray-800 lg:flex">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-transit-orange text-sm font-bold text-white">
              T
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">TransitOps</p>
              <p className="text-sm text-gray-600">Smart Transport Operations Platform</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-2xl font-semibold text-gray-900">One login, four roles:</h2>
          <ul className="space-y-3">
            {ROLES.map((item) => (
              <li key={item.value} className="flex items-center gap-3 text-gray-700">
                <span className="h-2 w-2 rounded-full bg-transit-orange" />
                {item.label}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs uppercase tracking-wider text-gray-500">
          TransitOps © 2026 · RBAC Enabled
        </p>
      </section>

      {/* Right panel */}
      <section className="flex flex-1 items-center justify-center bg-transit-dark px-6 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-white">
              {isRegister ? 'Create an account' : 'Sign in to your account'}
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              {isRegister ? 'Fill in details to register new user' : 'Enter your credentials to continue'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-400">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-transit-dark-border bg-transit-dark-elevated px-4 py-3 text-white outline-none transition-colors focus:border-transit-orange"
                placeholder="raven.k@transitops.in"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-400">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-transit-dark-border bg-transit-dark-elevated px-4 py-3 text-white outline-none transition-colors focus:border-transit-orange"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label htmlFor="role" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-400">
                Role (RBAC)
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-transit-dark-border bg-transit-dark-elevated px-4 py-3 text-white outline-none transition-colors focus:border-transit-orange"
              >
                {ROLES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            {!isRegister && (
              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-400">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-transit-dark-border accent-transit-orange"
                  />
                  Remember me
                </label>
                <button type="button" className="text-sm text-blue-400 hover:text-blue-300">
                  Forgot password?
                </button>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                ✕ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-transit-orange py-3 text-sm font-semibold text-white transition-colors hover:bg-transit-orange-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (isRegister ? 'Registering…' : 'Signing in…') : (isRegister ? 'Register' : 'Sign In')}
            </button>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister)
                  setError('')
                }}
                className="text-sm text-transit-orange hover:underline focus:outline-none"
              >
                {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}
              </button>
            </div>
          </form>

          <div className="mt-8 rounded-lg border border-transit-dark-border bg-transit-dark-elevated p-4 text-sm text-gray-400">
            <p className="mb-2 font-medium text-gray-300">Access is scoped by role after login:</p>
            <ul className="space-y-1">
              {Object.entries(ROLE_ACCESS).map(([roleKey, areas]) => {
                const label = ROLES.find((r) => r.value === roleKey)?.label ?? roleKey
                return (
                  <li key={roleKey}>
                    <span className="text-gray-300">{label}</span>
                    {' → '}
                    {areas.join(', ')}
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
