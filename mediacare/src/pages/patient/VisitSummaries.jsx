import { useState } from 'react'
import {
  ClipboardList,
  Calendar,
  User,
  Stethoscope,
  Printer,
  CheckCircle2,
  Sparkles,
  FileText,
  ArrowRight,
  Heart,
  Activity,
  CheckSquare,
  Square,
  Filter
} from 'lucide-react'
import { patientApi } from '../../services/api'
import { useAsync } from '../../hooks'
import { useToast } from '../../context/ToastContext'
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

export default function PatientVisitSummaries() {
  const {
    data: summaries,
    loading,
    error,
    reload
  } = useAsync(patientApi.getVisitSummaries)

  const [selectedVisit, setSelectedVisit] = useState(null)
  const [filterSpecialty, setFilterSpecialty] = useState('All')
  const [completedSteps, setCompletedSteps] = useState({})

  const toast = useToast()

  const handlePrint = () => {
    toast.info('Opening print dialog for official aftercare summary…')
    window.print()
  }

  const toggleStep = (stepKey, stepText) => {
    setCompletedSteps(prev => {
      const nextState = !prev[stepKey]

      if (nextState) {
        toast.success(`Completed: ${stepText.slice(0, 30)}…`)
      }

      return {
        ...prev,
        [stepKey]: nextState
      }
    })
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

  const specialties = [
    'All',
    'Internal Medicine',
    'Pulmonology',
    'Otolaryngology'
  ]

  return (
    <>
      <PageHeader
        title="Clinical Journey & Visit Summaries"
        subtitle="Chronological medical milestones, physical exam findings, and interactive aftercare instructions."
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
              Total Milestones:{' '}
              <strong>{visitSummaries.length}</strong>
            </span>
          </div>
        }
      />

      {/* Filter Tabs */}
      <div
        className="toolbar"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20
        }}
      >
        <div className="tabs" style={{ margin: 0 }}>
          {specialties.map(spec => (
            <button
              key={spec}
              className={filterSpecialty === spec ? 'on' : ''}
              onClick={() => setFilterSpecialty(spec)}
            >
              {spec === 'All' ? 'All Clinical Visits' : spec}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <LoadingState label="Loading your clinical journey…" />
      )}

      {error && (
        <ErrorState
          message={error}
          onRetry={reload}
        />
      )}

      {!loading && filteredSummaries.length === 0 && (
        <Card>
          <EmptyState
            title="No consultation summaries found"
            hint="Try selecting 'All Clinical Visits' to view your complete medical history."
          />
        </Card>
      )}

      {/* Chronological Clinical Journey Timeline */}
      {filteredSummaries.length > 0 && (
        <div className="timeline-wrap">
          {filteredSummaries.map((visit, visitIdx) => {
            const patientInstructions =
              normalizePatientInstructions(
                visit.patientInstructions
              )

            return (
              <div
                key={visit.id ?? visitIdx}
                className="timeline-entry"
              >
                <div className="timeline-marker">
                  <Stethoscope size={16} />
                </div>

                <div className="timeline-card">

                  {/* Header */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: 10,
                      borderBottom: '1px solid var(--line)',
                      paddingBottom: 14
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 4
                        }}
                      >
                        <Calendar
                          size={18}
                          color="var(--primary)"
                        />

                        <strong
                          style={{
                            fontSize: '1.2rem',
                            color: 'var(--text)'
                          }}
                        >
                          {visit.date}
                        </strong>

                        <span
                          className="tag"
                          style={{
                            background: '#e0f2fe',
                            color: '#0369a1',
                            fontWeight: 600
                          }}
                        >
                          In-Person OPD Consultation
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: '0.92rem',
                          color: 'var(--text)'
                        }}
                      >
                        Attending Physician:{' '}
                        <strong>
                          {visit.doctorName ||
                            visit.doctor ||
                            'Doctor'}
                        </strong>{' '}
                        •{' '}
                        <span className="muted">
                          {visit.specialty || 'General Medicine'}
                          {visit.hospital
                            ? ` (${visit.hospital})`
                            : ''}
                        </span>
                      </div>

                      <div
                        className="muted small"
                        style={{ marginTop: 2 }}
                      >
                        Chief Complaint:{' '}
                        <strong
                          style={{ color: 'var(--text)' }}
                        >
                          {visit.chiefComplaint || 'Not recorded'}
                        </strong>
                      </div>
                    </div>

                    <button
                      className="btn btn-sm"
                      onClick={() =>
                        setSelectedVisit(visit)
                      }
                      title="View and print certified hospital summary"
                    >
                      <Printer size={14} /> Official Aftercare PDF
                    </button>
                  </div>

                  {/* Patient Friendly Key Takeaway */}
                  <div
                    style={{
                      margin: '16px 0',
                      background:
                        'linear-gradient(to right, #f0fdf4, #f8fafc)',
                      border: '1px solid #bbf7d0',
                      borderRadius: 10,
                      padding: 16
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        color: '#166534',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        marginBottom: 6
                      }}
                    >
                      <Sparkles size={16} />
                      WHAT THIS VISIT MEANS FOR YOU (PLAIN LANGUAGE)
                    </div>

                    <p
                      style={{
                        fontSize: '0.95rem',
                        color: '#14532d',
                        lineHeight: 1.55,
                        margin: 0
                      }}
                    >
                      {visit.keyTakeaway ||
                        'No summary available.'}
                    </p>
                  </div>

                  {/* Recorded Vitals & Clinical Context */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: 14,
                      marginBottom: 16
                    }}
                  >
                    <div
                      style={{
                        background: '#f8fafc',
                        padding: 12,
                        borderRadius: 8,
                        border:
                          '1px solid var(--line)'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontWeight: 600,
                          fontSize: '0.82rem',
                          color: 'var(--muted)',
                          marginBottom: 4
                        }}
                      >
                        <Activity
                          size={15}
                          color="var(--primary)"
                        />
                        RECORDED VITALS AT VISIT
                      </div>

                      <div
                        style={{
                          fontSize: '0.92rem',
                          fontWeight: 700,
                          color: 'var(--text)'
                        }}
                      >
                        {visit.vitalsAtVisit ||
                          'Not recorded'}
                      </div>
                    </div>

                    <div
                      style={{
                        background: '#f8fafc',
                        padding: 12,
                        borderRadius: 8,
                        border:
                          '1px solid var(--line)'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontWeight: 600,
                          fontSize: '0.82rem',
                          color: 'var(--muted)',
                          marginBottom: 4
                        }}
                      >
                        <Stethoscope
                          size={15}
                          color="var(--primary)"
                        />
                        CLINICAL IMPRESSION
                      </div>

                      <div
                        style={{
                          fontSize: '0.86rem',
                          color: 'var(--text)',
                          lineHeight: 1.4
                        }}
                      >
                        {visit.doctorNotes ||
                          'No clinical notes available.'}
                      </div>
                    </div>
                  </div>

                  {/* Patient Instructions Interactive Checklist */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 8
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: 'var(--muted)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}
                      >
                        Interactive Aftercare Action Steps
                      </div>

                      <span className="muted small">
                        Click checkmark to track completion
                      </span>
                    </div>

                    <ul
                      className="list"
                      style={{ gap: 8 }}
                    >
                      {patientInstructions.length === 0 ? (
                        <li
                          style={{
                            color: 'var(--muted)',
                            fontSize: '0.88rem',
                            padding: '6px 10px'
                          }}
                        >
                          No patient instructions recorded.
                        </li>
                      ) : (
                        patientInstructions.map(
                          (inst, i) => {
                            const stepKey = `${visit.id}-${i}`
                            const isDone =
                              Boolean(
                                completedSteps[stepKey]
                              )

                            return (
                              <li
                                key={i}
                                onClick={() =>
                                  toggleStep(
                                    stepKey,
                                    inst
                                  )
                                }
                                style={{
                                  display: 'flex',
                                  alignItems:
                                    'flex-start',
                                  gap: 10,
                                  fontSize:
                                    '0.88rem',
                                  cursor: 'pointer',
                                  padding:
                                    '6px 10px',
                                  borderRadius: 8,
                                  background:
                                    isDone
                                      ? '#f0fdf4'
                                      : 'transparent',
                                  transition:
                                    'background 0.15s ease'
                                }}
                              >
                                {isDone ? (
                                  <CheckSquare
                                    size={18}
                                    color="#16a34a"
                                    style={{
                                      flexShrink: 0,
                                      marginTop: 2
                                    }}
                                  />
                                ) : (
                                  <Square
                                    size={18}
                                    color="var(--muted)"
                                    style={{
                                      flexShrink: 0,
                                      marginTop: 2
                                    }}
                                  />
                                )}

                                <span
                                  style={{
                                    textDecoration:
                                      isDone
                                        ? 'line-through'
                                        : 'none',
                                    color: isDone
                                      ? 'var(--muted)'
                                      : 'var(--text)'
                                  }}
                                >
                                  {inst}
                                </span>
                              </li>
                            )
                          }
                        )
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )
          })}
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
                  Patient: John Doe (42y)
                </div>

                <div className="muted small">
                  Ref: MC-ENC-88391
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
                  {selectedVisit.vitalsAtVisit ||
                    'Not recorded'}
                </strong>
              </div>
            </div>

            <div
              style={{
                background: '#f8fafc',
                padding: 14,
                borderRadius: 8,
                border: '1px solid var(--line)',
                marginBottom: 16
              }}
            >
              <strong>
                Clinical Assessment & Findings:
              </strong>

              <p
                style={{
                  margin: '6px 0 0',
                  fontSize: '0.9rem',
                  lineHeight: 1.5
                }}
              >
                {selectedVisit.doctorNotes ||
                  'No clinical notes available.'}
              </p>
            </div>

            <div
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

              <ol
                style={{
                  margin: '8px 0 0',
                  paddingLeft: 20,
                  fontSize: '0.9rem',
                  lineHeight: 1.5
                }}
              >
                {normalizePatientInstructions(
                  selectedVisit.patientInstructions
                ).map((inst, idx) => (
                  <li
                    key={idx}
                    style={{ marginBottom: 4 }}
                  >
                    {inst}
                  </li>
                ))}
              </ol>
            </div>

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