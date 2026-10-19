import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Sparkles } from 'lucide-react'
import { prescriptionsApi } from '../../services/api'
import { useAsync, useDebounced } from '../../hooks'
import { Avatar, DataTable, StatusBadge, Pagination, PageHeader, Card, LoadingState, ErrorState, EmptyState } from '../../components/common/ui'

const SIZE = 6
const formatPrescriptionDate = (value) => {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

export default function Prescriptions() {
  const [q, setQ] = useState(''), [status, setStatus] = useState('All'), [from, setFrom] = useState(''), [to, setTo] = useState(''), [page, setPage] = useState(1)
  const dq = useDebounced(q); const reset = f => v => { f(v); setPage(1) }
  const { data, loading, error, reload } = useAsync(() => prescriptionsApi.list({ q:dq, status, from, to, page, size:SIZE }), [dq, status, from, to, page])
  const cols = [
    { key:'code', label:'ID', render:r => <Link className="link" to={`/doctor/prescriptions/${r.id}`}>{r.code}</Link> },
    { key:'patient', label:'Patient', render:r => <Link className="who" to={`/doctor/patients/${r.patientId}`}><Avatar name={r.patient} src={r.profilePicture} /><strong>{r.patient}</strong></Link> },
    { key:'diagnosis', label:'Diagnosis' },
    { key:'date', label:'Date', render:r => <span className="tag" style={{ background: '#eff6ff', color: '#1d4ed8' }}>{formatPrescriptionDate(r.date)}</span> },
    { key:'status', label:'Status', render:r => <><StatusBadge status={r.status} />{r.aiAssisted && <span className="badge badge-purple ai-tag" title="AI suggestions were used and reviewed by the doctor"><Sparkles size={11} /> AI-assisted</span>}</> },
    { key:'actions', label:'Actions', render:r => <Link className="btn btn-sm" to={`/doctor/prescriptions/${r.id}`}>{['Draft', 'Reviewed'].includes(r.status) ? 'Edit' : 'View'}</Link> },
  ]
  return <>
    <PageHeader title="Prescriptions" subtitle="Drafts, reviewed and finalized prescriptions." actions={<Link className="btn btn-primary" to="/doctor/prescriptions/new">+ New prescription</Link>} />
    <Card>
      <div className="toolbar" style={{ gap: 12, alignItems: 'flex-end' }}>
        <label className="search grow"><Search size={16} /><input value={q} onChange={e => reset(setQ)(e.target.value)} placeholder="Search by patient or prescription ID" aria-label="Search prescriptions" /></label>
        <label className="field" style={{ minWidth: 190, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="muted small" style={{ whiteSpace: 'nowrap' }}>Status</span>
          <select value={status} onChange={e => reset(setStatus)(e.target.value)} aria-label="Filter by status" style={{ minWidth: 120 }}>{['All', 'Draft', 'Reviewed', 'Finalized', 'Cancelled'].map(s => <option key={s}>{s}</option>)}</select>
        </label>
        <label className="field" style={{ minWidth: 210, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="muted small" style={{ whiteSpace: 'nowrap' }}>From</span>
          <input type="date" value={from} max={to || undefined} onChange={e => reset(setFrom)(e.target.value)} aria-label="From date" style={{ borderRadius: 10, minHeight: 40, width: '100%' }} />
        </label>
        <label className="field" style={{ minWidth: 210, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="muted small" style={{ whiteSpace: 'nowrap' }}>To</span>
          <input type="date" value={to} min={from || undefined} onChange={e => reset(setTo)(e.target.value)} aria-label="To date" style={{ borderRadius: 10, minHeight: 40, width: '100%' }} />
        </label>
      </div>
      {loading && <LoadingState label="Loading prescriptions…" />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && (data.items.length === 0 ? <EmptyState title="No prescriptions found" hint="Change the filters or create a new prescription." />
        : <><DataTable columns={cols} rows={data.items} /><Pagination page={page} total={data.total} size={SIZE} onChange={setPage} /></>)}
    </Card></>
}
