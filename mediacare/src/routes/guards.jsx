import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth, HOME } from '../context/AuthContext'
// UX guard only. The Spring Boot backend must enforce authorization on every endpoint.
export function RequireRole({ role }) {
  const { user, ready } = useAuth(); const loc = useLocation()
  if (!ready) return <div className="state" role="status">Checking session…</div>
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  if (user.role !== role) return <Navigate to="/forbidden" replace />
  return <Outlet />
}
export function HomeRedirect() {
  const { user, ready } = useAuth()
  if (!ready) return <div className="state" role="status">Checking session…</div>
  return <Navigate to={user ? HOME[user.role] : '/login'} replace />
}
