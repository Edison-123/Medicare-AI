import { useState } from 'react'
import { CheckCircle2, KeyRound } from 'lucide-react'
import { authApi } from '../../services/api'
import { Card } from './ui'

export default function AccountSecurityPanel() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const strong = form.newPassword.length >= 12
    && /[a-z]/.test(form.newPassword)
    && /[A-Z]/.test(form.newPassword)
    && /\d/.test(form.newPassword)
    && /[^A-Za-z0-9\s]/.test(form.newPassword)
  const matches = form.newPassword === form.confirmPassword
  const unchanged = Boolean(form.currentPassword) && form.currentPassword === form.newPassword

  const updateField = (field, value) => setForm(current => ({ ...current, [field]: value }))

  const handleSubmit = async event => {
    event.preventDefault()
    setMessage('')
    setError('')
    if (unchanged) {
      setError('The new password must be different from your current password.')
      return
    }
    if (!strong) {
      setError('Use 12 or more characters with uppercase and lowercase letters, a number, and a symbol.')
      return
    }
    if (!matches) {
      setError('The new password and confirmation do not match.')
      return
    }

    setSaving(true)
    try {
      await authApi.changePassword(form.currentPassword, form.newPassword)
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setMessage('Password changed. Other active sessions have been signed out.')
    } catch (requestError) {
      setError(requestError.message || 'Could not change your password.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card title="Account Security">
      <form onSubmit={handleSubmit} className="stack" style={{ maxWidth: 600 }}>
        <p className="muted small" style={{ margin: 0 }}>
          Enter your existing password to authorize the change. It will not be changed unless it is verified.
        </p>
        {message && <div className="alert ok" role="status"><CheckCircle2 size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />{message}</div>}
        {error && <div className="alert err" role="alert">{error}</div>}
        <label className="field">Verify current password
          <input type="password" name="current-password-verification" autoComplete="off" value={form.currentPassword} onChange={event => updateField('currentPassword', event.target.value)} required />
        </label>
        <div className="grid-2">
          <label className="field">New password
            <input type="password" autoComplete="new-password" minLength={12} maxLength={128} value={form.newPassword} onChange={event => updateField('newPassword', event.target.value)} required />
          </label>
          <label className="field">Confirm new password
            <input type="password" autoComplete="new-password" minLength={12} maxLength={128} value={form.confirmPassword} onChange={event => updateField('confirmPassword', event.target.value)} required />
          </label>
        </div>
        <p className="muted small" style={{ margin: '-8px 0 0' }}>
          Use at least 12 characters, including uppercase and lowercase letters, a number, and a symbol.
        </p>
        {form.confirmPassword && !matches && <div className="alert err" role="status">The new passwords do not match.</div>}
        {unchanged && <div className="alert err" role="status">The new password must differ from the current password.</div>}
        <div>
          <button type="submit" className="btn btn-primary" disabled={saving || !form.currentPassword || !strong || !matches || unchanged}>
            <KeyRound size={15} /> {saving ? 'Updating password…' : 'Update Password'}
          </button>
        </div>
      </form>
    </Card>
  )
}