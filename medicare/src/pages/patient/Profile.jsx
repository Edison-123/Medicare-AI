import { useState } from 'react'
import {
  Heart,
  Edit2,
  Save,
  X,
  CheckCircle2
} from 'lucide-react'

import { patientApi } from '../../services/api'
import { useAsync } from '../../hooks'

import {
  Card,
  PageHeader,
  LoadingState,
  ErrorState,
  Avatar
} from '../../components/common/ui'
import { useAuth } from '../../context/AuthContext'
import AccountSecurityPanel from '../../components/common/AccountSecurityPanel'
import ProfilePhotoEditor from '../../components/common/ProfilePhotoEditor'

export default function PatientProfile() {
  const { user, updateProfilePicture } = useAuth()
  const {
    data: profile,
    loading,
    error,
    reload
  } = useAsync(patientApi.getProfile)

  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState('')

  /*
   * The backend Patient entity contains:
   *
   * insuranceProvider
   * insurancePolicy
   *
   * It does NOT contain:
   *
   * insurance.provider
   * insurance.policyNumber
   * emergencyContact
   * insurance.groupNumber
   * insurance.copayConsultation
   */

  const startEdit = () => {
    if (!profile) return

    setFormData({
      name: profile.name || '',
      dob: profile.dob || '',
      email: profile.email || '',
      phone: profile.phone || '',
      address: profile.address || ''
    })

    setEditing(true)
    setSaveSuccess(false)
    setSaveError('')
  }

  const cancelEdit = () => {
    setEditing(false)
    setFormData(null)
    setSaveError('')
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()

    if (!formData) return

    setSaving(true)
    setSaveError('')
    setSaveSuccess(false)

    try {
      /*
       * The current backend updateProfile() only updates:
       *
       * phone
       * address
       *
       * Therefore only send those fields.
       */
      await patientApi.updateProfile({
        phone: formData.phone,
        address: formData.address
      })

      setEditing(false)
      setFormData(null)
      setSaveSuccess(true)

      await reload()

      setTimeout(() => {
        setSaveSuccess(false)
      }, 3000)

    } catch (err) {
      console.error('Failed to update patient profile:', err)

      setSaveError(
        err?.message ||
        'Unable to update your profile. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader
            title="Profile & Account"
            subtitle="Manage your health information, account details, and security."
        />

        <LoadingState label="Loading patient profile…" />
      </>
    )
  }

  if (error) {
    return (
      <>
        <PageHeader
            title="Profile & Account"
            subtitle="Manage your health information, account details, and security."
        />

        <ErrorState
          message={error}
          onRetry={reload}
        />
      </>
    )
  }

  if (!profile) {
    return (
      <>
        <PageHeader
            title="Profile & Account"
            subtitle="Manage your health information, account details, and security."
        />

        <ErrorState
          message="Patient profile could not be loaded."
          onRetry={reload}
        />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Profile & Account"
        subtitle="Manage your health information, account details, and security."
        actions={
          !editing ? (
            <button
              className="btn btn-primary"
              onClick={startEdit}
            >
              <Edit2 size={15} />
              Edit Profile Info
            </button>
          ) : (
            <div className="row">
              <button
                className="btn"
                onClick={cancelEdit}
                type="button"
              >
                <X size={15} />
                Cancel
              </button>

              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
                type="button"
              >
                <Save size={15} />
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )
        }
      />

      {saveSuccess && (
        <div
          className="alert ok"
          style={{ marginBottom: 16 }}
        >
          <CheckCircle2
            size={16}
            style={{
              display: 'inline',
              marginRight: 6
            }}
          />

          Profile updated successfully!
        </div>
      )}

      {saveError && (
        <div
          className="alert"
          style={{ marginBottom: 16 }}
        >
          {saveError}
        </div>
      )}

      <div className="grid-3">

        {/* =====================================================
            DIGITAL HEALTH ID
        ====================================================== */}

        <div className="stack">

          <div className="health-card">
            <div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontWeight: 700,
                    fontSize: '0.95rem'
                  }}
                >
                  <Heart
                    size={18}
                    fill="#fff"
                  />

                  MediCare Health ID
                </div>

                <span className="health-card-chip">
                  VERIFIED
                </span>

              </div>

              <div className="health-card-num">
                {profile.healthCardNumber || 'Not assigned'}
              </div>

              <div
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700
                }}
              >
                {profile.name || 'Patient'}
              </div>

              <div
                style={{
                  opacity: 0.9,
                  fontSize: '0.85rem',
                  marginTop: 4
                }}
              >
                DOB: {profile.dob || 'Not provided'}
                {' • '}
                Age: {profile.age ?? '—'}
                {' • '}
                {profile.gender || 'Not provided'}
              </div>

            </div>

            <div className="health-card-foot">

              <div>
                <div
                  style={{
                    opacity: 0.75,
                    fontSize: '0.7rem'
                  }}
                >
                  BLOOD GROUP
                </div>

                <div
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 700
                  }}
                >
                  {profile.bloodGroup || '—'}
                </div>
              </div>

              <div>
                <div
                  style={{
                    opacity: 0.75,
                    fontSize: '0.7rem',
                    textAlign: 'right'
                  }}
                >
                  STATUS
                </div>

                <div
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}
                >
                  {profile.status || 'Active'}
                </div>
              </div>

            </div>
          </div>

          {/* =====================================================
              PHYSICAL METRICS
          ====================================================== */}

          <Card title="Physical Baseline Metrics">

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12
              }}
            >

              <div
                style={{
                  background: '#f8fafc',
                  padding: 12,
                  borderRadius: 8
                }}
              >
                <div className="muted small">
                  Height
                </div>

                <strong>
                  {profile.heightCm ?? '—'} cm
                </strong>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  padding: 12,
                  borderRadius: 8
                }}
              >
                <div className="muted small">
                  Weight
                </div>

                <strong>
                  {profile.weightKg ?? '—'} kg
                </strong>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  padding: 12,
                  borderRadius: 8
                }}
              >
                <div className="muted small">
                  Calculated BMI
                </div>

                <strong>
                  {profile.bmi ?? '—'}
                </strong>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  padding: 12,
                  borderRadius: 8
                }}
              >
                <div className="muted small">
                  Blood Type
                </div>

                <strong>
                  {profile.bloodGroup || '—'}
                </strong>
              </div>

            </div>

          </Card>

        </div>

        {/* =====================================================
            DETAILS
        ====================================================== */}

        <div
          className="stack"
          style={{ gridColumn: 'span 2' }}
        >

          <Card title="Personal & Demographic Information">

            {!editing ? (

              <div className="stack">

                <Avatar name={user?.name || profile.name || 'Patient'} size={80} src={user?.profilePicture} />

                <div className="dl">

                  <dt>
                    Full Legal Name
                  </dt>

                  <dd>
                    <strong>
                      {profile.name || 'Not provided'}
                    </strong>
                  </dd>

                  <dt>
                    Date of Birth
                  </dt>

                  <dd>
                    {profile.dob || 'Not provided'}
                    {profile.age != null && (
                      <> ({profile.age} years old)</>
                    )}
                  </dd>

                  <dt>
                    Gender
                  </dt>

                  <dd>
                    {profile.gender || 'Not provided'}
                  </dd>

                  <dt>
                    Email Address
                  </dt>

                  <dd>
                    {user?.email || user?.sub || profile.email || 'Not provided'}
                  </dd>

                  <dt>
                    Mobile Phone
                  </dt>

                  <dd>
                    {profile.phone || 'Not provided'}
                  </dd>

                  <dt>
                    Residential Address
                  </dt>

                  <dd>
                    {profile.address || 'Not provided'}
                  </dd>

                </div>

              </div>

            ) : (

              <form
                onSubmit={handleSave}
                className="stack"
              >

                <ProfilePhotoEditor
                  name={user?.name || profile.name || 'Patient'}
                  profilePicture={user?.profilePicture}
                  onSave={updateProfilePicture}
                />

                <div className="grid-2">

                  <label className="field">
                    Full Legal Name

                    <input
                      type="text"
                      value={formData?.name || ''}
                      disabled
                    />
                  </label>

                  <label className="field">
                    Date of Birth

                    <input
                      type="date"
                      value={formData?.dob || ''}
                      disabled
                    />
                  </label>

                </div>

                <div className="grid-2">

                  <label className="field">
                    Email Address

                    <input
                      type="email"
                      value={formData?.email || ''}
                      disabled
                    />
                  </label>

                  <label className="field">
                    Phone Number

                    <input
                      type="text"
                      value={formData?.phone || ''}
                      onChange={e =>
                        handleChange(
                          'phone',
                          e.target.value
                        )
                      }
                    />
                  </label>

                </div>

                <label className="field">
                  Residential Address

                  <input
                    type="text"
                    value={formData?.address || ''}
                    onChange={e =>
                      handleChange(
                        'address',
                        e.target.value
                      )
                    }
                  />
                </label>

              </form>

            )}

          </Card>

          {/* =====================================================
              EMERGENCY CONTACT
          ====================================================== */}

          <Card title="Emergency Contact">

            <div className="dl">

              <dt>
                Contact Person
              </dt>

              <dd>
                <strong>
                  Not provided
                </strong>
              </dd>

              <dt>
                Emergency Phone
              </dt>

              <dd>
                <strong>
                  Not provided
                </strong>
              </dd>

            </div>

            <div
              className="muted small"
              style={{ marginTop: 12 }}
            >
              Emergency contact information is not currently
              available in your profile.
            </div>

          </Card>

          {/* =====================================================
              INSURANCE
          ====================================================== */}

          <Card title="Health Insurance Coverage">

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12
              }}
            >

              <div>

                <strong
                  style={{
                    fontSize: '1.05rem'
                  }}
                >
                  {profile.insuranceProvider ||
                    'Insurance provider not provided'}
                </strong>

                <div className="muted small">
                  Health insurance information
                </div>

              </div>

              <span className="badge badge-green">
                {profile.insuranceProvider
                  ? 'Provided'
                  : 'Not Provided'}
              </span>

            </div>

            <div
              style={{
                background: '#f8fafc',
                padding: 14,
                borderRadius: 8,
                fontSize: '0.85rem'
              }}
            >

              <div>

                <div className="muted small">
                  Policy #
                </div>

                <strong>
                  {profile.insurancePolicy ||
                    'Not provided'}
                </strong>

              </div>

            </div>

          </Card>

        </div>

      </div>

      <section className="stack" aria-label="Account details" style={{ marginTop: 20 }}>
        <AccountSecurityPanel />
      </section>
    </>
  )
}