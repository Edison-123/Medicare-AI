import { useState } from 'react'
import {
  FolderHeart, AlertTriangle, Activity, Shield, FileText, Upload,
  Plus, CheckCircle2, Download, Eye, Calendar, User, HeartPulse
} from 'lucide-react'
import { patientApi } from '../../services/api'
import { useAsync } from '../../hooks'
import {
  Card, PageHeader, StatusBadge, LoadingState, ErrorState,
  Modal, ConfirmationDialog
} from '../../components/common/ui'

export default function PatientMedicalRecords() {
  const { data: records, loading, error, reload } = useAsync(patientApi.getMedicalRecords)
  const [activeTab, setActiveTab] = useState('allergies')

  // Modals state
  const [showAddAllergy, setShowAddAllergy] = useState(false)
  const [allergyForm, setAllergyForm] = useState({ allergen: '', severity: 'Moderate', reaction: '', diagnosedYear: '2026' })
  const [addingAllergy, setAddingAllergy] = useState(false)

  const [showAddCondition, setShowAddCondition] = useState(false)
  const [conditionForm, setConditionForm] = useState({ condition: '', icd10: '', status: 'Controlled', managementPlan: '' })
  const [addingCondition, setAddingCondition] = useState(false)

  const [showUploadDoc, setShowUploadDoc] = useState(false)
  const [docForm, setDocForm] = useState({ name: '', category: 'General', provider: 'MediCare Diagnostics' })
  const [uploadingDoc, setUploadingDoc] = useState(false)

  const handleAddAllergy = async (e) => {
    e.preventDefault()
    if (!allergyForm.allergen.trim()) return
    setAddingAllergy(true)
    try {
      await patientApi.addAllergy(allergyForm)
      setShowAddAllergy(false)
      setAllergyForm({ allergen: '', severity: 'Moderate', reaction: '', diagnosedYear: '2026' })
      reload()
    } finally {
      setAddingAllergy(false)
    }
  }

  const handleAddCondition = async (e) => {
    e.preventDefault()
    if (!conditionForm.condition.trim()) return
    setAddingCondition(true)
    try {
      await patientApi.addCondition(conditionForm)
      setShowAddCondition(false)
      setConditionForm({ condition: '', icd10: '', status: 'Controlled', managementPlan: '' })
      reload()
    } finally {
      setAddingCondition(false)
    }
  }

  const handleUploadDoc = async (e) => {
    e.preventDefault()
    if (!docForm.name.trim()) return
    setUploadingDoc(true)
    try {
      await patientApi.uploadDocument({ ...docForm, size: '1.5 MB' })
      setShowUploadDoc(false)
      setDocForm({ name: '', category: 'General', provider: 'MediCare Diagnostics' })
      reload()
    } finally {
      setUploadingDoc(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Electronic Medical Records (EMR)"
        subtitle="Your centralized health record: allergies, ongoing diagnoses, immunizations, and clinical documentation."
        actions={
          <div className="row">
            <button className="btn" onClick={() => setShowUploadDoc(true)}>
              <Upload size={15} /> Upload Health Record
            </button>
            <button className="btn btn-primary" onClick={() => setShowAddAllergy(true)}>
              <Plus size={15} /> Report New Allergy
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="tabs">
        <button className={activeTab === 'allergies' ? 'on' : ''} onClick={() => setActiveTab('allergies')}>
          Allergies & Contraindications ({records?.allergies.length || 0})
        </button>
        <button className={activeTab === 'conditions' ? 'on' : ''} onClick={() => setActiveTab('conditions')}>
          Chronic Conditions ({records?.chronicConditions.length || 0})
        </button>
        <button className={activeTab === 'vaccines' ? 'on' : ''} onClick={() => setActiveTab('vaccines')}>
          Immunizations ({records?.vaccinations.length || 0})
        </button>
        <button className={activeTab === 'history' ? 'on' : ''} onClick={() => setActiveTab('history')}>
          Surgical & Family History
        </button>
        <button className={activeTab === 'docs' ? 'on' : ''} onClick={() => setActiveTab('docs')}>
          Documents & Scans ({records?.documents.length || 0})
        </button>
      </div>

      {loading && <LoadingState label="Loading medical history files…" />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {records && (
        <div className="stack">
          {/* ALLERGIES TAB */}
          {activeTab === 'allergies' && (
            <Card
              title="Verified Allergies & Adverse Drug Reactions"
              action={
                <button className="btn btn-sm btn-primary" onClick={() => setShowAddAllergy(true)}>
                  <Plus size={14} /> Add Allergy
                </button>
              }
            >
              <div className="alert err" style={{ marginBottom: 16 }}>
                <strong>Critical Clinical Safety Note:</strong> Allergies listed here are automatically checked by the MediCare AI engine to prevent prescription adverse interactions.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
                {records.allergies.map(alg => (
                  <div key={alg.id} style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 16, background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AlertTriangle size={18} color={alg.severity === 'Severe' ? 'var(--red)' : '#f59e0b'} />
                        <strong style={{ fontSize: '1rem' }}>{alg.allergen}</strong>
                      </div>
                      <span className={`badge badge-${alg.severity === 'Severe' ? 'red' : 'orange'}`}>
                        {alg.severity} Severity
                      </span>
                    </div>

                    <div style={{ fontSize: '0.88rem', margin: '8px 0' }}>
                      <span className="muted">Reported Reaction: </span>
                      <strong>{alg.reaction}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--muted)', borderTop: '1px solid var(--line)', paddingTop: 8, marginTop: 8 }}>
                      <span>Onset / Identified: <strong>{alg.diagnosedYear}</strong></span>
                      <span>Verified: <strong>{alg.verifiedBy}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* CHRONIC CONDITIONS TAB */}
          {activeTab === 'conditions' && (
            <Card
              title="Ongoing Conditions & Diagnoses"
              action={
                <button className="btn btn-sm btn-primary" onClick={() => setShowAddCondition(true)}>
                  <Plus size={14} /> Add Condition
                </button>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {records.chronicConditions.map(cnd => (
                  <div key={cnd.id} style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 16, background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <HeartPulse size={20} color="var(--primary)" />
                          <strong style={{ fontSize: '1.05rem' }}>{cnd.condition}</strong>
                          {cnd.icd10 && <span className="tag">{cnd.icd10}</span>}
                        </div>
                        <div className="muted small" style={{ marginTop: 4 }}>
                          Diagnosed: <strong>{cnd.diagnosedDate}</strong> • Primary Physician: <strong>{cnd.doctor}</strong>
                        </div>
                      </div>
                      <StatusBadge status={cnd.status} />
                    </div>

                    <div style={{ marginTop: 12, background: '#f8fafc', padding: '10px 14px', borderRadius: 8, fontSize: '0.85rem' }}>
                      <span className="muted">Care Management Protocol: </span>
                      <strong>{cnd.managementPlan}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* VACCINATIONS TAB */}
          {activeTab === 'vaccines' && (
            <Card title="Immunization Record & Preventive Vaccines">
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Vaccine Name</th>
                      <th>Administration Date</th>
                      <th>Healthcare Provider</th>
                      <th>Lot / Batch #</th>
                      <th>Verification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.vaccinations.map(vax => (
                      <tr key={vax.id}>
                        <td><strong>{vax.name}</strong></td>
                        <td>{vax.date}</td>
                        <td>{vax.provider}</td>
                        <td><code>{vax.batch}</code></td>
                        <td>
                          <span style={{ color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.82rem', fontWeight: 600 }}>
                            <CheckCircle2 size={15} /> Verified
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* SURGICAL & FAMILY HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="grid-2">
              <Card title="Past Surgeries & Procedures">
                {records.surgeries.map(s => (
                  <div key={s.id} style={{ borderBottom: '1px solid var(--line)', padding: '10px 0' }}>
                    <strong>{s.procedure}</strong>
                    <div className="muted small">Date: {s.date} • {s.hospital}</div>
                    <div className="muted small">Surgeon: {s.surgeon}</div>
                  </div>
                ))}
              </Card>

              <Card title="Family Health History">
                {records.familyHistory.map((f, i) => (
                  <div key={i} style={{ borderBottom: '1px solid var(--line)', padding: '10px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{f.relation}</strong>
                      <span className="muted small">Onset age ~{f.ageOnset}y</span>
                    </div>
                    <div style={{ fontSize: '0.88rem', color: 'var(--text)' }}>{f.condition}</div>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {/* DOCUMENTS & SCANS TAB */}
          {activeTab === 'docs' && (
            <Card
              title="Health Documents & Radiology Scans"
              action={
                <button className="btn btn-sm btn-primary" onClick={() => setShowUploadDoc(true)}>
                  <Upload size={14} /> Upload File
                </button>
              }
            >
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Document Title</th>
                      <th>Category</th>
                      <th>Date Added</th>
                      <th>Facility / Provider</th>
                      <th>Size</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.documents.map(doc => (
                      <tr key={doc.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FileText size={18} color="var(--primary)" />
                            <strong>{doc.name}</strong>
                          </div>
                        </td>
                        <td><span className="tag">{doc.category}</span></td>
                        <td>{doc.date}</td>
                        <td>{doc.provider}</td>
                        <td>{doc.size}</td>
                        <td>
                          <button
                            className="btn btn-sm"
                            onClick={() => alert(`Opening ${doc.name} (Simulated digital preview)`)}
                          >
                            <Download size={13} /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Add Allergy Modal */}
      {showAddAllergy && (
        <Modal
          open={showAddAllergy}
          title="Record Known Allergy or Drug Sensitivity"
          onClose={() => setShowAddAllergy(false)}
        >
          <form onSubmit={handleAddAllergy}>
            <label className="field" style={{ marginBottom: 12 }}>
              Allergen / Drug Name
              <input
                type="text"
                required
                placeholder="e.g., Penicillin, Ibuprofen, Peanuts"
                value={allergyForm.allergen}
                onChange={e => setAllergyForm({ ...allergyForm, allergen: e.target.value })}
              />
            </label>

            <div className="grid-2" style={{ marginBottom: 12 }}>
              <label className="field">
                Severity
                <select
                  value={allergyForm.severity}
                  onChange={e => setAllergyForm({ ...allergyForm, severity: e.target.value })}
                >
                  <option value="Severe">Severe (Anaphylaxis, airway closing)</option>
                  <option value="Moderate">Moderate (Rash, hives, fever)</option>
                  <option value="Mild">Mild (GI upset, itching)</option>
                </select>
              </label>

              <label className="field">
                Year Identified
                <input
                  type="text"
                  value={allergyForm.diagnosedYear}
                  onChange={e => setAllergyForm({ ...allergyForm, diagnosedYear: e.target.value })}
                />
              </label>
            </div>

            <label className="field" style={{ marginBottom: 16 }}>
              Observed Reaction Symptoms
              <textarea
                rows={3}
                placeholder="Describe what occurs upon exposure..."
                value={allergyForm.reaction}
                onChange={e => setAllergyForm({ ...allergyForm, reaction: e.target.value })}
              />
            </label>

            <div className="row end">
              <button type="button" className="btn" onClick={() => setShowAddAllergy(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={addingAllergy}>
                {addingAllergy ? 'Saving…' : 'Save to Health Record'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Condition Modal */}
      {showAddCondition && (
        <Modal
          open={showAddCondition}
          title="Add Chronic Condition / Diagnosis"
          onClose={() => setShowAddCondition(false)}
        >
          <form onSubmit={handleAddCondition}>
            <label className="field" style={{ marginBottom: 12 }}>
              Condition / Diagnosis
              <input
                type="text"
                required
                placeholder="e.g., Bronchial Asthma, Type 2 Diabetes"
                value={conditionForm.condition}
                onChange={e => setConditionForm({ ...conditionForm, condition: e.target.value })}
              />
            </label>

            <div className="grid-2" style={{ marginBottom: 12 }}>
              <label className="field">
                Current Status
                <select
                  value={conditionForm.status}
                  onChange={e => setConditionForm({ ...conditionForm, status: e.target.value })}
                >
                  <option value="Controlled">Controlled</option>
                  <option value="In Progress">Active Treatment</option>
                  <option value="Follow-up">Requires Review</option>
                </select>
              </label>

              <label className="field">
                ICD-10 Code (optional)
                <input
                  type="text"
                  placeholder="e.g., J45.9"
                  value={conditionForm.icd10}
                  onChange={e => setConditionForm({ ...conditionForm, icd10: e.target.value })}
                />
              </label>
            </div>

            <label className="field" style={{ marginBottom: 16 }}>
              Management Protocol
              <textarea
                rows={3}
                placeholder="Medications, diet adjustments, or lifestyle guidelines..."
                value={conditionForm.managementPlan}
                onChange={e => setConditionForm({ ...conditionForm, managementPlan: e.target.value })}
              />
            </label>

            <div className="row end">
              <button type="button" className="btn" onClick={() => setShowAddCondition(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={addingCondition}>
                {addingCondition ? 'Adding…' : 'Add Condition'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Upload Document Modal */}
      {showUploadDoc && (
        <Modal
          open={showUploadDoc}
          title="Upload Medical Record / Scan"
          onClose={() => setShowUploadDoc(false)}
        >
          <form onSubmit={handleUploadDoc}>
            <label className="field" style={{ marginBottom: 12 }}>
              Document Name / Title
              <input
                type="text"
                required
                placeholder="e.g., MRI_Lumbar_Spine_Report.pdf"
                value={docForm.name}
                onChange={e => setDocForm({ ...docForm, name: e.target.value })}
              />
            </label>

            <div className="grid-2" style={{ marginBottom: 12 }}>
              <label className="field">
                Category
                <select
                  value={docForm.category}
                  onChange={e => setDocForm({ ...docForm, category: e.target.value })}
                >
                  <option value="Cardiology">Cardiology</option>
                  <option value="Laboratory">Laboratory</option>
                  <option value="Radiology">Radiology / Imaging</option>
                  <option value="Discharge">Hospital Discharge</option>
                  <option value="General">General / Other</option>
                </select>
              </label>

              <label className="field">
                Diagnostic Provider / Facility
                <input
                  type="text"
                  value={docForm.provider}
                  onChange={e => setDocForm({ ...docForm, provider: e.target.value })}
                />
              </label>
            </div>

            <div style={{ border: '2px dashed var(--line)', padding: 24, borderRadius: 10, textAlign: 'center', marginBottom: 16, background: '#fafbfc' }}>
              <Upload size={28} color="var(--primary)" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Select PDF or image file</div>
              <div className="muted small">Supports PDF, PNG, JPG up to 25 MB</div>
              <input type="file" style={{ marginTop: 10 }} />
            </div>

            <div className="row end">
              <button type="button" className="btn" onClick={() => setShowUploadDoc(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={uploadingDoc}>
                {uploadingDoc ? 'Uploading…' : 'Save Document'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
