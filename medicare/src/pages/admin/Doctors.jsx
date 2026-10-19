import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Stethoscope, Search, Plus, CheckCircle2, AlertTriangle, ShieldCheck,
  Building2, UserCheck, UserX, Star, FileText
} from 'lucide-react'
import { adminApi } from '../../services/api'
import { useAsync, useDebounced } from '../../hooks'
import {
  Card, PageHeader, StatusBadge, LoadingState, ErrorState,
  EmptyState, Modal, ConfirmationDialog, Avatar
} from '../../components/common/ui'

const DEPARTMENTS = [
  'All', 'Internal Medicine', 'Cardiology', 'Pediatrics',
  'Otolaryngology', 'Dermatology', 'Orthopedic', 'General'
]

export default function AdminDoctors() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [dept, setDept] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [departmentOptions, setDepartmentOptions] = useState(() => DEPARTMENTS.filter(name => name !== 'All'))
  const debouncedSearch = useDebounced(search, 250)

  const { data: doctors, loading, error, reload } = useAsync(
    () => adminApi.getDoctors({ q: debouncedSearch, department: dept, status: statusFilter }),
    [debouncedSearch, dept, statusFilter]
  )
  const { data: hospitals } = useAsync(adminApi.getHospitals)

  useEffect(() => {
    const existingDepartments = (doctors || []).map(doctor => doctor.specialization?.trim()).filter(Boolean)
    if (existingDepartments.length === 0) return
    setDepartmentOptions(current => {
      const unique = new Map(current.map(name => [name.toLowerCase(), name]))
      existingDepartments.forEach(name => unique.set(name.toLowerCase(), name))
      return [...unique.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    })
  }, [doctors])

  // Add doctor modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [showNewDepartment, setShowNewDepartment] = useState(false)
  const [newDepartment, setNewDepartment] = useState('')
  const [departmentError, setDepartmentError] = useState('')
  const [editDoc, setEditDoc] = useState(null)
  const [editForm, setEditForm] = useState({
    name: '', email: '', phone: '', specialization: '', hospital: '', licenseNumber: '', experienceYears: '', status: 'Active'
  })
  const [editDocError, setEditDocError] = useState('')
  const [savingDoctorEdit, setSavingDoctorEdit] = useState(false)
  useEffect(() => {
    if (searchParams.get('openAddDoctor') !== '1') return
    setShowAddModal(true)
    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.delete('openAddDoctor')
    setSearchParams(nextSearchParams, { replace: true })
  }, [searchParams, setSearchParams])

  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    specialization: '',
    hospital: '',
    license: '',
    experienceYears: ''
  })
  const [adding, setAdding] = useState(false)

  // Status transition target
  const [statusTarget, setStatusTarget] = useState(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // Inspect modal
  const [inspectDoc, setInspectDoc] = useState(null)

  const handleAddDepartment = () => {
    const name = newDepartment.trim()
    if (!name) {
      setDepartmentError('Enter a department name.')
      return
    }
    const existing = departmentOptions.find(option => option.toLowerCase() === name.toLowerCase())
    if (existing) {
      setAddForm(form => ({ ...form, specialization: existing }))
      setDepartmentError('That department already exists and has been selected.')
      return
    }
    setDepartmentOptions(options => [...options, name].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })))
    setAddForm(form => ({ ...form, specialization: name }))
    setNewDepartment('')
    setDepartmentError('')
    setShowNewDepartment(false)
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    if (!addForm.name.trim() || !addForm.email.trim()) return
    setAdding(true)
    try {
      await adminApi.addDoctor({ ...addForm, licenseNumber: addForm.license })
      setShowAddModal(false)
      setAddForm({
        name: '',
        email: '',
        specialization: '',
        hospital: '',
        license: '',
        experienceYears: ''
      })
      reload()
    } finally {
      setAdding(false)
    }
  }

  const openDoctorEditor = (doc) => {
    setEditDoc(doc)
    setEditDocError('')
    setEditForm({
      name: doc.name || '',
      email: doc.email || '',
      phone: doc.phone || '',
      specialization: doc.specialization || '',
      hospital: doc.hospital || '',
      licenseNumber: doc.licenseNumber || '',
      experienceYears: doc.experienceYears ?? '',
      status: doc.status || 'Active'
    })
  }

  const handleDoctorEditSave = async (e) => {
    e.preventDefault()
    if (!editDoc) return
    setSavingDoctorEdit(true)
    setEditDocError('')
    try {
      await adminApi.updateDoctor(editDoc.id, {
        ...editForm,
        experienceYears: editForm.experienceYears === '' ? null : Number(editForm.experienceYears),
        rating: editDoc.rating ?? 0,
        licenseNumber: editForm.licenseNumber || null
      })
      setEditDoc(null)
      reload()
    } catch (error) {
      setEditDocError(error.message || 'Could not update doctor details.')
    } finally {
      setSavingDoctorEdit(false)
    }
  }

  const handleStatusChange = async (doc, newStatus) => {
    setUpdatingStatus(true)
    try {
      await adminApi.updateDoctorStatus(doc.id, newStatus)
      setStatusTarget(null)
      reload()
    } finally {
      setUpdatingStatus(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Physician Management Directory"
        subtitle="Manage licensed doctors across all partner facilities, review credentials, and verify onboarding status."
        actions={
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={15} /> Add / Invite Doctor
          </button>
        }
      />

      {/* Toolbar filters */}
      <div className="toolbar" style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div className="row">
          <label className="field" style={{ minWidth: 160 }}>
            <select value={dept} onChange={e => setDept(e.target.value)} aria-label="Filter by department">
              {['All', ...departmentOptions].map(d => (
                <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>
              ))}
            </select>
          </label>

          <label className="field" style={{ minWidth: 150 }}>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Pending Approval">Pending Approval</option>
              <option value="Suspended">Suspended</option>
            </select>
          </label>
        </div>

        <label className="search" style={{ minWidth: 280, marginLeft: 'auto' }}>
          <Search size={16} />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by doctor, license, hospital…"
            aria-label="Search doctors"
          />
        </label>
      </div>

      {loading && <LoadingState label="Loading physician directory…" />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {!loading && doctors && doctors.length === 0 && (
        <Card>
          <EmptyState
            title="No physicians found"
            hint="Try adjusting your department, status, or search query."
          />
        </Card>
      )}

      {/* Doctors Table */}
      {doctors && doctors.length > 0 && (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Physician</th>
                  <th>Department & Hospital</th>
                  <th>License Number</th>
                  <th>Experience</th>
                  <th>Consultations</th>
                  <th>Rating</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {doctors.map(doc => (
                  <tr key={doc.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={doc.name} src={doc.profilePicture} />
                        <div>
                          <strong>{doc.name}</strong>
                          <div className="muted small">{doc.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{doc.specialization}</strong>
                      <div className="muted small">{doc.hospital}</div>
                    </td>
                    <td><code>{doc.licenseNumber || 'Not on file'}</code></td>
                    <td>{Number.isFinite(doc.experienceYears) ? `${doc.experienceYears} yrs` : 'Not recorded'}</td>
                    <td>{doc.consultsCount ?? 0}</td>
                    <td>
                      {doc.rating > 0 ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                          <Star size={14} fill="#f59e0b" color="#f59e0b" /> {doc.rating}
                        </span>
                      ) : (
                        <span className="muted small">New</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={doc.status} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="row end" style={{ justifyContent: 'center' }}>
                        <button
                          className="btn btn-sm"
                          onClick={() => openDoctorEditor(doc)}
                        >
                          Edit
                        </button>

                        <button
                          className="btn btn-sm"
                          onClick={() => setInspectDoc(doc)}
                        >
                          View
                        </button>

                        {doc.status === 'Pending Approval' && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleStatusChange(doc, 'Active')}
                            disabled={updatingStatus}
                          >
                            <UserCheck size={14} /> Approve
                          </button>
                        )}

                        {doc.status === 'Active' && (
                          <button
                            className="btn btn-sm btn-danger-o"
                            onClick={() => setStatusTarget({ doc, next: 'Suspended' })}
                          >
                            Suspend
                          </button>
                        )}

                        {doc.status === 'Suspended' && (
                          <button
                            className="btn btn-sm"
                            onClick={() => handleStatusChange(doc, 'Active')}
                            disabled={updatingStatus}
                          >
                            Reactivate
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

      {/* Add / Invite Doctor Modal */}
      {showAddModal && (
        <Modal
          open={showAddModal}
          title="Onboard New Physician to MediCare Platform"
          size="lg"
          onClose={() => setShowAddModal(false)}
        >
          <form className="doctor-form" onSubmit={handleAddSubmit}>
            <div className="grid-2" style={{ marginBottom: 12 }}>
              <label className="field">
                Doctor Full Name
                <input
                  type="text"
                  required
                  placeholder="Enter doctor's full name"
                  value={addForm.name}
                  onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                />
              </label>

              <label className="field">
                Work Email Address
                <input
                  type="email"
                  required
                  placeholder="name@organization.org"
                  value={addForm.email}
                  onChange={e => setAddForm({ ...addForm, email: e.target.value })}
                />
              </label>
            </div>

            <div className="grid-2" style={{ marginBottom: 12 }}>
              <div className="field">
                <span>Department / Specialization</span>
                <div className="row doctor-department-controls">
                  <select
                    required
                    aria-label="Department or specialization"
                    value={addForm.specialization}
                    onChange={e => setAddForm({ ...addForm, specialization: e.target.value })}
                  >
                    <option value="">Select a department</option>
                    {departmentOptions.map(option => <option key={option} value={option}>{option}</option>)}
                  </select>
                  <button type="button" className="btn btn-sm" onClick={() => { setShowNewDepartment(value => !value); setDepartmentError('') }}>
                    <Plus size={14} /> Add Department
                  </button>
                </div>
                {showNewDepartment && (
                  <div className="row doctor-department-controls">
                    <input
                      type="text"
                      aria-label="New department name"
                      placeholder="New department name"
                      value={newDepartment}
                      onChange={e => setNewDepartment(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddDepartment() } }}
                    />
                    <button type="button" className="btn btn-sm btn-primary" onClick={handleAddDepartment}>Add</button>
                  </div>
                )}
                {departmentError && <span className="small" role="alert" style={{ color: 'var(--red)' }}>{departmentError}</span>}
              </div>

              <label className="field">
                Hospital Affiliation
                <select
                  value={addForm.hospital}
                  onChange={e => setAddForm({ ...addForm, hospital: e.target.value })}
                  required
                >
                  <option value="">Select a hospital</option>
                  {(hospitals || []).map(hospital => (
                    <option key={hospital.id} value={hospital.name}>{hospital.name}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid-2" style={{ marginBottom: 16 }}>
              <label className="field">
                Medical License Registration #
                <input
                  type="text"
                  required
                  placeholder="Enter license number"
                  value={addForm.license}
                  onChange={e => setAddForm({ ...addForm, license: e.target.value })}
                />
              </label>

              <label className="field">
                Years of Clinical Experience
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={addForm.experienceYears}
                  onChange={e => setAddForm({ ...addForm, experienceYears: Number(e.target.value) })}
                />
              </label>
            </div>

            <div className="alert" style={{ marginBottom: 16 }}>
              <strong>Credential Verification:</strong> A temporary sign-in credential will be generated and dispatched to the physician's registered email with mandatory first-login 2FA setup.
            </div>

            <div className="row end">
              <button type="button" className="btn" onClick={() => { setShowAddModal(false); setShowNewDepartment(false); setDepartmentError('') }}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={adding}>
                {adding ? 'Onboarding…' : 'Register Physician'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Doctor Modal */}
      {editDoc && (
        <Modal
          open={Boolean(editDoc)}
          title={`Edit Physician — ${editDoc.name}`}
          size="lg"
          onClose={() => setEditDoc(null)}
        >
          <form className="stack" onSubmit={handleDoctorEditSave}>
            {editDocError && <div className="alert err" role="alert">{editDocError}</div>}
            <div className="grid-2">
              <label className="field">Full name<input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></label>
              <label className="field">Work email<input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></label>
              <label className="field">Phone<input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} /></label>
              <label className="field">Status<select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}><option>Active</option><option>Pending Approval</option><option>Suspended</option></select></label>
              <label className="field">Department<select value={editForm.specialization} onChange={e => setEditForm({ ...editForm, specialization: e.target.value })}>{['Internal Medicine', 'Cardiology', 'Pediatrics', 'Otolaryngology', 'Dermatology', 'Orthopedic', 'General'].map(option => <option key={option} value={option}>{option}</option>)}</select></label>
              <label className="field">Hospital<select value={editForm.hospital} onChange={e => setEditForm({ ...editForm, hospital: e.target.value })}>{(hospitals || []).map(hospital => <option key={hospital.id} value={hospital.name}>{hospital.name}</option>)}</select></label>
              <label className="field">License number<input value={editForm.licenseNumber} onChange={e => setEditForm({ ...editForm, licenseNumber: e.target.value })} /></label>
              <label className="field">Years of experience<input type="number" min="0" value={editForm.experienceYears} onChange={e => setEditForm({ ...editForm, experienceYears: e.target.value })} /></label>
            </div>
            <div className="row end">
              <button type="button" className="btn" onClick={() => setEditDoc(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={savingDoctorEdit}>{savingDoctorEdit ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Inspect Doctor Modal */}
      {inspectDoc && (
        <Modal
          open={Boolean(inspectDoc)}
          title={`Physician Profile — ${inspectDoc.name}`}
          onClose={() => setInspectDoc(null)}
        >
          <div className="stack">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar name={inspectDoc.name} size={56} src={inspectDoc.profilePicture} />
              <div>
                <strong style={{ fontSize: '1.2rem' }}>{inspectDoc.name}</strong>
                <div className="muted">{inspectDoc.specialization}</div>
                <div style={{ marginTop: 4 }}><StatusBadge status={inspectDoc.status} /></div>
              </div>
            </div>

            <div className="dl" style={{ background: '#f8fafc', padding: 14, borderRadius: 8 }}>
              <dt>License Registration</dt>
              <dd><code>{inspectDoc.licenseNumber || 'Not on file'}</code></dd>

              <dt>Affiliated Hospital</dt>
              <dd><strong>{inspectDoc.hospital}</strong></dd>

              <dt>Clinical Experience</dt>
              <dd>{Number.isFinite(inspectDoc.experienceYears) ? `${inspectDoc.experienceYears} years active practice` : 'Not recorded'}</dd>

              <dt>Consultations Done</dt>
              <dd>{inspectDoc.consultsCount ?? 0} verified consultations</dd>

              <dt>Patient Rating</dt>
              <dd>{inspectDoc.rating > 0 ? `★ ${inspectDoc.rating} / 5.0` : 'No reviews yet'}</dd>

              <dt>Account Registered</dt>
              <dd>{inspectDoc.joinedDate}</dd>
            </div>

            <div className="row end">
              <button className="btn" onClick={() => setInspectDoc(null)}>Close</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Dialog for Suspension */}
      {statusTarget && (
        <ConfirmationDialog
          open={Boolean(statusTarget)}
          title="Suspend Physician Access"
          message={`Are you sure you want to suspend clinical access for ${statusTarget.doc.name}? They will be unable to issue or finalize prescriptions until reactivated.`}
          confirmLabel={updatingStatus ? 'Suspending…' : 'Yes, Suspend Account'}
          onConfirm={() => handleStatusChange(statusTarget.doc, statusTarget.next)}
          onClose={() => setStatusTarget(null)}
        />
      )}
    </>
  )
}
