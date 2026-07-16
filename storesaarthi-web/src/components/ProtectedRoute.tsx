import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute() {
  const { shop, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="auth-boot">
        <div className="auth-boot__spinner" aria-hidden />
        <p>Checking session…</p>
      </div>
    )
  }

  if (!shop) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (!shop.isOnboarded && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}

export function GuestRoute() {
  const { shop, loading } = useAuth()

  if (loading) {
    return (
      <div className="auth-boot">
        <div className="auth-boot__spinner" aria-hidden />
        <p>Checking session…</p>
      </div>
    )
  }

  if (shop) {
    return <Navigate to={shop.isOnboarded ? '/' : '/onboarding'} replace />
  }

  return <Outlet />
}
