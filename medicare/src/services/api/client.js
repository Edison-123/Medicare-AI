export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
let onUnauthorized = () => {}
export const setUnauthorizedHandler = f => { onUnauthorized = f }

function csrfToken() {
  if (typeof document === 'undefined') return null
  const cookie = document.cookie.split('; ').find(value => value.startsWith('XSRF-TOKEN='))
  return cookie ? decodeURIComponent(cookie.slice('XSRF-TOKEN='.length)) : null
}

function csrfHeader(method) {
  if (['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method.toUpperCase())) return {}
  const token = csrfToken()
  return token ? { 'X-XSRF-TOKEN': token } : {}
}

export async function http(path, { method = 'GET', body, headers = {}, signal } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...csrfHeader(method),
      ...headers
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal
  })

  if (res.status === 401 && path !== '/auth/login' && path !== '/auth/me') { onUnauthorized(); throw new Error('Session expired. Please sign in again.') }
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

export async function multipart(path, { fields = {}, file } = {}) {
  const form = new FormData()
  Object.entries(fields).forEach(([key, value]) => form.append(key, value))
  if (file) form.append('file', file)
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: csrfHeader('POST'),
    body: form
  })
  if (res.status === 401 && path !== '/auth/me') { onUnauthorized(); throw new Error('Session expired. Please sign in again.') }
  if (res.status === 403) throw new Error('You do not have access to this resource')
  const text = await res.text(); let data = null
  if (text) { try { data = JSON.parse(text) } catch { data = text } }
  if (!res.ok) throw new Error(data?.message || data?.error || data || `Request failed (${res.status})`)
  return data
}
