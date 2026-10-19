import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Stethoscope } from 'lucide-react'
import { useAuth, HOME } from '../../context/AuthContext'

export default function Login() {
  const { user, login, expired } = useAuth(); const nav = useNavigate()
  const [f, setF] = useState({ email:'', password:'' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  if (user) return <Navigate to={HOME[user.role]} replace />

  const submit = async e => {
    e.preventDefault(); setErr('')

    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) {
      return setErr('Enter a valid email address.')
    }

    if (!f.password) return setErr('Enter your password.')
    setBusy(true)
    try {
      const u = await login(f.email, f.password)
      const destination = HOME[u.role]
      if (!destination) throw new Error('Your account has no supported portal role.')
      nav(destination, { replace:true })
    } catch (x) { setErr(x.message || 'Invalid email or password') }
    finally { setBusy(false) }
  }

  return <div className="auth" data-theme="doctor"><form className="card auth-card" onSubmit={submit} noValidate>
    <div className="brand dark"><Stethoscope size={32} strokeWidth={2.2} /><div><strong>MediCare AI</strong><small>Smart Prescription Platform</small></div></div>
    <h1>Sign in</h1>
    {expired && <div className="alert">Your session expired. Sign in again to continue.</div>}
    {err && <div className="alert err" role="alert">{err}</div>}
    <label className="field">Email<input type="email" value={f.email} onChange={e => setF({ ...f, email:e.target.value })} autoComplete="username" required /></label>
    <label className="field">Password<input type="password" value={f.password} onChange={e => setF({ ...f, password:e.target.value })} autoComplete="current-password" required /></label>
    <button className="btn btn-primary block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    <p className="muted small">Sign in with the email address and password linked to your MediCare account. Your portal is selected automatically from your role.</p>
  </form></div>
}
