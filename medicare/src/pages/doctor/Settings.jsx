import { useState, useEffect } from 'react'
import { Save, Bell, CheckCircle2, Pencil, X } from 'lucide-react'
import { settingsApi } from '../../services/api'
import { useAsync } from '../../hooks'
import { Card, PageHeader, LoadingState, ErrorState } from '../../components/common/ui'

export default function Settings() {
  const { data: initial, loading, error, reload } = useAsync(settingsApi.getSettings)
  const [form, setForm] = useState(null)
  const [savedForm, setSavedForm] = useState(null)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (initial) {
      const snapshot = structuredClone(initial)
      setForm(snapshot)
      setSavedForm(snapshot)
    }
  }, [initial])

  const setNotif = (k, v) => setForm(f => ({ ...f, notifications: { ...f.notifications, [k]: v } }))
  const setPref = (k, v) => setForm(f => ({ ...f, preferences: { ...f.preferences, [k]: v } }))

  const save = async (e) => {
    e?.preventDefault()
    if (!editing) return
    setBusy(true)
    setSavedMsg(false)
    setSaveError('')
    try {
      const updated = await settingsApi.updateSettings(form)
      const snapshot = structuredClone(updated || form)
      setForm(snapshot)
      setSavedForm(snapshot)
      setSavedMsg(true)
      setEditing(false)
      setTimeout(() => setSavedMsg(false), 4000)
    } catch (saveRequestError) {
      setSaveError(saveRequestError.message || 'Unable to save practice settings.')
    } finally {
      setBusy(false)
    }
  }

  const cancelEdit = () => {
    if (!savedForm) return
    setForm(structuredClone(savedForm))
    setEditing(false)
    setSaveError('')
  }

  if (loading) return <LoadingState label="Loading practice settings…" />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!form) return null

  const notif = form.notifications || {}
  const pref = form.preferences || {}

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Manage clinical preferences and notification alerts."
        actions={
          editing ? <div className="row">
            <button type="button" className="btn" onClick={cancelEdit} disabled={busy}><X size={15} /> Cancel</button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>
              <Save size={16} /> {busy ? 'Saving changes…' : 'Save Changes'}
            </button>
          </div> : <button type="button" className="btn btn-primary" onClick={() => setEditing(true)}>
            <Pencil size={15} /> Edit Settings
          </button>
        }
      />

      {savedMsg && (
        <div className="alert ok" role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <CheckCircle2 size={16} color="var(--green)" />
          Settings saved.
        </div>
      )}
      {saveError && <div className="alert err" role="alert" style={{ marginBottom: 16 }}>{saveError}</div>}

      <form onSubmit={save} className="stack">
        <fieldset disabled={!editing || busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <Card title="Clinical & Prescription Rules">
          <div className="fs">
            <div className="grid-2">
              <label className="field">
                <span>Default Follow-up Period (Days)</span>
                <input type="number" min="1" max="365" value={pref.defaultFollowUpDays ?? 14}
                  onChange={e => setPref('defaultFollowUpDays', Number(e.target.value))} />
              </label>
            </div>
            <label className="field">
              <span>Default Prescription Footer Instructions</span>
              <textarea rows={2} value={pref.defaultRxNotes ?? ''}
                onChange={e => setPref('defaultRxNotes', e.target.value)} />
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.88rem' }}>
                <input type="checkbox" checked={Boolean(pref.autoStartRecording)}
                  onChange={e => setPref('autoStartRecording', e.target.checked)} />
                <span><strong>Auto-start audio recording</strong> immediately upon opening a scheduled consultation</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: '0.88rem' }}>
                <input type="checkbox" checked={Boolean(pref.strictAllergyChecks)}
                  onChange={e => setPref('strictAllergyChecks', e.target.checked)} />
                <span>
                  <strong>Block approval when a medicine name matches recorded allergy text</strong>
                  <small className="muted small" style={{ display: 'block', marginTop: 3 }}>
                    Text matching only; it does not assess active ingredients or cross-reactivity.
                  </small>
                </span>
              </label>
            </div>
          </div>
        </Card>
        {/* Notifications */}
        <Card title="Alerts & Notification Channels">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.88rem' }}>
              <input
                type="checkbox"
                checked={notif.patientMessagePush}
                onChange={e => setNotif('patientMessagePush', e.target.checked)}
              />
              <span>Receive notifications when patients send follow-up messages</span>
            </label>

          </div>
        </Card>

        </fieldset>
      </form>

    </>
  )
}
