import { useEffect, useState } from 'react'
import { CheckCircle2, Save } from 'lucide-react'
import { patientApi } from '../../services/api'
import { useAsync } from '../../hooks'
import { Card, PageHeader, LoadingState, ErrorState } from '../../components/common/ui'

export default function PatientSettings() {
  const { data, loading, error, reload } = useAsync(patientApi.getSettings)
  const [notifications, setNotifications] = useState(null)
  const [privacy, setPrivacy] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [savedSuccess, setSavedSuccess] = useState(false)

  useEffect(() => {
    if (!data) return
    setNotifications({
      smsAppointments: true,
      pushReminders: true,
      emailPrescriptions: true,
      labAlerts: true,
      vitalsThresholdAlerts: true,
      ...data.notifications
    })
    setPrivacy({
      shareWithSpecialists: true,
      allowAiAssistance: true,
      emergencyAccess: false,
      ...data.privacy
    })
  }, [data])

  const handleSavePreferences = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveError('')
    setSavedSuccess(false)
    try {
      const saved = await patientApi.updateSettings({ notifications, privacy })
      setNotifications(saved.notifications || notifications)
      setPrivacy(saved.privacy || privacy)
      setSavedSuccess(true)
    } catch (err) {
      setSaveError(err.message || 'Unable to save preferences.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState label="Loading account preferences…" />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!notifications || !privacy) return null

  return (
    <>
      <PageHeader
        title="Account & Privacy Settings"
        subtitle="Configure health notification channels, patient data sharing consents, and security parameters."
        actions={
          <button className="btn btn-primary" onClick={handleSavePreferences} disabled={saving}>
            <Save size={15} /> Save All Preferences
          </button>
        }
      />

      {savedSuccess && (
        <div className="alert ok" style={{ marginBottom: 16 }}>
          <CheckCircle2 size={16} style={{ display: 'inline', marginRight: 6 }} />
          Preferences saved successfully!
        </div>
      )}
      {saveError && <div className="alert err" role="alert">{saveError}</div>}

      <div className="grid-2">
        {/* Notifications Card */}
        <Card title="Health Notifications & Reminders">
          <p className="muted small">Preferences are saved to your account. Notification delivery depends on configured services.</p>
          <div className="stack">
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--line)', cursor: 'pointer' }}>
              <div>
                <strong>Pill Reminder Push Notifications</strong>
                <div className="muted small">Daily alerts at 08:00 AM, 01:00 PM, and 08:00 PM</div>
              </div>
              <input
                type="checkbox"
                checked={notifications.pushReminders}
                onChange={e => setNotifications({ ...notifications, pushReminders: e.target.checked })}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--line)', cursor: 'pointer' }}>
              <div>
                <strong>Appointment SMS Reminders</strong>
                <div className="muted small">Receive SMS alerts 24 hours prior to scheduled clinic visits</div>
              </div>
              <input
                type="checkbox"
                checked={notifications.smsAppointments}
                onChange={e => setNotifications({ ...notifications, smsAppointments: e.target.checked })}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--line)', cursor: 'pointer' }}>
              <div>
                <strong>Prescription & Lab Email Delivery</strong>
                <div className="muted small">Instant PDF copies are sent to the signed-in patient account upon doctor finalization</div>
              </div>
              <input
                type="checkbox"
                checked={notifications.emailPrescriptions}
                onChange={e => setNotifications({ ...notifications, emailPrescriptions: e.target.checked })}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--line)', cursor: 'pointer' }}>
              <div>
                <strong>Lab Result Alerts</strong>
                <div className="muted small">Preference for notifications when lab results are available</div>
              </div>
              <input
                type="checkbox"
                checked={notifications.labAlerts}
                onChange={e => setNotifications({ ...notifications, labAlerts: e.target.checked })}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', cursor: 'pointer' }}>
              <div>
                <strong>Abnormal Vitals & Lab Alerts</strong>
                <div className="muted small">Urgent notifications if blood pressure or lab results fall outside reference targets</div>
              </div>
              <input
                type="checkbox"
                checked={notifications.vitalsThresholdAlerts}
                onChange={e => setNotifications({ ...notifications, vitalsThresholdAlerts: e.target.checked })}
              />
            </label>
          </div>
        </Card>

        {/* Privacy & Sharing Card */}
        <Card title="Privacy & Health Data Consents">
          <p className="muted small">These saved preferences do not override access controls or sharing policies enforced elsewhere.</p>
          <div className="stack">
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--line)', cursor: 'pointer' }}>
              <div>
                <strong>Cross-Hospital Record Sharing</strong>
                <div className="muted small">Permit consulting physicians across partner clinics to view verified medical history</div>
              </div>
              <input
                type="checkbox"
                checked={privacy.shareWithSpecialists}
                onChange={e => setPrivacy({ ...privacy, shareWithSpecialists: e.target.checked })}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--line)', cursor: 'pointer' }}>
              <div>
                <strong>AI Clinical Assistant Analysis</strong>
                <div className="muted small">Authorize AI speech transcription and drug interaction safety checks during visits</div>
              </div>
              <input
                type="checkbox"
                checked={privacy.allowAiAssistance}
                onChange={e => setPrivacy({ ...privacy, allowAiAssistance: e.target.checked })}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', cursor: 'pointer' }}>
              <div>
                <strong>Emergency Contact Record Access</strong>
                <div className="muted small">Allow emergency access to your health record when applicable</div>
              </div>
              <input
                type="checkbox"
                checked={privacy.emergencyAccess}
                onChange={e => setPrivacy({ ...privacy, emergencyAccess: e.target.checked })}
              />
            </label>
          </div>
        </Card>

        <Card title="Account Security">
          <p className="muted">Two-factor authentication, biometric sign-in, and password changes are not available in this portal.</p>
        </Card>

      </div>
    </>
  )
}
