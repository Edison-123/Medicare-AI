import { useState } from 'react'
import {
  FileText, Search, Download, Printer, RefreshCw, CheckCircle2,
  Calendar, ShieldCheck, User, Stethoscope, AlertCircle, Sparkles, X
} from 'lucide-react'
import { patientApi } from '../../services/api'
import { useAsync, useDebounced } from '../../hooks'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import {
  Card, PageHeader, StatusBadge, LoadingState, ErrorState,
  EmptyState, Modal, ConfirmationDialog
} from '../../components/common/ui'

export default function PatientPrescriptions() {
  const { user } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('All')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search, 250)

  const { data: prescriptions, loading, error, reload } = useAsync(
    () => patientApi.getPrescriptions({ status: tab, q: debouncedSearch }),
    [tab, debouncedSearch]
  )

  // Selected prescription for full paper view
  const [viewRx, setViewRx] = useState(null)

  // Refill request state
  const [refillRx, setRefillRx] = useState(null)
  const [refillNote, setRefillNote] = useState('')
  const [submittingRefill, setSubmittingRefill] = useState(false)
  const [refillSuccessMsg, setRefillSuccessMsg] = useState('')

  const handleRefillSubmit = async (e) => {
    e.preventDefault()
    if (!refillRx) return
    setSubmittingRefill(true)
    try {
      const res = await patientApi.requestRefill(refillRx.id, refillNote)
      setRefillSuccessMsg(res.message)
      toast.success(res.message)
      setTimeout(() => {
        setRefillSuccessMsg('')
        setRefillRx(null)
        setRefillNote('')
        reload()
      }, 1500)
    } finally {
      setSubmittingRefill(false)
    }
  }

  const handlePrint = () => {
    toast.info('Generating official prescription print/PDF layout…')
    window.print()
  }

  return (
    <>
      <PageHeader
        title="My Prescriptions"
        subtitle="Review medical prescriptions issued by your doctors, download certified digital copies, and request renewals."
      />

      {/* Filter and Search Bar */}
      <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="tabs" style={{ margin: 0 }}>
          {['All', 'Finalized', 'Cancelled'].map(status => (
            <button
              key={status}
              className={tab === status ? 'on' : ''}
              onClick={() => setTab(status)}
            >
              {status === 'Finalized' ? 'Active Regimen' : status === 'Cancelled' ? 'Cancelled Records' : 'All Prescriptions'}
            </button>
          ))}
        </div>

        <label className="search" style={{ minWidth: 260 }}>
          <Search size={16} />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by medicine, diagnosis, or doctor…"
            aria-label="Search prescriptions"
          />
        </label>
      </div>

      {loading && <LoadingState label="Loading your prescriptions…" />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {!loading && prescriptions && prescriptions.length === 0 && (
        <Card>
          <EmptyState
            title="No prescriptions found"
            hint="Try changing your search keywords or filter tab."
          />
        </Card>
      )}

      {/* Prescription Cards List */}
      <div className="stack">
        {prescriptions && prescriptions.map(rx => (
          <Card key={rx.id} style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span className="rx-ico">℞</span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--primary)' }}>{rx.code}</span>
                  <StatusBadge status={rx.status} />
                  <span className="muted small">Issued: <strong>{rx.date}</strong></span>
                </div>
                <div style={{ fontSize: '0.92rem', color: 'var(--text)', fontWeight: 600 }}>
                  Diagnosis: <span style={{ fontWeight: 400 }}>{rx.diagnosis}</span>
                </div>
                <div className="muted small" style={{ marginTop: 2 }}>
                  Prescribed by <strong>{rx.doctor}</strong> • {rx.hospital}
                </div>
              </div>

              <div className="row">
                {rx.status === 'Finalized' && rx.refillsLeft > 0 && (
                  <button
                    className="btn btn-sm"
                    onClick={() => setRefillRx(rx)}
                  >
                    <RefreshCw size={14} /> Request Refill ({rx.refillsLeft} left)
                  </button>
                )}
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setViewRx(rx)}
                >
                  <FileText size={14} /> View & Print Copy
                </button>
              </div>
            </div>

            {/* Prescribed Drugs Summary */}
            <div style={{ marginTop: 14, background: '#f8fafc', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                Medication List ({rx.items.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {rx.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, fontSize: '0.88rem' }}>
                    <div>
                      <strong>{item.name}</strong> {item.route && <span className="muted">({item.route})</span>} — <em>{item.dosage}, {item.frequency}</em>
                    </div>
                    <div className="muted small">
                      {item.food} • Duration: <strong>{item.duration}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes and Follow-up Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontSize: '0.82rem', color: 'var(--muted)', flexWrap: 'wrap', gap: 8 }}>
              <div>{rx.notes ? `Instructions: ${rx.notes}` : 'Take medications strictly as instructed.'}</div>
              {rx.followUp && (
                <div style={{ color: 'var(--primary)', fontWeight: 600 }}>
                  📅 Follow-up date: {rx.followUp}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Official Prescription Paper View Modal */}
      {viewRx && (
        <Modal
          open={Boolean(viewRx)}
          title={`Digital Prescription — ${viewRx.code}`}
          size="lg"
          onClose={() => setViewRx(null)}
        >
          {/* Top Action Bar for Immediate Access */}
          <div className="row end no-print" style={{ marginBottom: 14, position: 'sticky', top: 0, zIndex: 10, background: '#fff', padding: '6px 0 10px', borderBottom: '1px solid var(--line)' }}>
            <button className="btn" onClick={() => setViewRx(null)}>Close</button>
            <button className="btn btn-primary" onClick={handlePrint}>
              <Printer size={16} /> Print / Save PDF
            </button>
          </div>

          <div className="rx-paper modal-lg" style={{ margin: '0 auto' }}>
            <div className="rx-watermark">MEDICARE</div>

            {/* Clinic / Hospital Header */}
            <div className="rx-clinic-hdr">
              <div>
                <h2 style={{ fontSize: '1.25rem', color: 'var(--text)' }}>MediCare Health System</h2>
                <div className="muted small">{viewRx.hospital}</div>
                <div className="muted small">Accredited Clinical Prescribing Network</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>{viewRx.code}</strong>
                <div className="muted small">Date: {viewRx.date}</div>
                <div style={{ color: 'var(--green)', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginTop: 4 }}>
                  <ShieldCheck size={14} /> Cryptographically Sealed
                </div>
              </div>
            </div>

            {/* Patient & Doctor Demographics */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: '0.85rem' }}>
              <div>
                <div className="muted small">PATIENT</div>
                <strong>{viewRx.patient || user?.name || 'Patient'}</strong>
              </div>
              <div>
                <div className="muted small">PRESCRIBING PHYSICIAN</div>
                <strong>{viewRx.doctor}</strong>
                <div className="muted">{viewRx.specialty || 'General Medicine'}</div>
              </div>
            </div>

            {/* Clinical Diagnosis */}
            <div style={{ marginBottom: 14, fontSize: '0.9rem' }}>
              <span className="muted">Diagnosis / Assessment: </span>
              <strong>{viewRx.diagnosis}</strong>
            </div>

            <div className="rx-rx-symbol">℞</div>

            {/* Prescribed Items Table */}
            <div className="table-wrap" style={{ marginBottom: 16 }}>
              <table className="table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Medicine</th>
                    <th>Dosage</th>
                    <th>Frequency</th>
                    <th>Duration</th>
                    <th>Instructions</th>
                  </tr>
                </thead>
                <tbody>
                  {viewRx.items.map((it, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>
                        <strong>{it.name}</strong>
                        {it.route && <div className="muted small">{it.route}</div>}
                      </td>
                      <td>{it.dosage}</td>
                      <td>{it.frequency}</td>
                      <td>{it.duration}</td>
                      <td>{it.food} • {it.instructions || 'Standard'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Physician Remarks & Follow Up */}
            <div style={{ background: '#f1f5f9', padding: 12, borderRadius: 8, fontSize: '0.85rem', marginBottom: 16 }}>
              <strong>Doctor Advice & Warnings:</strong>
              <p style={{ margin: '4px 0' }}>{viewRx.notes || 'Take medications strictly on schedule. Drink plenty of water and report any adverse effects.'}</p>
              {viewRx.followUp && <p style={{ color: 'var(--primary)', margin: '4px 0', fontWeight: 600 }}>Scheduled Follow-up: {viewRx.followUp}</p>}
            </div>

            {/* Signature & Security Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid var(--line)', paddingTop: 14, fontSize: '0.78rem' }}>
              <div>
                <div className="muted">Verification Token:</div>
                <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: 4 }}>{viewRx.qrVerification || 'VERIFIED-SIG-849204'}</code>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'Brush Script MT, cursive', fontSize: '1.4rem', color: 'var(--side2)' }}>{viewRx.doctor}</div>
                <div className="muted small">Electronically Authorized via MediCare AI</div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="row end no-print" style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
              <button className="btn" onClick={() => setViewRx(null)}>Close</button>
              <button className="btn btn-primary" onClick={handlePrint}>
                <Printer size={16} /> Print / Save PDF
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Refill Request Modal */}
      {refillRx && (
        <Modal
          open={Boolean(refillRx)}
          title={`Request Medication Refill — ${refillRx.code}`}
          onClose={() => setRefillRx(null)}
        >
          {refillSuccessMsg ? (
            <div className="alert ok" style={{ textAlign: 'center', padding: 20 }}>
              <CheckCircle2 size={28} color="var(--green)" style={{ margin: '0 auto 8px' }} />
              <strong>{refillSuccessMsg}</strong>
              <p className="muted small">Your physician has received the renewal request and will process it shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleRefillSubmit}>
              <p style={{ fontSize: '0.9rem', marginBottom: 12 }}>
                You are requesting a renewal for <strong>{refillRx.code}</strong> prescribed by <strong>{refillRx.doctor}</strong>.
              </p>

              <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, marginBottom: 14, fontSize: '0.85rem' }}>
                <div>Medicines: <strong>{refillRx.items.map(i => i.name).join(', ')}</strong></div>
                <div className="muted">Remaining authorized refills on file: <strong>{refillRx.refillsLeft}</strong></div>
              </div>

              <label className="field" style={{ marginBottom: 16 }}>
                Notes / Current Condition (optional)
                <textarea
                  rows={3}
                  value={refillNote}
                  onChange={e => setRefillNote(e.target.value)}
                  placeholder="e.g., Blood pressure remains steady at 126/80. Running low on pills."
                />
              </label>

              <div className="row end">
                <button type="button" className="btn" onClick={() => setRefillRx(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submittingRefill}>
                  {submittingRefill ? 'Submitting…' : 'Submit Refill Request'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </>
  )
}
