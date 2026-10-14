import { useState } from 'react'
import {
  FlaskConical, Calendar, Download, Printer, Plus, CheckCircle2,
  AlertCircle, ShieldCheck, Activity, Eye
} from 'lucide-react'
import { patientApi } from '../../services/api'
import { useAsync } from '../../hooks'
import { useAuth } from '../../context/AuthContext'
import {
  Card, PageHeader, StatusBadge, LoadingState, ErrorState,
  Modal, EmptyState
} from '../../components/common/ui'

export default function PatientLabTests() {
  const { user } = useAuth()
  const { data: tests, loading, error, reload } = useAsync(patientApi.getLabTests)
  const [selectedTest, setSelectedTest] = useState(null)

  // Book lab test state
  const [showBookModal, setShowBookModal] = useState(false)
  const [bookingForm, setBookingForm] = useState({
    testName: '',
    category: '',
    date: '',
    facility: ''
  })
  const [booking, setBooking] = useState(false)

  const handleBook = async (e) => {
    e.preventDefault()
    setBooking(true)
    try {
      await patientApi.bookLabTest(bookingForm)
      setShowBookModal(false)
      reload()
    } finally {
      setBooking(false)
    }
  }

  // Helper to compute range indicator position percent
  const getPositionPercent = (val, min, max) => {
    if (min === 0) return Math.min(100, Math.max(0, (val / (max * 1.3)) * 100))
    const span = max - min
    const pct = ((val - (min - span * 0.2)) / (span * 1.4)) * 100
    return Math.min(100, Math.max(0, pct))
  }

  return (
    <>
      <PageHeader
        title="Diagnostic & Lab Test Results"
        subtitle="Access your certified diagnostic laboratory reports, clinical reference ranges, and doctor evaluations."
        actions={
          <button className="btn btn-primary" onClick={() => setShowBookModal(true)}>
            <Plus size={15} /> Book Diagnostic Test
          </button>
        }
      />

      {loading && <LoadingState label="Loading lab test results…" />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {tests && (
        <div className="stack">
          {tests.map(test => (
            <Card key={test.id} style={{ padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, borderBottom: '1px solid var(--line)', paddingBottom: 14 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <FlaskConical size={20} color="var(--primary)" />
                    <strong style={{ fontSize: '1.15rem' }}>{test.testName}</strong>
                    <span className="tag">{test.category}</span>
                    <StatusBadge status={test.status} />
                  </div>
                  <div className="muted small">
                    Sample Date: <strong>{test.date}</strong> • Facility: <strong>{test.facility}</strong> • Ordered by: <strong>{test.orderingDoctor}</strong>
                  </div>
                </div>

                <div className="row">
                  <button
                    className="btn btn-sm"
                    onClick={() => setSelectedTest(test)}
                  >
                    <Download size={14} /> Full Official Report
                  </button>
                </div>
              </div>

              {/* Doctor's Comment */}
              {test.doctorComment && (
                <div style={{ margin: '14px 0', background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid var(--line)', fontSize: '0.88rem' }}>
                  <span className="muted">Physician Review: </span>
                  <strong>{test.doctorComment}</strong>
                </div>
              )}

              {/* Analytes Breakdown with Visual Range Bars */}
              {test.analytes.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                    Component Biomarkers & Reference Ranges
                  </div>
                  <div className="table-wrap">
                    <table className="table" style={{ fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th>Biomarker</th>
                          <th>Measured Result</th>
                          <th>Reference Interval</th>
                          <th style={{ minWidth: 200 }}>Range Indicator</th>
                          <th>Evaluation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {test.analytes.map(an => {
                          const pct = getPositionPercent(an.value, an.min, an.max)
                          const isNormal = an.status === 'Normal'
                          return (
                            <tr key={an.name}>
                              <td><strong>{an.name}</strong></td>
                              <td>
                                <strong style={{ color: isNormal ? 'var(--text)' : '#d97706', fontSize: '0.95rem' }}>
                                  {an.value} {an.unit}
                                </strong>
                              </td>
                              <td className="muted">
                                {an.min} – {an.max} {an.unit}
                              </td>
                              <td>
                                <div className="range-track">
                                  <div className="range-optimal" style={{ left: '20%', width: '60%' }} />
                                  <div
                                    className="range-indicator"
                                    style={{ left: `${pct}%`, background: isNormal ? 'var(--green)' : '#d97706' }}
                                    title={`Value: ${an.value} ${an.unit}`}
                                  />
                                </div>
                              </td>
                              <td>
                                <span className={`badge badge-${isNormal ? 'green' : 'orange'}`}>
                                  {an.status}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="muted small" style={{ margin: '8px 0' }}>Specimen scheduled for collection.</p>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Book Lab Test Modal */}
      {showBookModal && (
        <Modal
          open={showBookModal}
          title="Schedule Diagnostic Lab Test"
          onClose={() => setShowBookModal(false)}
        >
          <form onSubmit={handleBook}>
            <label className="field" style={{ marginBottom: 12 }}>
              Select Laboratory Test Panel
              <input
                type="text"
                required
                value={bookingForm.testName}
                onChange={e => setBookingForm({ ...bookingForm, testName: e.target.value })}
                placeholder="Enter laboratory test panel"
              />
            </label>

            <label className="field" style={{ marginBottom: 12 }}>
              Test Category
              <input
                type="text"
                required
                value={bookingForm.category}
                onChange={e => setBookingForm({ ...bookingForm, category: e.target.value })}
                placeholder="Enter test category"
              />
            </label>

            <div className="grid-2" style={{ marginBottom: 12 }}>
              <label className="field">
                Preferred Date
                <input
                  type="date"
                  required
                  value={bookingForm.date}
                  onChange={e => setBookingForm({ ...bookingForm, date: e.target.value })}
                />
              </label>

              <label className="field">
                Laboratory Facility
                <input
                  type="text"
                  required
                  value={bookingForm.facility}
                  onChange={e => setBookingForm({ ...bookingForm, facility: e.target.value })}
                  placeholder="Enter laboratory facility"
                />
              </label>
            </div>

            <div className="alert" style={{ marginBottom: 16 }}>
              <strong>Preparation Notice:</strong> Tests requiring fasting will require an 8–10 hour fasting window prior to morning sample collection.
            </div>

            <div className="row end">
              <button type="button" className="btn" onClick={() => setShowBookModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={booking}>
                {booking ? 'Scheduling…' : 'Confirm Lab Booking'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Full Lab Report Modal */}
      {selectedTest && (
        <Modal
          open={Boolean(selectedTest)}
          title={`Certified Laboratory Report — ${selectedTest.testName}`}
          onClose={() => setSelectedTest(null)}
        >
          <div className="rx-paper modal-lg" style={{ margin: '0 auto' }}>
            <div className="rx-clinic-hdr">
              <div>
                <h2>{selectedTest.facility}</h2>
                <div className="muted small">Clinical Pathology & Diagnostic Division</div>
                <div className="muted small">ISO 15189 Certified Diagnostic Center</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong style={{ color: 'var(--primary)' }}>TEST-ID: {selectedTest.id}</strong>
                <div className="muted small">Collection Date: {selectedTest.date}</div>
                <div style={{ color: 'var(--green)', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginTop: 4 }}>
                  <ShieldCheck size={14} /> Certified Digital Signature
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: '0.85rem' }}>
              <div>
                <div>Patient: <strong>{user?.name || 'Patient'}</strong></div>
              </div>
              <div>
                <div>Ordering Doctor: <strong>{selectedTest.orderingDoctor}</strong></div>
                <div className="muted">Category: {selectedTest.category}</div>
              </div>
            </div>

            {selectedTest.analytes.length > 0 && (
              <div className="table-wrap" style={{ marginBottom: 16 }}>
                <table className="table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Analyte</th>
                      <th>Observed Value</th>
                      <th>Reference Range</th>
                      <th>Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTest.analytes.map(an => (
                      <tr key={an.name}>
                        <td><strong>{an.name}</strong></td>
                        <td>{an.value} {an.unit}</td>
                        <td className="muted">{an.min} – {an.max} {an.unit}</td>
                        <td>
                          <span className={`badge badge-${an.status === 'Normal' ? 'green' : 'orange'}`}>
                            {an.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ background: '#f1f5f9', padding: 12, borderRadius: 8, fontSize: '0.85rem', marginBottom: 16 }}>
              <strong>Pathologist Remarks:</strong>
              <p style={{ margin: '4px 0' }}>{selectedTest.doctorComment}</p>
            </div>

            <div className="row end">
              <button className="btn" onClick={() => setSelectedTest(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                <Printer size={16} /> Print Diagnostic Report
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
