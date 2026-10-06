// NOTE: sessionStorage is a dev convenience. In production prefer an httpOnly, Secure, SameSite cookie set by Spring.
const K = 'mc_session'
export const saveSession = s => sessionStorage.setItem(K, JSON.stringify(s))
export const clearSession = () => sessionStorage.removeItem(K)
export const loadSession = () => { try { return JSON.parse(sessionStorage.getItem(K)) } catch { return null } }
export const getToken = () => loadSession()?.token
export const isExpired = token => { try { return JSON.parse(atob(token.split('.')[1])).exp * 1000 < Date.now() } catch { return true } }
