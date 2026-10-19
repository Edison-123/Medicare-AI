import { useState } from 'react'
import {
  Calendar,
  Stethoscope,
  Printer,
  ArrowRight,
  Activity,
} from 'lucide-react'
import { patientApi } from '../../services/api'
import { useAsync } from '../../hooks'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import {
  Card,
  PageHeader,
  LoadingState,
  ErrorState,
  EmptyState,
  Modal
} from '../../components/common/ui'

/*
 * The backend currently returns patientInstructions as a String.
 * The UI expects an Array<String>.
 *
 * This helper supports:
 * 1. A real JavaScript array
 * 2. A JSON array stored as a string
 * 3. A comma-separated string
 * 4. An empty/null value
 */
const normalizePatientInstructions = (value) => {
  if (Array.isArray(value)) {
    return value
  }

  if (typeof value !== 'string' || !value.trim()) {
    return []
  }

  const trimmed = value.trim()

  // Example:
  // '["Instruction 1","Instruction 2"]'
  try {
    const parsed = JSON.parse(trimmed)

    if (Array.isArray(parsed)) {
      return parsed
    }
  } catch {
    // Not JSON. Continue as normal text.
  }

  // Current backend format:
  // "Instruction 1, Instruction 2, Instruction 3"
  return trimmed
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

const getVisitForm = visit => {
  if (visit?.form && typeof visit.form === 'object') return visit.form
  if (typeof visit?.clinicalFormJson !== 'string' || !visit.clinicalFormJson.trim()) return {}
  try {
    const parsed = JSON.parse(visit.clinicalFormJson)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

const formatVitals = vitals => {
  if (typeof vitals === 'string') return vitals.trim()
  if (!vitals || typeof vitals !== 'object') return ''
  return [
    vitals.bp && `BP ${vitals.bp}`,
    vitals.hr && `HR ${vitals.hr}`,
    vitals.temp && `Temp ${vitals.temp}`,
    vitals.spo2 && `SpO2 ${vitals.spo2}`
  ].filter(Boolean).join(' · ')
}

export default function PatientVisitSummaries() {
  const { user } = useAuth()
  const {
    data: summaries,
    loading,
    error,
    reload
  } = useAsync(patientApi.getVisitSummaries)

  const [selectedVisit, setSelectedVisit] = useState(null)
  const [activeVisitKey, setActiveVisitKey] = useState(null)
  const [filterSpecialty, setFilterSpecialty] = useState('All')
  const toast = useToast()

  const handlePrint = () => {
    toast.info('Opening print dialog for official aftercare summary…')
    window.print()
  }

  const visitSummaries = Array.isArray(summaries)
    ? summaries
    : []

  const filteredSummaries =
    filterSpecialty === 'All'
      ? visitSummaries
      : visitSummaries.filter(
          s =>
            s.specialty
              ?.toLowerCase()
              .includes(filterSpecialty.toLowerCase())
        )

  const specialties = ['All', ...new Set(visitSummaries.map(visit => visit.specialty?.trim()).filter(Boolean))]
  const visitKey = (visit, index) => String(visit.id ?? `${visit.date}-${index}`)
  const activeVisit = filteredSummaries.find((visit, index) => visitKey(visit, index) === activeVisitKey)
    || filteredSummaries[0]
    || null
  const activeForm = getVisitForm(activeVisit)
  const activeComplaint = activeVisit?.chiefComplaint || activeForm.chiefComplaint
  const activeNotes = activeVisit?.doctorNotes || activeForm.notes
  const activeVitals = activeVisit?.vitalsAtVisit || formatVitals(activeForm.vitals)
  const activeVisitInstructions = normalizePatientInstructions(activeVisit?.patientInstructions)
  const selectedForm = getVisitForm(selectedVisit)
  const selectedNotes = selectedVisit?.doctorNotes || selectedForm.notes
  const selectedVitals = selectedVisit?.vitalsAtVisit || formatVitals(selectedForm.vitals)
  const selectedInstructions = normalizePatientInstructions(selectedVisit?.patientInstructions)

  return (
    <>
      <PageHeader
        title="Visit Summaries"
        subtitle="Review notes and aftercare from your clinical visits."
        actions={
          <div className="row">
            <span
              style={{
                fontSize: '0.85rem',
                color: 'var(--muted)',
                background: '#fff',
                border: '1px solid var(--line)',
                padding: '6px 12px',
                borderRadius: 10
              }}
            >
              Total visits:{' '}
              <strong>{visitSummaries.length}</strong>
            </span>
          </div>
        }
      />

      {loading && (
        <LoadingState label="Loading your clinical journey…" />
      )}

      {error && (
        <ErrorState
          message={error}
          onRetry={reload}
        />
      )}

      {!loading && !error && visitSummaries.length > 0 && (
        <div className="tabs visit-summary-filters" role="tablist" aria-label="Filter visits by specialty">
          {specialties.map(specialty => (
            <button
              key={specialty}
              type="button"
              role="tab"
              aria-selected={filterSpecialty === specialty}
              className={filterSpecialty === specialty ? 'on' : ''}
              onClick={() => setFilterSpecialty(specialty)}
            >
              {specialty === 'All' ? 'All Visits' : specialty}
            </button>
          ))}
        </div>
      )}

      {!loading && !error && filteredSummaries.length === 0 && (
        <div>
          <EmptyState
            title={visitSummaries.length === 0 ? 'No visit summaries yet' : 'No visits match this specialty'}
            hint={visitSummaries.length === 0 ? 'Completed visit summaries will appear here when available.' : 'Choose another specialty filter to see more visits.'}
          />
        </div>
      )}

      {!loading && !error && filteredSummaries.length > 0 && (
          <div className="visit-history-layout">
            <nav className="visit-history-list" aria-label="Visit history">
              <div className="visit-history-list-heading">{filteredSummaries.length} visits</div>
              <div className="visit-history-items">
                {filteredSummaries.map((visit, index) => {
                  const key = visitKey(visit, index)
                  const active = visitKey(activeVisit, filteredSummaries.indexOf(activeVisit)) === key
                  const form = getVisitForm(visit)
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`visit-history-item${active ? ' active' : ''}`}
                      aria-current={active ? 'true' : undefined}
                      onClick={() => setActiveVisitKey(key)}
                    >
                      <span className="visit-history-date"><Calendar size={15} /> {visit.date || 'Date unavailable'}</span>
                      <span className="visit-history-doctor">{visit.doctorName || visit.doctor || 'Care team'}</span>
                      <span className="visit-history-specialty">{visit.specialty || 'General Medicine'}</span>
                      {(visit.chiefComplaint || form.chiefComplaint || form.diagnosis) &&
                        <span className="visit-history-complaint">{visit.chiefComplaint || form.chiefComplaint || form.diagnosis}</span>}
                      <ArrowRight className="visit-history-arrow" size={15} aria-hidden="true" />
                    </button>
                  )
                })}
              </div>
            </nav>

            {activeVisit ? (
              <section className="visit-summary-detail" aria-label="Selected visit summary">
                <Card
                  className="visit-summary-detail-card"
                  title="Visit details"
                  action={<button type="button" className="btn btn-sm" onClick={() => setSelectedVisit(activeVisit)}><Printer size={14} /> Print summary</button>}
                >
                  <div className="visit-summary-heading">
                    <div>
                      <strong>{activeVisit.date || 'Date unavailable'}</strong>
                      <span>{activeVisit.doctorName || activeVisit.doctor || 'Care team'}{activeVisit.specialty ? ` · ${activeVisit.specialty}` : ''}</span>
                    </div>
                    {activeVisit.type && <span className="tag">{activeVisit.type}</span>}
                  </div>

                  {activeComplaint && <section className="visit-summary-section">
                    <h3>Reason for visit</h3>
                    <p>{activeComplaint}</p>
                  </section>}

                  {activeVisit.keyTakeaway && <section className="visit-summary-takeaway">
                    <h3>Visit summary</h3>
                    <p>{activeVisit.keyTakeaway}</p>
                  </section>}

                  {(activeNotes || activeVitals || activeVisit.hospital || activeForm.symptoms || activeForm.diagnosis
                    || activeForm.exam || activeForm.medications || activeForm.investigations) && <dl className="visit-summary-facts">
                    {activeNotes && <div><dt>Clinical notes</dt><dd>{activeNotes}</dd></div>}
                    {activeVitals && <div><dt>Vitals at visit</dt><dd>{activeVitals}</dd></div>}
                    {activeVisit.hospital && <div><dt>Facility</dt><dd>{activeVisit.hospital}</dd></div>}
                    {activeForm.symptoms && <div><dt>Symptoms and history</dt><dd>{activeForm.symptoms}</dd></div>}
                    {activeForm.diagnosis && <div><dt>Diagnosis</dt><dd>{activeForm.diagnosis}</dd></div>}
                    {activeForm.exam && <div><dt>Examination</dt><dd>{activeForm.exam}</dd></div>}
                    {activeForm.medications && <div><dt>Medications</dt><dd>{activeForm.medications}</dd></div>}
                    {activeForm.investigations && <div><dt>Investigations</dt><dd>{activeForm.investigations}</dd></div>}
                  </dl>}

                  {activeForm.plan && <section className="visit-summary-section">
                    <h3>Treatment plan</h3>
                    <p>{activeForm.plan}</p>
                  </section>}

                  {activeVisitInstructions.length > 0 && <section className="visit-summary-section">
                    <h3>Aftercare instructions</h3>
                    <ul className="visit-instructions">
                      {activeVisitInstructions.map((instruction, index) => <li key={`${index}-${instruction}`}>{instruction}</li>)}
                    </ul>
                  </section>}

                  {activeForm.followUp && <section className="visit-summary-section">
                    <h3>Follow-up</h3>
                    <p>{activeForm.followUp}</p>
                  </section>}

                  {!activeVisit.keyTakeaway && !activeNotes && !activeVitals && !activeComplaint
                    && !activeVisit.hospital && !activeForm.symptoms && !activeForm.diagnosis && !activeForm.exam
                    && !activeForm.medications && !activeForm.investigations && !activeForm.plan && !activeForm.followUp
                    && activeVisitInstructions.length === 0 &&
                    <div className="visit-summary-empty">No additional details were recorded for this visit.</div>}
                </Card>
              </section>
            ) : <EmptyState title="Select a visit" hint="Choose a visit from your history to see its details." />}
          </div>
      )}

      {/* Printable Visit Aftercare Summary Modal */}
      {selectedVisit && (
        <Modal
          open={Boolean(selectedVisit)}
          title="Printable Consultation Aftercare Summary"
          size="lg"
          onClose={() => setSelectedVisit(null)}
        >
          {/* Top Action Bar for Immediate Access */}
          <div
            className="row end no-print"
            style={{
              marginBottom: 14,
              position: 'sticky',
              top: 0,
              zIndex: 10,
              background: '#fff',
              padding: '6px 0 10px',
              borderBottom: '1px solid var(--line)'
            }}
          >
            <button
              className="btn"
              onClick={() => setSelectedVisit(null)}
            >
              Close
            </button>

            <button
              className="btn btn-primary"
              onClick={handlePrint}
            >
              <Printer size={16} /> Print Instructions / Save PDF
            </button>
          </div>

          <div
            className="rx-paper modal-lg"
            style={{ margin: '0 auto' }}
          >
            <div className="rx-clinic-hdr">
              <div>
                <h2>MediCare Health System</h2>

                <div className="muted small">
                  {selectedVisit.hospital}
                </div>

                <div className="muted small">
                  Patient Outpatient Consultation Summary
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <strong>
                  Date: {selectedVisit.date}
                </strong>

                <div className="muted small">
                  Patient: {selectedVisit.patientName || user?.name || 'Patient'}
                </div>
              </div>
            </div>

            <div
              style={{
                marginBottom: 14,
                fontSize: '0.9rem'
              }}
            >
              <div>
                Attending Physician:{' '}
                <strong>
                  {selectedVisit.doctorName ||
                    selectedVisit.doctor ||
                    'Doctor'}
                </strong>{' '}
                {selectedVisit.specialty
                  ? `(${selectedVisit.specialty})`
                  : ''}
              </div>

              <div>
                Chief Complaint:{' '}
                <strong>
                  {selectedVisit.chiefComplaint ||
                    'Not recorded'}
                </strong>
              </div>

              <div>
                Clinical Vitals:{' '}
                <strong>
                  {selectedVitals || 'Not recorded'}
                </strong>
              </div>
            </div>

            {(selectedNotes || selectedForm.symptoms || selectedForm.diagnosis || selectedForm.exam
              || selectedForm.medications || selectedForm.investigations || selectedForm.plan) &&
              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid var(--line)', marginBottom: 16 }}>
                <strong>Clinical Assessment & Findings</strong>
                {selectedNotes && <p style={{ margin: '6px 0 0', fontSize: '0.9rem', lineHeight: 1.5 }}>{selectedNotes}</p>}
                {[['Symptoms and history', selectedForm.symptoms], ['Diagnosis', selectedForm.diagnosis],
                  ['Examination', selectedForm.exam], ['Medications', selectedForm.medications],
                  ['Investigations', selectedForm.investigations], ['Treatment plan', selectedForm.plan]]
                  .filter(([, value]) => value)
                  .map(([label, value]) => <p key={label} style={{ margin: '6px 0 0', fontSize: '0.9rem', lineHeight: 1.5 }}><b>{label}:</b> {value}</p>)}
              </div>}

            {(selectedInstructions.length > 0 || selectedForm.followUp) && <div
              style={{
                background: '#f0fdf4',
                padding: 14,
                borderRadius: 8,
                border: '1px solid #bbf7d0',
                marginBottom: 16
              }}
            >
              <strong style={{ color: '#166534' }}>
                Patient Home Instructions & Action Plan:
              </strong>

              {selectedInstructions.length > 0 && <ol
                style={{
                  margin: '8px 0 0',
                  paddingLeft: 20,
                  fontSize: '0.9rem',
                  lineHeight: 1.5
                }}
              >
                {selectedInstructions.map((inst, idx) => (
                  <li
                    key={idx}
                    style={{ marginBottom: 4 }}
                  >
                    {inst}
                  </li>
                ))}
              </ol>}
              {selectedForm.followUp && <p style={{ margin: '8px 0 0', fontSize: '0.9rem', lineHeight: 1.5 }}><b>Follow-up:</b> {selectedForm.followUp}</p>}
            </div>}

            <div
              className="row end no-print"
              style={{
                marginTop: 20,
                paddingTop: 14,
                borderTop: '1px solid var(--line)'
              }}
            >
              <button
                className="btn"
                onClick={() => setSelectedVisit(null)}
              >
                Close
              </button>

              <button
                className="btn btn-primary"
                onClick={handlePrint}
              >
                <Printer size={16} /> Print Instructions / Save PDF
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}