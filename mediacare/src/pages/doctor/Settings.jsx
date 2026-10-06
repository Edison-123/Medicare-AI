import { useState, useEffect } from 'react'
import { Save, User, Stethoscope, Sparkles, Bell, CheckCircle2, Building, ShieldCheck } from 'lucide-react'
import { settingsApi } from '../../services/api'
import { useAsync } from '../../hooks'
import { Card, PageHeader, LoadingState, ErrorState } from '../../components/common/ui'

export default function Settings() {
  const { data: initial, loading, error, reload } = useAsync(settingsApi.getSettings)
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)

  useEffect(() => {
    if (initial) {
      setForm(structuredClone(initial))
    }
  }, [initial])

  const setProfile = (k, v) => setForm(f => ({ ...f, profile: { ...f.profile, [k]: v } }))
  const setPref = (k, v) => setForm(f => ({ ...f, preferences: { ...f.preferences, [k]: v } }))
  const setNotif = (k, v) => setForm(f => ({ ...f, notifications: { ...f.notifications, [k]: v } }))

  const save = async (e) => {
    e?.preventDefault()
    setBusy(true)
    setSavedMsg(false)
    try {
      await settingsApi.updateSettings(form)
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 4000)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <LoadingState label="Loading practice settings…" />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!form) return null

  const p = form.profile
  const pref = form.preferences
  const notif = form.notifications

  return (
    <>
      <PageHeader
        title="Settings & Practice Profile"
        subtitle="Manage your credentials, consultation defaults, and AI assistant configurations."
        actions={
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            <Save size={16} />
            {busy ? 'Saving changes…' : 'Save Changes'}
          </button>
        }
      />

      {savedMsg && (
        <div className="alert ok" role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <CheckCircle2 size={16} color="var(--green)" />
          Settings successfully saved and applied to your doctor profile.
        </div>
      )}

      <form onSubmit={save} className="stack">
        {/* Doctor Professional Profile */}
        <Card title="Professional Credentials & Clinic Information">
          <div className="fs">
            <div className="grid-2">
              <label className="field">
                <span>Doctor Full Name</span>
                <input value={p.fullName} onChange={e => setProfile('fullName', e.target.value)} required />
              </label>
              <label className="field">
                <span>Medical Degree / Qualifications</span>
                <input value={p.qualifications} onChange={e => setProfile('qualifications', e.target.value)} required />
              </label>
            </div>

            <div className="grid-2">
              <label className="field">
                <span>Clinical Specialization</span>
                <input value={p.specialization} onChange={e => setProfile('specialization', e.target.value)} required />
              </label>
              <label className="field">
                <span>Medical License / Registration Number</span>
                <input value={p.licenseNumber} onChange={e => setProfile('licenseNumber', e.target.value)} required />
              </label>
            </div>

            <div className="grid-2">
              <label className="field">
                <span>Primary Hospital / Clinic Affiliation</span>
                <input value={p.hospitalAffiliation} onChange={e => setProfile('hospitalAffiliation', e.target.value)} />
              </label>
              <label className="field">
                <span>Department / OPD Room</span>
                <input value={p.department} onChange={e => setProfile('department', e.target.value)} />
              </label>
            </div>

            <div className="grid-2">
              <label className="field">
                <span>Official Contact Phone</span>
                <input value={p.phone} onChange={e => setProfile('phone', e.target.value)} />
              </label>
              <label className="field">
                <span>Professional Email</span>
                <input value={p.email} onChange={e => setProfile('email', e.target.value)} type="email" />
              </label>
            </div>
          </div>
        </Card>

        {/* Clinical & Prescription Preferences */}
        <Card title="Clinical & Prescription Rules">
          <div className="fs">
            <div className="grid-2">
              <label className="field">
                <span>Default Follow-up Period (Days)</span>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={pref.defaultFollowUpDays}
                  onChange={e => setPref('defaultFollowUpDays', Number(e.target.value))}
                />
              </label>

              <label className="field">
                <span>AI Clinical Model Engine</span>
                <select
                  value={pref.aiModelEngine}
                  onChange={e => setPref('aiModelEngine', e.target.value)}
                >
                  <option value="whisper-large-v3-med">Whisper Large v3 (Clinical fine-tuned)</option>
                  <option value="llama-3-med-70b">Llama-3 Med 70B (Clinical Summary)</option>
                  <option value="gpt-4o-medical">GPT-4o Medical Copilot</option>
                  <option value="mock-demo-engine">Mock Engine (Local Dev)</option>
                </select>
              </label>
            </div>

            <label className="field">
              <span>Default Prescription Footer Instructions</span>
              <textarea
                rows={2}
                value={pref.defaultRxNotes}
                onChange={e => setPref('defaultRxNotes', e.target.value)}
              />
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.88rem' }}>
                <input
                  type="checkbox"
                  checked={pref.autoStartRecording}
                  onChange={e => setPref('autoStartRecording', e.target.checked)}
                />
                <span><strong>Auto-start audio recording</strong> immediately upon opening a scheduled consultation</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.88rem' }}>
                <input
                  type="checkbox"
                  checked={pref.strictAllergyChecks}
                  onChange={e => setPref('strictAllergyChecks', e.target.checked)}
                />
                <span><strong>Strict Allergy Cross-Check:</strong> Block prescription approval if any medication conflicts with known allergies</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.88rem' }}>
                <input
                  type="checkbox"
                  checked={pref.suggestGenericEquivalents}
                  onChange={e => setPref('suggestGenericEquivalents', e.target.checked)}
                />
                <span><strong>Suggest Generic Equivalents</strong> in AI prescription assistant</span>
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

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.88rem' }}>
              <input
                type="checkbox"
                checked={notif.criticalLabAlerts}
                onChange={e => setNotif('criticalLabAlerts', e.target.checked)}
              />
              <span>High-priority alert for abnormal patient diagnostic lab results</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.88rem' }}>
              <input
                type="checkbox"
                checked={notif.weeklyReportDigest}
                onChange={e => setNotif('weeklyReportDigest', e.target.checked)}
              />
              <span>Weekly analytics digest email</span>
            </label>
          </div>
        </Card>

        <div className="row end sticky-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            <Save size={16} />
            {busy ? 'Saving changes…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </>
  )
}
