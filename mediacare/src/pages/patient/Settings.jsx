import { useState } from 'react'
import {
  Settings, Bell, Shield, Lock, Smartphone, CheckCircle2,
  Save, KeyRound, Eye, EyeOff
} from 'lucide-react'
import {
  Card, PageHeader
} from '../../components/common/ui'

export default function PatientSettings() {
  const [notifications, setNotifications] = useState({
    smsAppointments: true,
    pushReminders: true,
    emailPrescriptions: true,
    labAlerts: true,
    vitalsThresholdAlerts: true
  })

  const [privacy, setPrivacy] = useState({
    shareWithSpecialists: true,
    allowAiAssistance: true,
    emergencyAccess: true
  })

  const [security, setSecurity] = useState({
    twoFactor: true,
    biometricLogin: false
  })

  const [pwd, setPwd] = useState({ current: '', newPwd: '', confirm: '' })
  const [pwdMsg, setPwdMsg] = useState('')
  const [savedSuccess, setSavedSuccess] = useState(false)

  const handleSavePreferences = (e) => {
    e.preventDefault()
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 2500)
  }

  const handleChangePassword = (e) => {
    e.preventDefault()
    if (pwd.newPwd !== pwd.confirm) {
      setPwdMsg('New passwords do not match.')
      return
    }
    if (pwd.newPwd.length < 6) {
      setPwdMsg('Password must be at least 6 characters.')
      return
    }
    setPwdMsg('Password changed successfully.')
    setPwd({ current: '', newPwd: '', confirm: '' })
    setTimeout(() => setPwdMsg(''), 3000)
  }

  return (
    <>
      <PageHeader
        title="Account & Privacy Settings"
        subtitle="Configure health notification channels, patient data sharing consents, and security parameters."
        actions={
          <button className="btn btn-primary" onClick={handleSavePreferences}>
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

      <div className="grid-2">
        {/* Notifications Card */}
        <Card title="Health Notifications & Reminders">
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
                <div className="muted small">Allow Mary Doe (Spouse) access to vital medical records in acute emergencies</div>
              </div>
              <input
                type="checkbox"
                checked={privacy.emergencyAccess}
                onChange={e => setPrivacy({ ...privacy, emergencyAccess: e.target.checked })}
              />
            </label>
          </div>
        </Card>

        {/* Account Security Card */}
        <Card title="Two-Factor Security">
          <div className="stack">
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--line)', cursor: 'pointer' }}>
              <div>
                <strong>Two-Factor Authentication (2FA)</strong>
                <div className="muted small">Require verification code via SMS when signing in on unrecognized devices</div>
              </div>
              <input
                type="checkbox"
                checked={security.twoFactor}
                onChange={e => setSecurity({ ...security, twoFactor: e.target.checked })}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', cursor: 'pointer' }}>
              <div>
                <strong>Biometric / TouchID Unlock</strong>
                <div className="muted small">Allow fast biometric login on supported mobile and tablet browsers</div>
              </div>
              <input
                type="checkbox"
                checked={security.biometricLogin}
                onChange={e => setSecurity({ ...security, biometricLogin: e.target.checked })}
              />
            </label>
          </div>
        </Card>

        {/* Change Password Card */}
        <Card title="Update Account Password">
          <form onSubmit={handleChangePassword} className="stack">
            {pwdMsg && (
              <div className={`alert ${pwdMsg.includes('success') ? 'ok' : 'err'}`}>
                {pwdMsg}
              </div>
            )}

            <label className="field">
              Current Password
              <input
                type="password"
                required
                value={pwd.current}
                onChange={e => setPwd({ ...pwd, current: e.target.value })}
                placeholder="••••••••"
              />
            </label>

            <div className="grid-2">
              <label className="field">
                New Password
                <input
                  type="password"
                  required
                  value={pwd.newPwd}
                  onChange={e => setPwd({ ...pwd, newPwd: e.target.value })}
                  placeholder="At least 6 characters"
                />
              </label>

              <label className="field">
                Confirm New Password
                <input
                  type="password"
                  required
                  value={pwd.confirm}
                  onChange={e => setPwd({ ...pwd, confirm: e.target.value })}
                  placeholder="Repeat new password"
                />
              </label>
            </div>

            <div className="row end">
              <button type="submit" className="btn btn-primary">
                Update Password
              </button>
            </div>
          </form>
        </Card>
      </div>
    </>
  )
}
