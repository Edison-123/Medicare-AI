import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { authApi } from '../services/api'
import { setUnauthorizedHandler } from '../services/api/client'
import { saveSession, clearSession, loadSession } from '../services/auth/session'

export const HOME = { ROLE_DOCTOR:'/doctor/dashboard', ROLE_PATIENT:'/patient/dashboard', ROLE_ADMIN:'/admin/dashboard' }
const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => loadSession())
  const [expired, setExpired] = useState(false)
  const [ready, setReady] = useState(false)
  const authGeneration = useRef(0)
  const logout = useCallback(async (wasExpired = false) => {
    authGeneration.current += 1
    if (!wasExpired) {
      try { await authApi.logout() } catch { /* Clear the local session even if the server is unavailable. */ }
    }
    clearSession()
    setSession(null)
    setExpired(wasExpired === true)
    setReady(true)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => { void logout(true) })
    const generation = authGeneration.current
    authApi.me().then(user => {
      if (authGeneration.current !== generation) return
      const nextSession = { user }
      saveSession(nextSession)
      setSession(nextSession)
    }).catch(() => {
      if (authGeneration.current !== generation) return
      clearSession()
      setSession(null)
    }).finally(() => {
      if (authGeneration.current === generation) setReady(true)
    })
  }, [logout])

  const login = async (email, password) => {
    authGeneration.current += 1
    setReady(true)
    const user = await authApi.login(email.trim(), password)
    if (!user?.role) throw new Error('Invalid authentication response from server')
    const nextSession = { user }
    saveSession(nextSession)
    setSession(nextSession)
    setExpired(false)
    return user
  }

  return <Ctx.Provider value={{ user: session?.user, login, logout, expired, ready }}>{children}</Ctx.Provider>
}
