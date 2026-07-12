import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getHomeRouteForRole } from '../constants/roles'

export default function RoleHomeRedirect() {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to={getHomeRouteForRole(user?.role)} replace />
}
