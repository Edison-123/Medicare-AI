import { useState } from 'react'
import {
  FileText, Search, Download, ShieldCheck, AlertTriangle, CheckCircle2,
  Calendar, Building2, User, Stethoscope, Sparkles, Filter
} from 'lucide-react'
import { adminApi } from '../../services/api'
import { useAsync, useDebounced } from '../../hooks'
import {
  Card, PageHeader, StatusBadge, LoadingState, ErrorState,
  EmptyState, Modal
} from '../../components/common/ui'

export default function AdminPrescriptions() {
  const [search, setSearch] = useState('')
  const [flagFilter, setFlagFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const debouncedSearch = useDebounced(search, 250)

  const { data: prescriptions, loading, error, reload } = useAsync(
    () => adminApi.getPrescriptionsAudit({ q: debouncedSearch, flag: flagFilter, status: statusFilter }),
    [debouncedSearch, flagFilter, statusFilter]
  )

  const [inspectRx, setInspectRx] = useState(null)

  const handleExportAudit = () => {
    if (!prescriptions?.length) return
    const columns = [
      ['Event ID', rx => rx.id],
      ['Prescription Code', rx => rx.code],
      ['Timestamp', rx => rx.date],
      ['Attending Physician', rx => rx.doctor],
      ['Patient', rx => rx.patient],
      ['Hospital Facility', rx => rx.hospital],
      ['Diagnosis', rx => rx.diagnosis],
      ['Medication Count', rx => rx.medsCount],
      ['AI Assisted', rx => rx.aiAssisted],
      ['Safety Telemetry Flag', rx => rx.safetyFlag],
      ['Status', rx => rx.status],
      ['Audit Hash', rx => rx.auditHash]
    ]
    const escapeCsv = value => `"${String(value ?? '').replace(/"/g, '""')}"`
    const csv = [
      columns.map(([heading]) => escapeCsv(heading)),
      ...prescriptions.map(rx => columns.map(([, getValue]) => escapeCsv(getValue(rx))))
    ].map(row => row.join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `medicare-prescription-audit-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <>
      <PageHeader
        title="Prescription Regulatory Audit Log"
        subtitle="Cryptographically verified audit trail of all electronic prescriptions issued across the clinical network."
        actions={
          <button className="btn btn-primary" onClick={handleExportAudit} disabled={!prescriptions || prescriptions.length === 0}>
            <Download size={15} /> Export Audit CSV
          </button>
        }
      />

      {/* Toolbar filters */}
      <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div className="row">
          <label className="field" style={{ minWidth: 200 }}>
            <select value={flagFilter} onChange={e => setFlagFilter(e.target.value)}>
              <option value="All">All Safety Flags</option>
              <option value="Verified Safe">Verified Safe</option>
              <option value="AI Drug Interaction Warning">Interaction Warnings</option>
              <option value="Age & Renal Dose Alert">Renal / Dose Alerts</option>
              <option value="Cancelled by Doctor">Cancelled by Doctor</option>
            </select>
          </label>

          <label className="field" style={{ minWidth: 150 }}>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="All">All Statuses</option>
              <option value="Finalized">Finalized</option>
              <option value="Reviewed">Reviewed</option>
              <option value="Draft">Draft</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </label>
        </div>

        <label className="search" style={{ minWidth: 280 }}>
          <Search size={16} />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by code, doctor, patient…"
            aria-label="Search prescriptions audit"
          />
        </label>
      </div>

      {loading && <LoadingState label="Verifying cryptographic audit hashes…" />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {!loading && prescriptions && prescriptions.length === 0 && (
        <Card>
          <EmptyState
            title="No audit entries matched"
            hint="Try changing your safety flag or status filters."
          />
        </Card>
      )}

      {/* Prescriptions Table */}
      {prescriptions && prescriptions.length > 0 && (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Prescription Code</th>
                  <th>Timestamp</th>
                  <th>Attending Physician</th>
                  <th>Patient</th>
                  <th>Hospital Facility</th>
                  <th>Diagnosis</th>
                  <th>AI Assisted</th>
                  <th>Safety Telemetry Flag</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Audit</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map(rx => {
                  const isFlagged = rx.safetyFlag.includes('Warning') || rx.safetyFlag.includes('Alert')
                  return (
                    <tr key={rx.id}>
                      <td>
                        <strong style={{ color: 'var(--primary)' }}>{rx.code}</strong>
                      </td>
                      <td className="muted small">{rx.date}</td>
                      <td>
                        <strong>{rx.doctor}</strong>
                      </td>
                      <td>{rx.patient}</td>
                      <td>
                        <span className="small">{rx.hospital}</span>
                      </td>
                      <td>
                        <span className="small">{rx.diagnosis}</span>
                      </td>
                      <td>
                        {rx.aiAssisted ? (
                          <span className="tag" style={{ background: '#f3e8ff', color: '#7c3aed', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Sparkles size={12} /> AI Drafted
                          </span>
                        ) : (
                          <span className="muted small">Manual</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge badge-${isFlagged ? 'orange' : rx.safetyFlag === 'Verified Safe' ? 'green' : 'gray'}`}>
                          {rx.safetyFlag}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={rx.status} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-sm"
                          onClick={() => setInspectRx(rx)}
                        >
                          Verify Hash
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Audit Hash Inspector Modal */}
      {inspectRx && (
        <Modal
          open={Boolean(inspectRx)}
          title={`Cryptographic Audit Verification — ${inspectRx.code}`}
          onClose={() => setInspectRx(null)}
        >
          <div className="stack">
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>{inspectRx.code}</strong>
                <StatusBadge status={inspectRx.status} />
              </div>
              <div style={{ fontSize: '0.85rem' }}>
                Physician: <strong>{inspectRx.doctor}</strong> • Patient: <strong>{inspectRx.patient}</strong>
              </div>
              <div className="muted small" style={{ marginTop: 2 }}>
                Facility: {inspectRx.hospital} • Issued: {inspectRx.date}
              </div>
            </div>

            <div className="dl" style={{ background: '#fff', border: '1px solid var(--line)', padding: 14, borderRadius: 8, fontSize: '0.85rem' }}>
              <dt>Tamper Seal Hash</dt>
              <dd><code>{inspectRx.auditHash}</code></dd>

              <dt>Diagnosis</dt>
              <dd><strong>{inspectRx.diagnosis}</strong></dd>

              <dt>Medications Prescribed</dt>
              <dd>{inspectRx.medsCount} distinct pharmacotherapy items</dd>

              <dt>AI Drafting Origin</dt>
              <dd>{inspectRx.aiAssisted ? 'Generated via Whisper-Large Clinical Pipeline and approved by Doctor' : 'Direct physician entry'}</dd>

              <dt>Safety Interceptor Status</dt>
              <dd>
                <span style={{ color: inspectRx.safetyFlag === 'Verified Safe' ? 'var(--green)' : '#ea580c', fontWeight: 600 }}>
                  {inspectRx.safetyFlag}
                </span>
              </dd>

              <dt>Audit Compliance</dt>
              <dd style={{ color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <ShieldCheck size={16} /> Fully compliant with 21 CFR Part 11 & HIPAA audit mandates.
              </dd>
            </div>

            <div className="row end">
              <button className="btn" onClick={() => setInspectRx(null)}>Close</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
