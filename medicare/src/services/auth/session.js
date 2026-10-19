const K = 'mc_session'
export const saveSession = session => {
	const user = session?.user ?? session
	if (user) sessionStorage.setItem(K, JSON.stringify({ user }))
}
export const clearSession = () => sessionStorage.removeItem(K)
export const loadSession = () => {
	try {
		const session = JSON.parse(sessionStorage.getItem(K))
		if (session?.token) sessionStorage.removeItem(K)
		return session?.user ? { user: session.user } : null
	} catch {
		clearSession()
		return null
	}
}
export const getToken = () => undefined
