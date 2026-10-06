import { Users, FileText, Mic, CalendarClock, RefreshCw, CheckCircle2, AlertCircle, Stethoscope } from 'lucide-react'
import { Link } from 'react-router-dom'
import { doctorApi } from '../../services/api'
import { useAsync } from '../../hooks'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { Avatar, Card, StatCard, StatusBadge, LoadingState, ErrorState, PageHeader } from '../../components/common/ui'

const ICONS = { patients:Users, rx:FileText, ai:Mic, follow:CalendarClock }
const COLORS = ['#5b5bf0', '#22c55e', '#2563eb']

function Donut({ parts, total }) {
  const sum = parts.reduce((a, p) => a + p.value, 0); let acc = 0; const r = 52, c = 2 * Math.PI * r
  return <svg viewBox="0 0 140 140" className="donut" role="img" aria-label={`${total} total transcriptions`}>
    {parts.map((p, i) => { const len = p.value / sum * c; const el = <circle key={i} cx="70" cy="70" r={r} fill="none" stroke={COLORS[i]} strokeWidth="16"
      strokeDasharray={`${len - 2} ${c - len + 2}`} strokeDashoffset={-acc} transform="rotate(-90 70 70)" />; acc += len; return el })}
    <text x="70" y="68" textAnchor="middle" className="donut-n">{total}</text><text x="70" y="86" textAnchor="middle" className="donut-l">Total</text></svg>
}

export default function DoctorDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(doctorApi.dashboard)
  const { data: refills, reload: reloadRefills } = useAsync(doctorApi.getPendingRefills)

  const handleRefillAction = async (refillId, action) => {
    await doctorApi.respondRefill(refillId, action)
    if (action === 'approve') {
      toast.success('Prescription renewal approved & patient notified')
    } else {
      toast.warn('In-person clinic review requested before renewal')
    }
    reloadRefills()
  }

  return <>
    <PageHeader title={`Good Morning, ${user.name} 👋`} subtitle="Here's what's happening with your practice today." />
    {loading && <LoadingState label="Loading dashboard…" />}
    {error && <ErrorState message={error} onRetry={reload} />}
    {data && <>
      <div className="grid-4">{data.stats.map(({ key, ...stat }) => <StatCard key={key} icon={ICONS[key]} {...stat} />)}</div>

      {/* Pending Prescription Renewal Requests Queue */}
      {refills && refills.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Card
            title={`Pending Prescription Renewals (${refills.length})`}
            action={<span className="badge badge-orange">Action Required</span>}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {refills.map(req => (
                <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', border: '1px solid var(--line)', borderRadius: 10, background: '#fff', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar name={req.patientName} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong style={{ fontSize: '0.98rem' }}>{req.patientName}</strong>
                        <span className="tag" style={{ background: '#e0f2fe', color: '#0369a1' }}>{req.prescriptionCode}</span>
                      </div>
                      <div style={{ fontSize: '0.88rem', color: 'var(--text)' }}>
                        Requested Medicine: <strong>{req.medicine}</strong> ({req.dosage})
                      </div>
                      <div className="muted small" style={{ marginTop: 2 }}>
                        {req.lastVitals} • Patient Note: <em>"{req.notes}"</em>
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleRefillAction(req.id, 'approve')}
                    >
                      <CheckCircle2 size={14} /> 1-Click Approve Renewal
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={() => handleRefillAction(req.id, 'visit_required')}
                    >
                      <Stethoscope size={14} /> Request Clinic Visit First
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      <div className="grid-3">
        <Card title="Today's Appointments" action={<Link className="link" to="/doctor/consultations">View all</Link>}>
          <ul className="list">{data.appointments.map((a, index) => <li key={a.id ?? `${a.patient}-${a.time}-${a.type}-${index}`}><Avatar name={a.patient} />
            <div className="grow"><strong>{a.patient}</strong><div className="muted small">{a.time} • {a.type}</div></div><StatusBadge status={a.status} /></li>)}</ul></Card>
        <Card title="AI Transcription Overview"><div className="ai-ov"><Donut parts={data.aiOverview.parts} total={data.aiOverview.total} />
          <ul className="legend">{data.aiOverview.parts.map((p, i) => <li key={p.label}><i style={{ background:COLORS[i] }} />{p.label}
            <b>{p.value} ({Math.round(p.value / data.aiOverview.total * 100)}%)</b></li>)}
            <li className="acc">Accuracy Rate <b>{data.aiOverview.accuracy}%</b></li></ul></div></Card>
        <Card title="Recent Prescriptions" action={<Link className="link" to="/doctor/prescriptions">View all</Link>}>
          <ul className="list">{data.recentRx.map((r, index) => <li key={r.id ?? `${r.patient}-${r.when}-${index}`}><span className="rx-ico">℞</span>
            <div className="grow"><strong>{r.patient}</strong><div className="muted small">{r.when}</div></div><StatusBadge status={r.status} /></li>)}</ul></Card>
      </div></>}
  </>
}
