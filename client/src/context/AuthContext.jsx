import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { login as loginRequest } from '../services/authService'

const AuthContext = createContext(null)

const TOKEN_KEY = 'transitops_jwt'
const USER_KEY = 'transitops_user'

const readStoredAuth = () => {
  const token = localStorage.getItem(TOKEN_KEY)
  const rawUser = localStorage.getItem(USER_KEY)
  if (!token) return { token: null, user: null }
  try {
    return { token, user: rawUser ? JSON.parse(rawUser) : null }
  } catch {
    return { token, user: null }
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStoredAuth)
  const [loading, setLoading] = useState(false)

  const persistAuth = useCallback(({ token, user }) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    setAuth({ token, user })
  }, [])

  const login = useCallback(async (credentials) => {
    setLoading(true)
    try {
      const data = await loginRequest(credentials)
      persistAuth({ token: data.token, user: data.user })
      return data
    } finally {
      setLoading(false)
    }
  }, [persistAuth])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setAuth({ token: null, user: null })
  }, [])

  const value = useMemo(
    () => ({
      token: auth.token,
      user: auth.user,
      isAuthenticated: Boolean(auth.token),
      loading,
      login,
      logout,
    }),
    [auth, loading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
