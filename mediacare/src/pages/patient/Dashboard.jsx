import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, Heart, Pill, Calendar, CalendarDays, CheckCircle2, Clock, AlertCircle,
  FileText, Shield, ArrowRight, PhoneCall, Sparkles, ChevronRight, Plus, AlertTriangle
} from 'lucide-react'
import { patientApi } from '../../services/api'
import { useAsync } from '../../hooks'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { Card, StatCard, StatusBadge, LoadingState, ErrorState, PageHeader, Modal } from '../../components/common/ui'

const normalizePatientInstructions = (value) => {
  if (Array.isArray(value)) {
    return value
  }

  if (typeof value !== 'string' || !value.trim()) {
    return []
  }

  const trimmed = value.trim()

  // Support JSON array strings such as:
  // ["Instruction 1", "Instruction 2"]
  try {
    const parsed = JSON.parse(trimmed)

    if (Array.isArray(parsed)) {
      return parsed
    }
  } catch {
    // Not JSON; continue as comma-separated text.
  }

  // Backend currently stores instructions as comma-separated text.
  return trimmed
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

export default function PatientDashboard() {
  const { user } = useAuth()
  const toast = useToast()
  const { data, loading, error, reload } = useAsync(patientApi.getDashboard)
  const [togglingId, setTogglingId] = useState(null)

  // Home Vitals Logging State
  const [showLogVitals, setShowLogVitals] = useState(false)
  const [vitalsForm, setVitalsForm] = useState({ bpSys: '', bpDia: '', hr: '', spo2: '', glucose: '', weightKg: '' })
  const [logAlert, setLogAlert] = useState(null)
  const [logging, setLogging] = useState(false)

  const handleTogglePill = async (id, name) => {
    setTogglingId(id)
    try {
      const res = await patientApi.toggleReminder(id)
      if (res.taken) {
        toast.success(`Dose confirmed for ${name || 'medication'}`)
      } else {
        toast.info(`Reminder un-checked for ${name || 'medication'}`)
      }
      reload()
    } finally {
      setTogglingId(null)
    }
  }

  const handleLogSubmit = async (e) => {
    e.preventDefault()
    setLogging(true)
    try {
      const res = await patientApi.logVital(vitalsForm)
      if (res.isCritical) {
        setLogAlert({ type: 'critical', message: res.message })
        toast.error('High reading detected! Doctor notified.')
      } else {
        setLogAlert({ type: 'success', message: res.message })
        toast.success('Home reading verified and recorded')
        setTimeout(() => {
          setLogAlert(null)
          setShowLogVitals(false)
          setVitalsForm({ bpSys: '', bpDia: '', hr: '', spo2: '', glucose: '', weightKg: '' })
        }, 1500)
      }
      reload()
    } finally {
      setLogging(false)
    }
  }

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user?.name || 'John'} 👋`}
        subtitle="Here is your personal health summary, daily schedule, and medication alerts."
        actions={
          <div className="row">
            <span className="row" style={{ fontSize: '0.85rem', color: 'var(--muted)', background: '#fff', border: '1px solid var(--line)', padding: '6px 12px', borderRadius: 10 }}>
              <span className="ping-indicator" /> Primary Care: <strong>Dr. John Smith</strong>
            </span>
            <Link to="/patient/appointments" className="btn btn-primary">
              <CalendarDays size={16} /> Book Appointment
            </Link>
          </div>
        }
      />

      {loading && <LoadingState label="Loading your personal health portal…" />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {data && (
        <div className="stack">
          {/* Key Vitals Overview with Last Updated Date */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={18} color="var(--primary)" />
                <strong style={{ fontSize: '1.05rem' }}>Current Health Status & Vitals</strong>
              </div>
              <div className="row">
                <span style={{ fontSize: '0.82rem', color: 'var(--muted)', background: '#fff', border: '1px solid var(--line)', padding: '5px 12px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={13} color="var(--primary)" /> Last updated: <strong style={{ color: 'var(--text)' }}>{data.vitalsLastUpdated || 'No readings recorded'}</strong>
                </span>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => setShowLogVitals(true)}
                >
                  <Plus size={14} /> Log Home Reading
                </button>
              </div>
            </div>

            <div className="grid-4">
              {data.vitals.map(v => (
                <div key={v.key} className={`card tone-${v.tone}`} style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="stat-icon" style={{ width: 40, height: 40, borderRadius: 10 }}>
                      {v.key === 'bp' ? <Heart size={20} /> : v.key === 'hr' ? <Activity size={20} /> : v.key === 'spo2' ? <Shield size={20} /> : <Pill size={20} />}
                    </span>
                    <span className={`badge badge-${v.tone === 'green' ? 'green' : v.tone === 'blue' ? 'blue' : 'purple'}`}>
                      {v.status}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                      {v.value} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--muted)' }}>{v.unit}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>{v.label}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={12} /> Last updated: <strong style={{ color: 'var(--text)' }}>{v.lastUpdated || 'No reading'}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid-3">
            {/* Left 2 Cols: Medicine Schedule & Upcoming Visits */}
            <div className="stack" style={{ gridColumn: 'span 2' }}>
              {/* Daily Pill Tracker */}
              <Card
                title="Today's Medicine Schedule"
                action={<Link to="/patient/medicine-reminders" className="link">Full Schedule & Refills</Link>}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {data.reminders.map(rem => (
                    <div key={rem.id} className={`pill-card ${rem.taken ? 'is-taken' : ''}`}>
                      <span className={`pill-time-badge ${rem.slot.toLowerCase()}`}>
                        {rem.time} • {rem.slot}
                      </span>
                      <div className="grow">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <strong>{rem.medicineName}</strong>
                          <span className="muted small">({rem.strength} — {rem.dosage})</span>
                        </div>
                        <div className="muted small">{rem.food} • {rem.instructions}</div>
                      </div>
                      <button
                        className={`btn btn-sm ${rem.taken ? 'btn-primary' : ''}`}
                        onClick={() => handleTogglePill(rem.id)}
                        disabled={togglingId === rem.id}
                        title={rem.taken ? 'Click to mark as pending' : 'Click to mark as taken'}
                      >
                        <CheckCircle2 size={14} />
                        {rem.taken ? `Taken at ${rem.takenAt || 'today'}` : 'Mark Taken'}
                      </button>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Upcoming Appointments */}
              <Card
                title="Upcoming Appointments"
                action={<Link to="/patient/appointments" className="link">View All</Link>}
              >
                {(data.appointments || []).filter(a => a.status === 'Scheduled').length === 0 ? (
                  <p className="muted" style={{ padding: '12px 0' }}>No scheduled appointments at this time.</p>
                ) : (
                  <ul className="list">
                    {(data.appointments || []).filter(a => a.status === 'Scheduled').map(appt => (
                      <li key={appt.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                        <div className="avatar" style={{ width: 42, height: 42 }}>
                          {appt.doctorAvatar}
                        </div>
                        <div className="grow">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <strong>{appt.doctor}</strong>
                            <StatusBadge status={appt.status} />
                          </div>
                          <div className="muted small">{appt.specialty} • {appt.hospital}</div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--primary)', marginTop: 2 }}>
                            📅 {appt.date} at {appt.time} • {appt.room}
                          </div>
                        </div>
                        <Link to="/patient/appointments" className="btn btn-sm">
                          Details
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              {/* Latest Doctor Consultation Takeaway */}
              {data.recentVisit && (
                <Card
                  title="Latest Doctor Consultation Notes"
                  action={<Link to="/patient/visit-summaries" className="link">View History</Link>}
                >
                  <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <strong>
                        {data.recentVisit.doctorName || data.recentVisit.doctor || 'Doctor'}
                        {data.recentVisit.specialty ? ` (${data.recentVisit.specialty})` : ''}
                      </strong>
                      <span className="muted small">{data.recentVisit.date}</span>
                    </div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.5, margin: '6px 0 10px' }}>
                      "{data.recentVisit.keyTakeaway}"
                    </p>
                    <div className="tags">
                      {normalizePatientInstructions(data.recentVisit.patientInstructions)
                        .slice(0, 2)
                        .map((inst, i) => (
                          <span
                            key={i}
                            className="tag"
                            style={{ background: '#e3f8ea', color: '#166534' }}
                          >
                            ✓ {inst}
                          </span>
                        ))}
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Right Column: Health Card, Active Prescriptions, Quick Contacts */}
            <div className="stack">
              {/* Digital Health ID Card */}
              <div className="health-card">
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.95rem' }}>
                      <Heart size={18} fill="#fff" /> MediCare Health ID
                    </div>
                    <span className="health-card-chip">VERIFIED</span>
                  </div>
                  <div className="health-card-num">{data.profile.healthCardNumber}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{data.profile.name}</div>
                  <div style={{ opacity: 0.85, fontSize: '0.8rem' }}>
                    Age: {data.profile.age} • Gender: {data.profile.gender} • Blood: {data.profile.bloodGroup}
                  </div>
                </div>
                <div className="health-card-foot">
                  <div>
                    <div style={{ opacity: 0.7, fontSize: '0.7rem' }}>INSURANCE PROVIDER</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{data.profile.insuranceProvider || 'Not provided'}</div>
                  </div>
                  <Link to="/patient/profile" style={{ color: '#fff', fontSize: '0.78rem', textDecoration: 'underline' }}>
                    View Full Profile
                  </Link>
                </div>
              </div>

              {/* Active Prescriptions */}
              <Card
                title="Active Prescriptions"
                action={<Link to="/patient/prescriptions" className="link">All (3)</Link>}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {data.activePrescriptions.map(rx => (
                    <div key={rx.id} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>{rx.code}</strong>
                          <div className="small muted">{rx.doctor}</div>
                        </div>
                        <StatusBadge status={rx.status} />
                      </div>
                      <div style={{ margin: '8px 0', fontSize: '0.85rem' }}>
                        {rx.items.map(item => (
                          <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                            <span><strong>{item.name}</strong> {item.strength}</span>
                            <span className="muted">{item.frequency}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--muted)', borderTop: '1px solid var(--line)', paddingTop: 6 }}>
                        <span>Refills left: <strong>{rx.refillsLeft}</strong></span>
                        <Link to="/patient/prescriptions" className="link">View Details →</Link>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Quick Care Actions */}
              <Card title="Patient Care Support">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Link to="/patient/messages" className="btn block" style={{ justifyContent: 'flex-start' }}>
                    <Sparkles size={16} color="var(--primary)" /> Message Care Team
                  </Link>
                  <Link to="/patient/medical-records" className="btn block" style={{ justifyContent: 'flex-start' }}>
                    <FileText size={16} /> View Health Records
                  </Link>
                  <Link to="/patient/lab-tests" className="btn block" style={{ justifyContent: 'flex-start' }}>
                    <Activity size={16} /> Check Lab Results
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Log Home Vitals Modal */}
      {showLogVitals && (
        <Modal
          open={showLogVitals}
          title="Log Home Health Reading"
          onClose={() => { setShowLogVitals(false); setLogAlert(null) }}
        >
          {logAlert ? (
            <div className={`alert ${logAlert.type === 'critical' ? 'err' : 'ok'}`} style={{ padding: 18, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                {logAlert.type === 'critical' ? (
                  <AlertTriangle size={24} color="var(--red)" style={{ flexShrink: 0, marginTop: 2 }} />
                ) : (
                  <CheckCircle2 size={24} color="var(--green)" style={{ flexShrink: 0, marginTop: 2 }} />
                )}
                <div>
                  <strong style={{ fontSize: '1rem' }}>
                    {logAlert.type === 'critical' ? 'Clinical Safety Warning' : 'Health Reading Recorded'}
                  </strong>
                  <p style={{ margin: '6px 0 0', fontSize: '0.88rem', lineHeight: 1.45 }}>
                    {logAlert.message}
                  </p>
                  {logAlert.type === 'critical' && (
                    <div className="row end" style={{ marginTop: 12 }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => { setShowLogVitals(false); setLogAlert(null) }}
                      >
                        I Understand
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleLogSubmit}>
              <p style={{ fontSize: '0.88rem', color: 'var(--muted)', marginBottom: 14 }}>
                Enter your self-measured readings from home monitoring devices. These readings update your health status and are accessible to Dr. John Smith.
              </p>

              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid var(--line)', marginBottom: 14 }}>
                <strong style={{ fontSize: '0.88rem', display: 'block', marginBottom: 8 }}>Blood Pressure (mmHg)</strong>
                <div className="grid-2">
                  <label className="field">
                    Systolic (Upper)
                    <input
                      type="number"
                      placeholder="e.g. 124"
                      value={vitalsForm.bpSys}
                      onChange={e => setVitalsForm({ ...vitalsForm, bpSys: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    Diastolic (Lower)
                    <input
                      type="number"
                      placeholder="e.g. 80"
                      value={vitalsForm.bpDia}
                      onChange={e => setVitalsForm({ ...vitalsForm, bpDia: e.target.value })}
                    />
                  </label>
                </div>
              </div>

              <div className="grid-2" style={{ marginBottom: 16 }}>
                <label className="field">
                  Oxygen Saturation (SpO2 %)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="e.g. 98"
                    value={vitalsForm.spo2}
                    onChange={e => setVitalsForm({ ...vitalsForm, spo2: e.target.value })}
                  />
                </label>

                <label className="field">
                  Weight (kg)
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="e.g. 74.5"
                    value={vitalsForm.weightKg}
                    onChange={e => setVitalsForm({ ...vitalsForm, weightKg: e.target.value })}
                  />
                </label>
              </div>

              <div className="grid-2" style={{ marginBottom: 16 }}>
                <label className="field">
                  Fasting Blood Sugar (mg/dL)
                  <input
                    type="number"
                    placeholder="e.g. 98"
                    value={vitalsForm.glucose}
                    onChange={e => setVitalsForm({ ...vitalsForm, glucose: e.target.value })}
                  />
                </label>

                <label className="field">
                  Resting Heart Rate (bpm)
                  <input
                    type="number"
                    placeholder="e.g. 72"
                    value={vitalsForm.hr}
                    onChange={e => setVitalsForm({ ...vitalsForm, hr: e.target.value })}
                  />
                </label>
              </div>

              <div className="row end">
                <button type="button" className="btn" onClick={() => setShowLogVitals(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={logging || (!vitalsForm.bpSys && !vitalsForm.glucose && !vitalsForm.hr && !vitalsForm.spo2 && !vitalsForm.weightKg)}>
                  {logging ? 'Recording…' : 'Save & Check Reading'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </>
  )
}
