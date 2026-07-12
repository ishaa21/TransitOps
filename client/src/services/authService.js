import api from '../api'

const USE_STUB = import.meta.env.VITE_USE_AUTH_STUB === 'true'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const stubLogin = async ({ email, password, role }) => {
  await delay(400)
  if (!email || !password) {
    const error = new Error('Invalid credentials. Account locked after 5 failed attempts.')
    error.response = { data: { message: error.message } }
    throw error
  }
  return {
    token: `stub-jwt-${role}-${Date.now()}`,
    user: { email, role },
  }
}

const stubRegister = async ({ email, password, role }) => {
  await delay(400)
  if (!email || !password || !role) {
    const error = new Error('Registration failed. Please check your details.')
    error.response = { data: { message: error.message } }
    throw error
  }
  return {
    token: `stub-jwt-${role}-${Date.now()}`,
    user: { email, role },
  }
}

const shouldFallbackToStub = (error) =>
  USE_STUB ||
  error.code === 'ERR_NETWORK' ||
  error.response?.status === 404 ||
  error.response?.status === 502

export const login = async ({ email, password, role }) => {
  try {
    const { data } = await api.post('/api/auth/login', { email, password, role })
    return data
  } catch (error) {
    if (shouldFallbackToStub(error)) {
      return stubLogin({ email, password, role })
    }
    throw error
  }
}

export const register = async ({ email, password, role }) => {
  try {
    const { data } = await api.post('/api/auth/register', { email, password, role })
    return data
  } catch (error) {
    if (shouldFallbackToStub(error)) {
      return stubRegister({ email, password, role })
    }
    throw error
  }
}
