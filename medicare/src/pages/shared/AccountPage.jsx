import { useEffect, useState } from 'react'
import { CheckCircle2, Mail, Pencil, Save, ShieldCheck, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { settingsApi } from '../../services/api'
import { useAsync } from '../../hooks'
import AccountSecurityPanel from '../../components/common/AccountSecurityPanel'
import ProfilePhotoEditor from '../../components/common/ProfilePhotoEditor'
import { Card, ErrorState, LoadingState, PageHeader } from '../../components/common/ui'

const ROLE_LABELS = {
  ROLE_ADMIN: 'Administrator',
  ROLE_DOCTOR: 'Clinical staff',
  ROLE_PATIENT: 'Patient'
}

export default function AccountPage() {
  const { user, updateProfilePicture, updateName } = useAuth()
  const roleLabel = ROLE_LABELS[user?.role] || 'MediCare account'

  if (user?.role === 'ROLE_DOCTOR') {
    return <DoctorProfile user={user} roleLabel={roleLabel} updateProfilePicture={updateProfilePicture} updateName={updateName} />
  }

  return (
    <>
      <PageHeader title="Profile & Security" subtitle="Manage your account photo and password." />
      <Card title="Profile">
        <div className="stack">
          <ProfilePhotoEditor
            name={user?.name || roleLabel}
            profilePicture={user?.profilePicture}
            onSave={updateProfilePicture}
          />
          <div className="stack" style={{ gap: 8, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
            <div className="row" style={{ gap: 10 }}>
              <Mail size={17} aria-hidden="true" />
              <span>{user?.email || user?.sub || 'Email unavailable'}</span>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <ShieldCheck size={17} aria-hidden="true" />
              <span>{roleLabel}</span>
            </div>
          </div>
        </div>
      </Card>
      <AccountSecurityPanel />
    </>
  )
}

function DoctorProfile({ user, roleLabel, updateProfilePicture, updateName }) {
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

  const setProfile = (key, value) => setForm(current => ({
    ...current,
    profile: { ...current.profile, [key]: value }
  }))

  const save = async event => {
    event?.preventDefault()
    if (!editing || !form) return
    setBusy(true)
    setSavedMsg(false)
    setSaveError('')
    try {
      const updated = await settingsApi.updateSettings(form)
      const snapshot = structuredClone(updated || form)
      setForm(snapshot)
      setSavedForm(snapshot)
      setEditing(false)
      updateName?.(snapshot.profile?.fullName)
      setSavedMsg(true)
    } catch (requestError) {
      setSaveError(requestError.message || 'Unable to save your professional profile.')
    } finally {
      setBusy(false)
    }
  }

  const cancelEdit = () => {
    if (savedForm) setForm(structuredClone(savedForm))
    setEditing(false)
    setSaveError('')
  }

  if (loading) return <LoadingState label="Loading professional profile…" />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!form) return null

  const profile = form.profile || {}

  return <>
    <PageHeader
      title="Doctor Profile"
      subtitle="Manage your professional details."
      actions={editing ? <div className="row">
        <button type="button" className="btn" onClick={cancelEdit} disabled={busy}><X size={15} /> Cancel</button>
        <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>
          <Save size={16} /> {busy ? 'Saving changes…' : 'Save Profile'}
        </button>
      </div> : <button type="button" className="btn btn-primary" onClick={() => setEditing(true)}>
        <Pencil size={15} /> Edit Profile
      </button>}
    />
    {savedMsg && <div className="alert ok" role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <CheckCircle2 size={16} color="var(--green)" /> Professional profile saved.
    </div>}
    {saveError && <div className="alert err" role="alert" style={{ marginBottom: 16 }}>{saveError}</div>}
    <Card title="Profile">
      <div className="stack">
        <ProfilePhotoEditor
          name={user?.name || roleLabel}
          profilePicture={user?.profilePicture}
          onSave={updateProfilePicture}
        />
        <div className="stack" style={{ gap: 8, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
          <div className="row" style={{ gap: 10 }}><Mail size={17} aria-hidden="true" /><span>{user?.email || user?.sub || 'Email unavailable'}</span></div>
          <div className="row" style={{ gap: 10 }}><ShieldCheck size={17} aria-hidden="true" /><span>{roleLabel}</span></div>
        </div>
      </div>
    </Card>
    <form onSubmit={save} className="stack">
      <fieldset disabled={!editing || busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <Card title="Professional Credentials & Clinic Information">
          <div className="fs">
            <div className="grid-2">
              <label className="field"><span>Doctor Full Name</span>
                <input value={profile.fullName ?? ''} onChange={event => setProfile('fullName', event.target.value)} required />
              </label>
              <label className="field"><span>Medical Degree / Qualifications</span>
                <input value={profile.qualifications ?? ''} onChange={event => setProfile('qualifications', event.target.value)} required />
              </label>
            </div>
            <div className="grid-2">
              <label className="field"><span>Clinical Specialization</span>
                <input value={profile.specialization ?? ''} onChange={event => setProfile('specialization', event.target.value)} required />
              </label>
              <label className="field"><span>Medical License / Registration Number</span>
                <input value={profile.licenseNumber ?? ''} onChange={event => setProfile('licenseNumber', event.target.value)} required />
              </label>
            </div>
            <div className="grid-2">
              <label className="field"><span>Primary Hospital / Clinic Affiliation</span>
                <input value={profile.hospitalAffiliation ?? ''} onChange={event => setProfile('hospitalAffiliation', event.target.value)} />
              </label>
              <label className="field"><span>Department / OPD Room</span>
                <input value={profile.department ?? ''} onChange={event => setProfile('department', event.target.value)} />
              </label>
            </div>
            <div className="grid-2">
              <label className="field"><span>Official Contact Phone</span>
                <input value={profile.phone ?? ''} onChange={event => setProfile('phone', event.target.value)} />
              </label>
              <label className="field"><span>Professional Email</span>
                <input value={profile.email ?? ''} type="email" readOnly aria-describedby="doctor-profile-email-note" />
                <small id="doctor-profile-email-note" className="muted small">Email is managed with your account credentials.</small>
              </label>
            </div>
          </div>
        </Card>
      </fieldset>
    </form>
    <AccountSecurityPanel />
  </>
}