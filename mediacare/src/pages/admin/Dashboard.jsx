import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, Stethoscope, Building2, FileText, Activity, ShieldCheck,
  Server, AlertTriangle, CheckCircle2, Clock, Sparkles, ArrowRight, UserCheck
} from 'lucide-react'
import { adminApi } from '../../services/api'
import { useAsync } from '../../hooks'
import {
  Card, StatCard, StatusBadge, LoadingState, ErrorState, PageHeader
} from '../../components/common/ui'

const ICONS = { doctors: Stethoscope, patients: Users, hospitals: Building2, prescriptions: FileText }

export default function AdminDashboard() {
  const { data, loading, error, reload } = useAsync(adminApi.getDashboard)
  const [approvingId, setApprovingId] = useState(null)

  const handleApproveDoctor = async (id) => {
    setApprovingId(id)
    try {
      await adminApi.updateDoctorStatus(id, 'Active')
      reload()
    } finally {
      setApprovingId(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Admin Control Center"
        subtitle="Platform-wide clinical operations, hospital network performance, security telemetry, and user management."
        actions={
          <div className="row">
            <span className="row" style={{ fontSize: '0.85rem', color: 'var(--muted)', background: '#fff', border: '1px solid var(--line)', padding: '6px 12px', borderRadius: 10 }}>
              <span className="ping-indicator" /> System Status: <strong style={{ color: 'var(--green)' }}>Healthy (99.98% Uptime)</strong>
            </span>
            <Link to="/admin/doctors" className="btn btn-primary">
              <Stethoscope size={15} /> Manage Doctors
            </Link>
          </div>
        }
      />

      {loading && <LoadingState label="Gathering platform system telemetry…" />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {data && (
        <div className="stack">
          {/* Executive KPI Stats */}
          <div className="grid-4">
            {data.kpis.map(kpi => (
              <StatCard
                key={kpi.key}
                icon={ICONS[kpi.key] || Activity}
                tone={kpi.tone}
                value={kpi.value}
                label={kpi.label}
                delta={kpi.delta}
              />
            ))}
          </div>

          {/* Infrastructure Health Bar */}
          <div className="grid-4" style={{ marginBottom: 0 }}>
            <div className="card" style={{ padding: 14 }}>
              <div className="muted small">API Gateway Latency</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>
                {data.systemHealth.apiLatencyMs} ms
              </div>
              <div className="small muted">Optimal response time</div>
            </div>

            <div className="card" style={{ padding: 14 }}>
              <div className="muted small">AI Inference Latency</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>
                {data.systemHealth.aiInferenceSec} s
              </div>
              <div className="small muted">Whisper-Large-v3 GPU cluster</div>
            </div>

            <div className="card" style={{ padding: 14 }}>
              <div className="muted small">DB Connection Pool</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>
                {data.systemHealth.dbConnections}
              </div>
              <div className="small muted">18 active pooled sockets</div>
            </div>

            <div className="card" style={{ padding: 14 }}>
              <div className="muted small">Encrypted Storage Usage</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>
                {data.systemHealth.storageUsedPercent}%
              </div>
              <div className="progress-bar-wrap" style={{ marginTop: 6 }}>
                <div className="progress-bar-fill" style={{ width: `${data.systemHealth.storageUsedPercent}%`, background: 'var(--primary)' }} />
              </div>
            </div>
          </div>

          <div className="grid-3">
            {/* Left 2 Cols: Network Load & Doctor Approvals */}
            <div className="stack" style={{ gridColumn: 'span 2' }}>
              {/* Hospital Network Load Distribution */}
              <Card
                title="Hospital Network Consultation Volume"
                action={<Link to="/admin/hospitals" className="link">View All Facilities</Link>}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {data.hospitalDistribution.map(hosp => (
                    <div key={hosp.code}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, fontSize: '0.88rem' }}>
                        <div>
                          <strong>{hosp.name}</strong> <span className="muted small">({hosp.code})</span>
                        </div>
                        <div>
                          <strong>{hosp.consults} consults</strong> <span className="muted">({hosp.share}%)</span>
                        </div>
                      </div>
                      <div className="progress-bar-wrap">
                        <div
                          className="progress-bar-fill"
                          style={{
                            width: `${hosp.share}%`,
                            background: hosp.share > 30 ? 'var(--primary)' : '#9333ea'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Pending Doctor Onboarding Approvals */}
              <Card
                title="Pending Physician Credential Approvals"
                action={<Link to="/admin/doctors" className="link">Review Directory</Link>}
              >
                {data.pendingDoctorApprovals.length === 0 ? (
                  <p className="muted" style={{ padding: '12px 0' }}>All registered doctors have been reviewed and approved.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {data.pendingDoctorApprovals.map(doc => (
                      <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, border: '1px solid var(--line)', borderRadius: 10, flexWrap: 'wrap', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div className="avatar" style={{ background: '#f3e8ff', color: '#7c3aed' }}>
                            {doc.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <strong>{doc.name}</strong>
                            <div className="muted small">{doc.specialization} • {doc.hospital}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 2 }}>
                              License: <code>{doc.license}</code> • Submitted: {doc.submitted}
                            </div>
                          </div>
                        </div>

                        <div className="row">
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={approvingId === doc.id}
                            onClick={() => handleApproveDoctor(doc.id)}
                          >
                            <UserCheck size={14} /> {approvingId === doc.id ? 'Approving…' : 'Approve & Activate'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Right Col: Recent Activities & Shortcuts */}
            <div className="stack">
              <Card
                title="Live Platform Activity Feed"
                action={<Link to="/admin/system-logs" className="link">System Logs</Link>}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {data.recentActivities.map(act => (
                    <div key={act.id} style={{ display: 'flex', gap: 10, fontSize: '0.85rem' }}>
                      <span className={`badge log-level-${act.level}`} style={{ alignSelf: 'flex-start', minWidth: 60, textAlign: 'center' }}>
                        {act.level}
                      </span>
                      <div className="grow">
                        <strong>{act.title}</strong>
                        <div className="muted small" style={{ margin: '2px 0' }}>{act.desc}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{act.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Administrative Shortcuts */}
              <Card title="Quick Actions">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Link to="/admin/doctors" className="btn block" style={{ justifyContent: 'flex-start' }}>
                    <Stethoscope size={16} /> Onboard New Physician
                  </Link>
                  <Link to="/admin/hospitals" className="btn block" style={{ justifyContent: 'flex-start' }}>
                    <Building2 size={16} /> Add Affiliated Facility
                  </Link>
                  <Link to="/admin/prescriptions" className="btn block" style={{ justifyContent: 'flex-start' }}>
                    <FileText size={16} /> Inspect Prescription Audit Log
                  </Link>
                  <Link to="/admin/settings" className="btn block" style={{ justifyContent: 'flex-start' }}>
                    <ShieldCheck size={16} /> Platform Security Policies
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
