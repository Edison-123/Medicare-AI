import { useParams, Link } from 'react-router-dom'
import { patientsApi } from '../../services/api'
import { useAsync } from '../../hooks'
import { Avatar, Card, StatusBadge, Timeline, PageHeader, LoadingState, ErrorState } from '../../components/common/ui'

const Tags = ({ items, empty }) => items.length ? <div className="tags">{items.map(i => <span key={i} className="tag">{i}</span>)}</div> : <span className="muted">{empty}</span>
export default function PatientDetail() {
  const { patientId } = useParams(); const { data: p, loading, error, reload } = useAsync(() => patientsApi.get(patientId), [patientId])
  if (loading) return <LoadingState label="Loading patient…" />
  if (error) return <ErrorState message={error} onRetry={reload} />
  return <>
    <PageHeader title={p.name} subtitle={`${p.age} yrs • ${p.gender} • ${p.phone}`}
      actions={<><Link className="btn" to="/doctor/patients">Back</Link><Link className="btn" to={`/doctor/prescriptions/new?patientId=${p.id}`}>New prescription</Link>
        {p.todayConsultationId && <Link className="btn btn-primary" to={`/doctor/consultations/${p.todayConsultationId}`}>Open today's consultation</Link>}</>} />
    <div className="grid-2">
      <Card title="Patient overview"><div className="who"><Avatar name={p.name} size={52} /><StatusBadge status={p.status} /></div>
        <dl className="dl"><dt>Last visit</dt><dd>{p.lastVisit}</dd><dt>Next appointment</dt><dd>{p.nextAppt ?? 'None scheduled'}</dd></dl></Card>
      <Card title="Clinical snapshot"><dl className="dl">
        <dt>Allergies</dt><dd><Tags items={p.allergies} empty="No known allergies" /></dd>
        <dt>Conditions</dt><dd><Tags items={p.conditions} empty="None recorded" /></dd>
        <dt>Current medications</dt><dd><Tags items={p.meds} empty="None" /></dd></dl></Card>
    </div>
    <Card title="Patient timeline"><Timeline items={p.timeline} /></Card></>
}
