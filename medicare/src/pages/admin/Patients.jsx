import { useState } from 'react'
import {
  Users, Search, ShieldCheck, Heart, AlertTriangle, Building2,
  FileText, CheckCircle2, UserCheck, Eye, Phone, UserPlus
} from 'lucide-react'
import { adminApi } from '../../services/api'
import { useAsync, useDebounced } from '../../hooks'
import {
  Card, PageHeader, StatusBadge, LoadingState, ErrorState,
  EmptyState, Modal, Avatar
} from '../../components/common/ui'

export default function AdminPatients() {
  const [search, setSearch] = useState('')
  const [hospital, setHospital] = useState('All')
  const [risk, setRisk] = useState('All')
  const debouncedSearch = useDebounced(search, 250)

  const { data: patients, loading, error, reload } = useAsync(
    () => adminApi.getPatients({ q: debouncedSearch, hospital, riskCategory: risk }),
    [debouncedSearch, hospital, risk]
  )
  const { data: hospitals } = useAsync(adminApi.getHospitals)
  const { data: doctorOptions } = useAsync(adminApi.getDoctors)
  const sortedHospitals = [...(hospitals || [])].sort((a, b) =>
    (a?.name || '').localeCompare(b?.name || '', undefined, { sensitivity: 'base' })
  )
  const sortedDoctorOptions = [...(doctorOptions || [])].sort((a, b) =>
    (a?.name || '').localeCompare(b?.name || '', undefined, { sensitivity: 'base' })
  )
  const [inspectPatient, setInspectPatient] = useState(null)
  const [patientEditor, setPatientEditor] = useState(null)
  const [patientEditForm, setPatientEditForm] = useState({
    name: '', email: '', phone: '', dob: '', age: '', gender: '', bloodGroup: '', heightCm: '', weightKg: '', address: '', healthCardNumber: '', insuranceProvider: '', insurancePolicy: '', riskCategory: 'Low', hospital: '', primaryDoctor: '', status: 'Active'
  })
  const [patientEditError, setPatientEditError] = useState('')
  const [savingPatientEdit, setSavingPatientEdit] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [registerBusy, setRegisterBusy] = useState(false)
  const [registerError, setRegisterError] = useState('')
  const [registerForm, setRegisterForm] = useState({
    name: '', email: '', password: '', phone: '', dob: '', age: '', gender: '', bloodGroup: '',
    heightCm: '', weightKg: '', address: '', healthCardNumber: '', insuranceProvider: '', insurancePolicy: '',
    riskCategory: 'Low', hospital: '', primaryDoctor: ''
  })
  const registerDoctors = sortedDoctorOptions.filter(doc =>
    doc.hospital?.trim().toLowerCase() === registerForm.hospital.trim().toLowerCase()
  )
  const editDoctors = sortedDoctorOptions.filter(doc =>
    doc.hospital?.trim().toLowerCase() === patientEditForm.hospital.trim().toLowerCase()
  )

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

  const openPatientEditor = (p) => {
    setPatientEditor(p)
    setPatientEditError('')
    setPatientEditForm({
      name: p.name || '',
      email: p.email || '',
      phone: p.phone || '',
      dob: p.dob || '',
      age: p.age ?? '',
      gender: p.gender || '',
      bloodGroup: p.bloodGroup || '',
      heightCm: p.heightCm ?? '',
      weightKg: p.weightKg ?? '',
      address: p.address || '',
      healthCardNumber: p.healthCardNumber || '',
      insuranceProvider: p.insuranceProvider || '',
      insurancePolicy: p.insurancePolicy || '',
      riskCategory: p.riskCategory || 'Low',
      hospital: p.hospital || '',
      primaryDoctor: p.primaryDoctor || '',
      status: p.status || 'Active'
    })
  }

  const handlePatientEditSave = async (e) => {
    e.preventDefault()
    if (!patientEditor) return
    setSavingPatientEdit(true)
    setPatientEditError('')
    try {
      await adminApi.updatePatient(patientEditor.id, {
        ...patientEditForm,
        age: patientEditForm.age === '' ? null : Number(patientEditForm.age),
        heightCm: patientEditForm.heightCm === '' ? null : Number(patientEditForm.heightCm),
        weightKg: patientEditForm.weightKg === '' ? null : Number(patientEditForm.weightKg),
        bmi: patientEditor.bmi ?? null
      })
      setPatientEditor(null)
      reload()
    } catch (error) {
      setPatientEditError(error.message || 'Could not update patient details.')
    } finally {
      setSavingPatientEdit(false)
    }
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
        title="Patient Directory"
        subtitle="Manage registered patients across all regional hospital systems, view clinical risk profiles, and review health record access."
        actions={<button className="btn btn-primary" onClick={() => { resetRegister(); setRegisterOpen(true) }}><UserPlus size={16} /> Register Patient</button>}
      />

      {/* Toolbar filters */}
      <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div className="row">
          <label className="field" style={{ minWidth: 180 }}>
            <select value={hospital} onChange={e => setHospital(e.target.value)}>
              <option value="All">All hospitals</option>
              {sortedHospitals.map(h => (
                <option key={h.id} value={h.name}>{h.name}</option>
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

      {loading && <LoadingState label="Loading patient list…" />}
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
                  <th>Risk Profile</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map(p => (
                  <tr key={p.id}>
                    <td><code>#{p.id}</code></td>
                    <td>
                      <div className="who"><Avatar name={p.name} size={32} src={p.profilePicture} /><strong>{p.name}</strong></div>
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
                      <span className={`badge badge-${p.riskCategory === 'High' ? 'red' : p.riskCategory === 'Moderate' ? 'orange' : 'green'}`}>
                        {p.riskCategory} Risk
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="row end" style={{ justifyContent: 'center' }}>
                        <button
                          className="btn btn-sm"
                          onClick={() => setInspectPatient(p)}
                        >
                          View
                        </button>

                        <button
                          className="btn btn-sm"
                          onClick={() => openPatientEditor(p)}
                        >
                          Edit
                        </button>

                        {(p.status === 'Active' || p.status === 'Inactive') && (
                          <button
                            className="btn btn-sm btn-danger-o"
                            onClick={() => handleToggleStatus(p)}
                            disabled={updatingId === p.id}
                          >
                            {p.status === 'Active' ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
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
              <label className="field">Hospital<select value={registerForm.hospital} onChange={e => setRegisterForm(form => ({ ...form, hospital: e.target.value, primaryDoctor: '' }))}><option value="">Select hospital</option>{sortedHospitals.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}</select></label>
              <label className="field">Primary doctor<select value={registerForm.primaryDoctor} onChange={e => updateRegister('primaryDoctor', e.target.value)} disabled={!registerForm.hospital}><option value="">{registerForm.hospital ? 'Select doctor' : 'Select hospital first'}</option>{registerDoctors.map(doc => <option key={doc.id} value={doc.name}>{doc.name}</option>)}</select></label>
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

      {/* Edit Patient Modal */}
      {patientEditor && (
        <Modal
          open={Boolean(patientEditor)}
          title={`Edit Patient — ${patientEditor.name}`}
          size="lg"
          onClose={() => setPatientEditor(null)}
        >
          <form className="stack" onSubmit={handlePatientEditSave}>
            {patientEditError && <div className="alert err" role="alert">{patientEditError}</div>}
            <div className="grid-2">
              <label className="field">Full name<input value={patientEditForm.name} onChange={e => setPatientEditForm({ ...patientEditForm, name: e.target.value })} /></label>
              <label className="field">Email<input type="email" value={patientEditForm.email} onChange={e => setPatientEditForm({ ...patientEditForm, email: e.target.value })} /></label>
              <label className="field">Phone<input value={patientEditForm.phone} onChange={e => setPatientEditForm({ ...patientEditForm, phone: e.target.value })} /></label>
              <label className="field">Status<select value={patientEditForm.status} onChange={e => setPatientEditForm({ ...patientEditForm, status: e.target.value })}><option>Active</option><option>Inactive</option></select></label>
              <label className="field">Date of birth<input type="date" value={patientEditForm.dob} onChange={e => setPatientEditForm({ ...patientEditForm, dob: e.target.value })} /></label>
              <label className="field">Age<input type="number" min="0" value={patientEditForm.age} onChange={e => setPatientEditForm({ ...patientEditForm, age: e.target.value })} /></label>
              <label className="field">Gender<select value={patientEditForm.gender} onChange={e => setPatientEditForm({ ...patientEditForm, gender: e.target.value })}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select></label>
              <label className="field">Blood group<input value={patientEditForm.bloodGroup} onChange={e => setPatientEditForm({ ...patientEditForm, bloodGroup: e.target.value })} /></label>
              <label className="field">Height (cm)<input type="number" min="0" value={patientEditForm.heightCm} onChange={e => setPatientEditForm({ ...patientEditForm, heightCm: e.target.value })} /></label>
              <label className="field">Weight (kg)<input type="number" min="0" value={patientEditForm.weightKg} onChange={e => setPatientEditForm({ ...patientEditForm, weightKg: e.target.value })} /></label>
              <label className="field">Risk category<select value={patientEditForm.riskCategory} onChange={e => setPatientEditForm({ ...patientEditForm, riskCategory: e.target.value })}><option>Low</option><option>Moderate</option><option>High</option></select></label>
              <label className="field">Hospital<select value={patientEditForm.hospital} onChange={e => setPatientEditForm(form => ({ ...form, hospital: e.target.value, primaryDoctor: '' }))}><option value="">Select hospital</option>{sortedHospitals.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}</select></label>
              <label className="field">Primary doctor<select value={patientEditForm.primaryDoctor} onChange={e => setPatientEditForm({ ...patientEditForm, primaryDoctor: e.target.value })} disabled={!patientEditForm.hospital}><option value="">{patientEditForm.hospital ? 'Select doctor' : 'Select hospital first'}</option>{editDoctors.map(doc => <option key={doc.id} value={doc.name}>{doc.name}</option>)}</select></label>
              <label className="field wide">Address<textarea rows={2} value={patientEditForm.address} onChange={e => setPatientEditForm({ ...patientEditForm, address: e.target.value })} /></label>
              <label className="field">Health card number<input value={patientEditForm.healthCardNumber} onChange={e => setPatientEditForm({ ...patientEditForm, healthCardNumber: e.target.value })} /></label>
              <label className="field">Insurance provider<input value={patientEditForm.insuranceProvider} onChange={e => setPatientEditForm({ ...patientEditForm, insuranceProvider: e.target.value })} /></label>
              <label className="field wide">Insurance policy<input value={patientEditForm.insurancePolicy} onChange={e => setPatientEditForm({ ...patientEditForm, insurancePolicy: e.target.value })} /></label>
            </div>
            <div className="row end">
              <button type="button" className="btn" onClick={() => setPatientEditor(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={savingPatientEdit}>{savingPatientEdit ? 'Saving…' : 'Save Changes'}</button>
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
              <Avatar name={inspectPatient.name} size={52} src={inspectPatient.profilePicture} />
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
              <dd>{inspectPatient.registeredDate || 'Not recorded'}</dd>

              <dt>Health Card Number</dt>
              <dd><code>{inspectPatient.healthCardNumber || 'Not on file'}</code></dd>
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
