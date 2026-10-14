import { useState } from 'react'
import {
  Building2, Search, Plus, MapPin, CheckCircle2, ShieldCheck,
  Activity, Users, Stethoscope, Bed, Server
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

  // Add hospital modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({
    name: '',
    code: '',
    type: '',
    city: '',
    address: '',
    director: '',
    departmentsCount: '',
    doctorsCount: '',
    bedsTotal: ''
  })
  const [adding, setAdding] = useState(false)

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    if (!addForm.name.trim() || !addForm.code.trim()) return
    setAdding(true)
    try {
      await adminApi.addHospital(addForm)
      setShowAddModal(false)
      setAddForm({
        name: '',
        code: '',
        type: '',
        city: '',
        address: '',
        director: '',
        departmentsCount: '',
        doctorsCount: '',
        bedsTotal: ''
      })
      reload()
    } finally {
      setAdding(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Affiliated Hospital Network"
        subtitle="Manage certified clinical facilities, bed capacity, regional health integration nodes, and HL7/FHIR connectivity."
        actions={
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
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
          const hasCapacity = Number.isFinite(hosp.bedsOccupied) && Number.isFinite(hosp.bedsTotal) && hosp.bedsTotal > 0
          const occPct = hasCapacity ? Math.round((hosp.bedsOccupied / hosp.bedsTotal) * 100) : null
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
                    <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{hosp.doctorsCount ?? '—'}</div>
                  </div>
                  <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 8, padding: 10 }}>
                    <div className="muted small">Depts</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{hosp.departmentsCount ?? '—'}</div>
                  </div>
                  <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 8, padding: 10 }}>
                    <div className="muted small">Total Beds</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{hosp.bedsTotal ?? '—'}</div>
                  </div>
                </div>

                {/* Bed Occupancy Bar */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 4 }}>
                    <span>Bed Occupancy</span>
                    <strong>{hosp.bedsOccupied ?? '—'} of {hosp.bedsTotal ?? '—'} beds ({occPct === null ? 'N/A' : `${occPct}%`})</strong>
                  </div>
                  <div className="progress-bar-wrap">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${Math.min(100, Math.max(0, occPct ?? 0))}%`,
                        background: occPct !== null && occPct > 80 ? '#ef4444' : 'var(--primary)'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Footer Integration Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: 12, marginTop: 10, fontSize: '0.78rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: hosp.apiStatus === 'Not tested' ? 'var(--muted)' : 'var(--green)', fontWeight: 600 }}>
                  {hosp.apiStatus !== 'Not tested' && <span className="ping-indicator" />} {hosp.apiStatus}
                </span>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Add Hospital Modal */}
      {showAddModal && (
        <Modal
          open={showAddModal}
          title="Connect Affiliated Healthcare Facility"
          onClose={() => setShowAddModal(false)}
        >
          <form onSubmit={handleAddSubmit}>
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

            <div className="grid-2" style={{ marginBottom: 12 }}>
              <label className="field">
                Medical Director / Chief of Staff
                <input
                  type="text"
                  required
                  value={addForm.director}
                  onChange={e => setAddForm({ ...addForm, director: e.target.value })}
                />
              </label>

              <label className="field">
                Bed Capacity
                <input
                  type="number"
                  min="10"
                  max="2000"
                  value={addForm.bedsTotal}
                  onChange={e => setAddForm({ ...addForm, bedsTotal: Number(e.target.value) })}
                />
              </label>
            </div>

            <div className="grid-2" style={{ marginBottom: 16 }}>
              <label className="field">
                Clinical Departments
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={addForm.departmentsCount}
                  onChange={e => setAddForm({ ...addForm, departmentsCount: Number(e.target.value) })}
                />
              </label>

              <label className="field">
                Initial Doctors Count
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={addForm.doctorsCount}
                  onChange={e => setAddForm({ ...addForm, doctorsCount: Number(e.target.value) })}
                />
              </label>
            </div>

            <div className="row end">
              <button type="button" className="btn" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={adding}>
                {adding ? 'Connecting…' : 'Register Facility'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
