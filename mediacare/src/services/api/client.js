const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
export const delay = (v, ms = 0) => ms ? new Promise(r => setTimeout(() => r(structuredClone(v)), ms)) : structuredClone(v)
let onUnauthorized = () => {}
export const setUnauthorizedHandler = f => { onUnauthorized = f }

export async function http(path, { method = 'GET', body, token, headers = {}, signal } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal
  })

  if (res.status === 401) { onUnauthorized(); throw new Error('Session expired. Please sign in again.') }
  if (res.status === 403) throw new Error('You do not have access to this resource')

  const text = await res.text()
  let data = null
  if (text) { try { data = JSON.parse(text) } catch { data = text } }
  if (!res.ok) {
    const message = data && typeof data === 'object'
      ? (data.message || data.error || data.detail)
      : data
    throw new Error(message || `Request failed (${res.status})`)
  }
  return data
}

export async function multipart(path, { fields = {}, file, token } = {}) {
  const form = new FormData()
  Object.entries(fields).forEach(([key, value]) => form.append(key, value))
  if (file) form.append('file', file)
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form
  })
  if (res.status === 401) { onUnauthorized(); throw new Error('Session expired. Please sign in again.') }
  if (res.status === 403) throw new Error('You do not have access to this resource')
  const text = await res.text(); let data = null
  if (text) { try { data = JSON.parse(text) } catch { data = text } }
  if (!res.ok) throw new Error(data?.message || data?.error || data || `Request failed (${res.status})`)
  return data
}
