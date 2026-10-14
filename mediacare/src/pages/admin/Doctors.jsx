import { useState } from 'react'
import {
  Stethoscope, Search, Plus, CheckCircle2, AlertTriangle, ShieldCheck,
  Building2, UserCheck, UserX, Star, FileText
} from 'lucide-react'
import { adminApi } from '../../services/api'
import { useAsync, useDebounced } from '../../hooks'
import {
  Card, PageHeader, StatusBadge, LoadingState, ErrorState,
  EmptyState, Modal, ConfirmationDialog
} from '../../components/common/ui'

const DEPARTMENTS = [
  'All', 'Internal Medicine', 'Cardiology', 'Pediatrics',
  'Otolaryngology', 'Dermatology', 'Orthopedic', 'General'
]

export default function AdminDoctors() {
  const [search, setSearch] = useState('')
  const [dept, setDept] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const debouncedSearch = useDebounced(search, 250)

  const { data: doctors, loading, error, reload } = useAsync(
    () => adminApi.getDoctors({ q: debouncedSearch, department: dept, status: statusFilter }),
    [debouncedSearch, dept, statusFilter]
  )
  const { data: hospitals } = useAsync(adminApi.getHospitals)

  // Add doctor modal state
  const [showAddModal, setShowAddModal] = useState(false)
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
      <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div className="row">
          <label className="field" style={{ minWidth: 160 }}>
            <select value={dept} onChange={e => setDept(e.target.value)}>
              {DEPARTMENTS.map(d => (
                <option key={d} value={d}>Department: {d}</option>
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

        <label className="search" style={{ minWidth: 280 }}>
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
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {doctors.map(doc => (
                  <tr key={doc.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar" style={{ background: '#ede9fe', color: '#6d28d9' }}>
                          {doc.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                        </div>
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
                    <td style={{ textAlign: 'right' }}>
                      <div className="row end">
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
          onClose={() => setShowAddModal(false)}
        >
          <form onSubmit={handleAddSubmit}>
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
              <label className="field">
                Specialization / Field
                <input
                  type="text"
                  required
                  placeholder="Enter medical specialization"
                  value={addForm.specialization}
                  onChange={e => setAddForm({ ...addForm, specialization: e.target.value })}
                />
              </label>

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
              <button type="button" className="btn" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={adding}>
                {adding ? 'Onboarding…' : 'Register Physician'}
              </button>
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
              <div className="avatar" style={{ width: 56, height: 56, fontSize: '1.25rem', background: '#ede9fe', color: '#6d28d9' }}>
                {inspectDoc.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
              </div>
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
