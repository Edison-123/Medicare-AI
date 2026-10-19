import { useState } from 'react'
import {
  Building2, Search, Plus, MapPin, ShieldCheck, Trash2, Pencil
} from 'lucide-react'
import { adminApi } from '../../services/api'
import { useAsync, useDebounced } from '../../hooks'
import {
  Card, PageHeader, StatusBadge, LoadingState, ErrorState,
  EmptyState, Modal
} from '../../components/common/ui'

export default function AdminHospitals() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search, 250)

  const { data: hospitals, loading, error, reload } = useAsync(
    () => adminApi.getHospitals({ q: debouncedSearch }),
    [debouncedSearch]
  )

  // Add and edit hospital modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingHospital, setEditingHospital] = useState(null)
  const [addForm, setAddForm] = useState({
    name: '',
    code: '',
    type: '',
    city: '',
    address: '',
    director: '',
    complianceCert: '',
    status: 'Active'
  })
  const [adding, setAdding] = useState(false)
  const [hospitalFormError, setHospitalFormError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const resetHospitalForm = () => setAddForm({
    name: '', code: '', type: '', city: '', address: '', director: '', complianceCert: '', status: 'Active'
  })

  const openAddHospital = () => {
    setEditingHospital(null)
    resetHospitalForm()
    setHospitalFormError('')
    setShowAddModal(true)
  }

  const openHospitalEditor = (hospital) => {
    setEditingHospital(hospital)
    setAddForm({
      name: hospital.name || '',
      code: hospital.code || '',
      type: hospital.type || '',
      city: hospital.city || '',
      address: hospital.address || '',
      director: hospital.director || '',
      complianceCert: hospital.complianceCert || '',
      status: hospital.status || 'Active'
    })
    setHospitalFormError('')
    setShowAddModal(true)
  }

  const handleHospitalSubmit = async (e) => {
    e.preventDefault()
    if (!addForm.name.trim() || !addForm.code.trim()) return
    setAdding(true)
    setHospitalFormError('')
    try {
      if (editingHospital) {
        await adminApi.updateHospital(editingHospital.id, addForm)
      } else {
        await adminApi.addHospital(addForm)
      }
      setShowAddModal(false)
      setEditingHospital(null)
      resetHospitalForm()
      reload()
    } catch (err) {
      setHospitalFormError(err.message || 'Unable to save hospital details.')
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteHospital = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError('')
    try {
      await adminApi.deleteHospital(deleteTarget.id)
      setDeleteTarget(null)
      reload()
    } catch (err) {
      setDeleteError(err.message || 'Unable to delete this hospital.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Affiliated Hospital Network"
        subtitle="Manage certified clinical facilities, regional health integration, and patient coverage."
        actions={
          <button className="btn btn-primary" onClick={openAddHospital}>
            <Plus size={15} /> Add Healthcare Facility
          </button>
        }
      />

      <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="row">
          <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            Total Network Facilities: <strong>{hospitals?.length || 0}</strong>
          </span>
        </div>

        <label className="search" style={{ minWidth: 280 }}>
          <Search size={16} />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search facility by name, code, or city…"
            aria-label="Search hospitals"
          />
        </label>
      </div>

      {loading && <LoadingState label="Connecting to regional hospital nodes…" />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {!loading && hospitals && hospitals.length === 0 && (
        <Card>
          <EmptyState
            title="No healthcare facilities found"
            hint="Try changing your search terms or register a new facility."
          />
        </Card>
      )}

      {/* Hospital Cards Grid */}
      <div className="grid-2">
        {hospitals && hospitals.map(hosp => {
          return (
            <Card key={hosp.id} style={{ padding: 22, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <Building2 size={20} color="var(--primary)" />
                      <strong style={{ fontSize: '1.15rem' }}>{hosp.name}</strong>
                    </div>
                    <div className="muted small">
                      Facility Code: <code>{hosp.code}</code> • {hosp.type}
                    </div>
                  </div>
                  <StatusBadge status={hosp.status} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--muted)', margin: '8px 0 12px' }}>
                  <MapPin size={15} /> {hosp.address || hosp.city || 'Address not configured'}
                </div>

                {/* Director & Accreditation */}
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, fontSize: '0.85rem', marginBottom: 14 }}>
                  <div>Medical Director: <strong>{hosp.director || 'Not configured'}</strong></div>
                  <div style={{ color: 'var(--primary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ShieldCheck size={14} /> {hosp.complianceCert}
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid-3" style={{ textAlign: 'center', marginBottom: 14 }}>
                  <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 8, padding: 10 }}>
                    <div className="muted small">Doctors</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{hosp.doctorCount ?? 0}</div>
                  </div>
                  <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 8, padding: 10 }}>
                    <div className="muted small">Depts</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{hosp.departmentCount ?? 0}</div>
                  </div>
                  <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 8, padding: 10 }}>
                    <div className="muted small">Patients</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{hosp.patientCount ?? 0}</div>
                  </div>
                </div>
              </div>

              {/* Footer actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, borderTop: '1px solid var(--line)', paddingTop: 12, marginTop: 10, fontSize: '0.78rem' }}>
                <button
                  className="btn btn-sm"
                  onClick={() => openHospitalEditor(hosp)}
                  aria-label={`Edit ${hosp.name}`}
                >
                  <Pencil size={14} /> Edit
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => { setDeleteError(''); setDeleteTarget(hosp) }}
                  aria-label={`Delete ${hosp.name}`}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Add Hospital Modal */}
      {showAddModal && (
        <Modal
          open={showAddModal}
          title={editingHospital ? `Edit ${editingHospital.name}` : 'Connect Affiliated Healthcare Facility'}
          onClose={() => { setShowAddModal(false); setEditingHospital(null) }}
        >
          <form onSubmit={handleHospitalSubmit}>
            {hospitalFormError && <div className="alert err" role="alert">{hospitalFormError}</div>}
            <div className="grid-2" style={{ marginBottom: 12 }}>
              <label className="field">
                Facility Name
                <input
                  type="text"
                  required
                  placeholder="Enter facility name"
                  value={addForm.name}
                  onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                />
              </label>

              <label className="field">
                Facility Code
                <input
                  type="text"
                  required
                  placeholder="Enter facility code"
                  value={addForm.code}
                  onChange={e => setAddForm({ ...addForm, code: e.target.value })}
                />
              </label>
            </div>

            <div className="grid-2" style={{ marginBottom: 12 }}>
              <label className="field">
                Facility Classification
                <select
                  value={addForm.type}
                  onChange={e => setAddForm({ ...addForm, type: e.target.value })}
                  required
                >
                  <option value="">Select facility type</option>
                  <option value="Tertiary Care Hospital">Tertiary Care Hospital</option>
                  <option value="Community Health Hospital">Community Health Hospital</option>
                  <option value="Specialty Medical Institute">Specialty Medical Institute</option>
                  <option value="Urgent Care Center">Urgent Care Center</option>
                  <option value="Outpatient Diagnostic Outpost">Outpatient Diagnostic Outpost</option>
                </select>
              </label>

              <label className="field">
                City / Region
                <input
                  type="text"
                  required
                  value={addForm.city}
                  onChange={e => setAddForm({ ...addForm, city: e.target.value })}
                />
              </label>

              <label className="field">
                Hospital Status
                <select value={addForm.status} onChange={e => setAddForm({ ...addForm, status: e.target.value })}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>
            </div>

            <label className="field" style={{ marginBottom: 12 }}>
              Street Address
              <input
                type="text"
                required
                placeholder="Enter street address"
                value={addForm.address}
                onChange={e => setAddForm({ ...addForm, address: e.target.value })}
              />
            </label>

            <label className="field" style={{ marginBottom: 12 }}>
                Medical Director / Chief of Staff
                <input
                  type="text"
                  required
                  value={addForm.director}
                  onChange={e => setAddForm({ ...addForm, director: e.target.value })}
                />
            </label>

            <label className="field" style={{ marginBottom: 16 }}>
              Compliance Certification
              <input
                type="text"
                value={addForm.complianceCert}
                onChange={e => setAddForm({ ...addForm, complianceCert: e.target.value })}
              />
            </label>

            <div className="row end">
              <button type="button" className="btn" onClick={() => { setShowAddModal(false); setEditingHospital(null) }}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={adding}>
                {adding ? 'Saving…' : editingHospital ? 'Save Changes' : 'Register Facility'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          open
          title="Delete hospital?"
          onClose={() => { if (!deleting) setDeleteTarget(null) }}
        >
          <p>Delete <strong>{deleteTarget.name}</strong> from the hospital network?</p>
          <p className="muted">Doctors and patients assigned to this hospital will be kept, but their status will be set to Inactive.</p>
          {deleteError && <p role="alert" style={{ color: 'var(--red)' }}>{deleteError}</p>}
          <div className="row end">
            <button type="button" className="btn" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button>
            <button type="button" className="btn btn-danger" onClick={handleDeleteHospital} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Confirm delete'}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
