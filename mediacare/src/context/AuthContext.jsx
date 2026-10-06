import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { authApi } from '../services/api'
import { setUnauthorizedHandler } from '../services/api/client'
import { saveSession, clearSession, loadSession, isExpired } from '../services/auth/session'

export const HOME = { ROLE_DOCTOR:'/doctor/dashboard', ROLE_PATIENT:'/patient/dashboard', ROLE_ADMIN:'/admin/dashboard' }
const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => { const s = loadSession(); return s && !isExpired(s.token) ? s : null })
  const [expired, setExpired] = useState(false)
  const logout = useCallback((wasExpired = false) => { clearSession(); setSession(null); setExpired(wasExpired === true) }, [])

  useEffect(() => { setUnauthorizedHandler(() => logout(true)) }, [logout])
  useEffect(() => {
    if (!session) return
    const t = setInterval(() => isExpired(session.token) && logout(true), 30000)
    return () => clearInterval(t)
  }, [session, logout])

  const login = async (email, password) => {
    const s = await authApi.login(email.trim(), password)
    if (!s?.token || !s?.user?.role) throw new Error('Invalid authentication response from server')
    saveSession(s); setSession(s); setExpired(false)
    return s.user
  }

  return <Ctx.Provider value={{ user: session?.user, login, logout, expired }}>{children}</Ctx.Provider>
}
