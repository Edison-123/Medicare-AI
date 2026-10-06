import { useState } from 'react'
import {
  Users, Search, ShieldCheck, Heart, AlertTriangle, Building2,
  FileText, CheckCircle2, UserCheck, Eye, Phone, UserPlus
} from 'lucide-react'
import { adminApi } from '../../services/api'
import { useAsync, useDebounced } from '../../hooks'
import {
  Card, PageHeader, StatusBadge, LoadingState, ErrorState,
  EmptyState, Modal
} from '../../components/common/ui'

const HOSPITALS = [
  'All', 'MediCare Central Hospital', 'St. Jude Community Health',
  'Apex Heart & Lung Institute', 'Metro Children\'s Clinic', 'Westside Urgent Care'
]

export default function AdminPatients() {
  const [search, setSearch] = useState('')
  const [hospital, setHospital] = useState('All')
  const [risk, setRisk] = useState('All')
  const debouncedSearch = useDebounced(search, 250)

  const { data: patients, loading, error, reload } = useAsync(
    () => adminApi.getPatients({ q: debouncedSearch, hospital, riskCategory: risk }),
    [debouncedSearch, hospital, risk]
  )

  const [inspectPatient, setInspectPatient] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [registerBusy, setRegisterBusy] = useState(false)
  const [registerError, setRegisterError] = useState('')
  const [registerForm, setRegisterForm] = useState({
    name: '', email: '', password: '', phone: '', dob: '', age: '', gender: '', bloodGroup: '',
    heightCm: '', weightKg: '', address: '', healthCardNumber: '', insuranceProvider: '', insurancePolicy: '',
    riskCategory: 'Low', hospital: '', primaryDoctor: ''
  })

  const updateRegister = (key, value) => setRegisterForm(f => ({ ...f, [key]: value }))
  const resetRegister = () => {
    setRegisterForm({ name:'', email:'', password:'', phone:'', dob:'', age:'', gender:'', bloodGroup:'', heightCm:'', weightKg:'', address:'', healthCardNumber:'', insuranceProvider:'', insurancePolicy:'', riskCategory:'Low', hospital:'', primaryDoctor:'' })
    setRegisterError('')
  }
  const registerPatient = async (e) => {
    e.preventDefault(); setRegisterError('')
    if (!registerForm.name.trim() || !registerForm.email.trim() || !registerForm.password) {
      setRegisterError('Name, email and password are required.')
      return
    }
    if (registerForm.password.length < 8) {
      setRegisterError('Password must contain at least 8 characters.')
      return
    }
    setRegisterBusy(true)
    try {
      await adminApi.registerPatient({
        ...registerForm,
        age: registerForm.age ? Number(registerForm.age) : null,
        heightCm: registerForm.heightCm ? Number(registerForm.heightCm) : null,
        weightKg: registerForm.weightKg ? Number(registerForm.weightKg) : null
      })
      setRegisterOpen(false); resetRegister(); reload()
    } catch (e) { setRegisterError(e.message || 'Patient registration failed.') }
    finally { setRegisterBusy(false) }
  }

  const handleToggleStatus = async (p) => {
    const next = p.status === 'Active' ? 'Inactive' : 'Active'
    setUpdatingId(p.id)
    try {
      await adminApi.updatePatientStatus(p.id, next)
      reload()
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Patient Master Registry"
        subtitle="Manage registered patients across all regional hospital systems, view clinical risk profiles, and audit health record accessibility."
        actions={<button className="btn btn-primary" onClick={() => { resetRegister(); setRegisterOpen(true) }}><UserPlus size={16} /> Register Patient</button>}
      />

      {/* Toolbar filters */}
      <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div className="row">
          <label className="field" style={{ minWidth: 180 }}>
            <select value={hospital} onChange={e => setHospital(e.target.value)}>
              {HOSPITALS.map(h => (
                <option key={h} value={h}>Hospital: {h}</option>
              ))}
            </select>
          </label>

          <label className="field" style={{ minWidth: 150 }}>
            <select value={risk} onChange={e => setRisk(e.target.value)}>
              <option value="All">All Risk Profiles</option>
              <option value="Low">Low Risk</option>
              <option value="Moderate">Moderate Risk</option>
              <option value="High">High Risk</option>
            </select>
          </label>
        </div>

        <label className="search" style={{ minWidth: 280 }}>
          <Search size={16} />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by patient name, ID, phone…"
            aria-label="Search patients"
          />
        </label>
      </div>

      {loading && <LoadingState label="Loading patient records from central registry…" />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {!loading && patients && patients.length === 0 && (
        <Card>
          <EmptyState
            title="No patients found"
            hint="Try changing your search parameters or risk category filter."
          />
        </Card>
      )}

      {/* Patients Table */}
      {patients && patients.length > 0 && (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Full Name</th>
                  <th>Demographics</th>
                  <th>Contact</th>
                  <th>Primary Facility</th>
                  <th>Primary Physician</th>
                  <th>Chronic Diagnoses</th>
                  <th>Risk Profile</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map(p => (
                  <tr key={p.id}>
                    <td><code>#{p.id}</code></td>
                    <td>
                      <strong>{p.name}</strong>
                    </td>
                    <td>{p.age}y / {p.gender}</td>
                    <td>{p.phone}</td>
                    <td>
                      <span className="small">{p.hospital}</span>
                    </td>
                    <td>
                      <span className="small">{p.primaryDoctor}</span>
                    </td>
                    <td>
                      {p.conditions.length > 0 ? (
                        <div className="tags">
                          {p.conditions.map(c => (
                            <span key={c} className="tag">{c}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="muted small">None recorded</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${p.riskCategory === 'High' ? 'red' : p.riskCategory === 'Moderate' ? 'orange' : 'green'}`}>
                        {p.riskCategory} Risk
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="row end">
                        <button
                          className="btn btn-sm"
                          onClick={() => setInspectPatient(p)}
                        >
                          Inspect
                        </button>
                        <button
                          className="btn btn-sm btn-danger-o"
                          onClick={() => handleToggleStatus(p)}
                          disabled={updatingId === p.id}
                        >
                          {p.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Register Patient Modal */}
      {registerOpen && (
        <Modal open={registerOpen} title="Register New Patient" onClose={() => !registerBusy && setRegisterOpen(false)}>
          <form className="stack" onSubmit={registerPatient}>
            {registerError && <div className="alert err" role="alert">{registerError}</div>}
            <div className="grid-2">
              <label className="field">Full name<input required value={registerForm.name} onChange={e => updateRegister('name', e.target.value)} /></label>
              <label className="field">Email<input required type="email" value={registerForm.email} onChange={e => updateRegister('email', e.target.value)} /></label>
              <label className="field">Initial password<input required type="password" minLength={8} value={registerForm.password} onChange={e => updateRegister('password', e.target.value)} autoComplete="new-password" /></label>
              <label className="field">Phone<input value={registerForm.phone} onChange={e => updateRegister('phone', e.target.value)} /></label>
              <label className="field">Date of birth<input type="date" value={registerForm.dob} onChange={e => updateRegister('dob', e.target.value)} /></label>
              <label className="field">Age<input type="number" min="0" value={registerForm.age} onChange={e => updateRegister('age', e.target.value)} /></label>
              <label className="field">Gender<select value={registerForm.gender} onChange={e => updateRegister('gender', e.target.value)}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select></label>
              <label className="field">Blood group<input value={registerForm.bloodGroup} onChange={e => updateRegister('bloodGroup', e.target.value)} placeholder="e.g. O+" /></label>
              <label className="field">Height (cm)<input type="number" min="0" value={registerForm.heightCm} onChange={e => updateRegister('heightCm', e.target.value)} /></label>
              <label className="field">Weight (kg)<input type="number" min="0" value={registerForm.weightKg} onChange={e => updateRegister('weightKg', e.target.value)} /></label>
              <label className="field">Risk category<select value={registerForm.riskCategory} onChange={e => updateRegister('riskCategory', e.target.value)}><option>Low</option><option>Moderate</option><option>High</option></select></label>
              <label className="field">Hospital<input value={registerForm.hospital} onChange={e => updateRegister('hospital', e.target.value)} /></label>
              <label className="field">Primary doctor<input value={registerForm.primaryDoctor} onChange={e => updateRegister('primaryDoctor', e.target.value)} /></label>
              <label className="field wide">Address<textarea rows={2} value={registerForm.address} onChange={e => updateRegister('address', e.target.value)} /></label>
              <label className="field">Health card number<input value={registerForm.healthCardNumber} onChange={e => updateRegister('healthCardNumber', e.target.value)} /></label>
              <label className="field">Insurance provider<input value={registerForm.insuranceProvider} onChange={e => updateRegister('insuranceProvider', e.target.value)} /></label>
              <label className="field wide">Insurance policy<input value={registerForm.insurancePolicy} onChange={e => updateRegister('insurancePolicy', e.target.value)} /></label>
            </div>
            <div className="row end">
              <button type="button" className="btn" disabled={registerBusy} onClick={() => setRegisterOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={registerBusy}>{registerBusy ? 'Registering…' : 'Create Patient Account'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Patient Inspector Modal */}
      {inspectPatient && (
        <Modal
          open={Boolean(inspectPatient)}
          title={`Patient Clinical Summary — #${inspectPatient.id}`}
          onClose={() => setInspectPatient(null)}
        >
          <div className="stack">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className="avatar" style={{ width: 52, height: 52, fontSize: '1.2rem', background: '#e0f2fe', color: '#0369a1' }}>
                {inspectPatient.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
              </div>
              <div>
                <strong style={{ fontSize: '1.2rem' }}>{inspectPatient.name}</strong>
                <div className="muted">{inspectPatient.age} years old • {inspectPatient.gender} • Phone: {inspectPatient.phone}</div>
                <div style={{ marginTop: 4, display: 'flex', gap: 8 }}>
                  <StatusBadge status={inspectPatient.status} />
                  <span className={`badge badge-${inspectPatient.riskCategory === 'High' ? 'red' : inspectPatient.riskCategory === 'Moderate' ? 'orange' : 'green'}`}>
                    {inspectPatient.riskCategory} Clinical Risk
                  </span>
                </div>
              </div>
            </div>

            <div className="dl" style={{ background: '#f8fafc', padding: 14, borderRadius: 8 }}>
              <dt>Registered Facility</dt>
              <dd><strong>{inspectPatient.hospital}</strong></dd>

              <dt>Attending Doctor</dt>
              <dd><strong>{inspectPatient.primaryDoctor}</strong></dd>

              <dt>Known Conditions</dt>
              <dd>
                {inspectPatient.conditions.length > 0 ? inspectPatient.conditions.join(', ') : 'No chronic conditions on record'}
              </dd>

              <dt>Registration Date</dt>
              <dd>{inspectPatient.registeredDate || '2024-01-10'}</dd>

              <dt>EMR Access Token</dt>
              <dd><code>MC-PAT-TOKEN-{inspectPatient.id}-HIPAA-OK</code></dd>
            </div>

            <div className="row end">
              <button className="btn" onClick={() => setInspectPatient(null)}>Close</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
