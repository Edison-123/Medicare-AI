import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { consultationsApi } from '../../services/api'
import { useAsync, useDebounced } from '../../hooks'
import { Avatar, DataTable, StatusBadge, Pagination, PageHeader, Card, LoadingState, ErrorState, EmptyState } from '../../components/common/ui'

const TABS = [['today', "Today's"], ['upcoming', 'Upcoming'], ['completed', 'Completed & cancelled']]
const SIZE = 6
export default function Consultations() {
  const [tab, setTab] = useState('today'); const [q, setQ] = useState(''); const [page, setPage] = useState(1); const dq = useDebounced(q)
  const { data, loading, error, reload } = useAsync(() => consultationsApi.list({ q:dq, tab, page, size:SIZE }), [dq, tab, page])
  const cols = [
    { key:'patient', label:'Patient', render:c => <Link className="who" to={`/doctor/patients/${c.patientId}`}><Avatar name={c.patient} /><strong>{c.patient}</strong></Link> },
    { key:'date', label:'Date' }, { key:'time', label:'Time' }, { key:'type', label:'Type' },
    { key:'status', label:'Status', render:c => <StatusBadge status={c.status} /> },
    { key:'actions', label:'Actions', render:c => c.status === 'Cancelled' ? '—' :
      <Link className={`btn btn-sm ${c.status === 'Completed' ? '' : 'btn-primary'}`} to={`/doctor/consultations/${c.id}`}>
        {c.status === 'Completed' ? 'View' : c.status === 'In Progress' ? 'Continue' : 'Start'}</Link> },
  ]
  return <>
    <PageHeader title="Consultations" subtitle="Run consultations and review AI-assisted documentation." />
    <Card>
      <div className="tabs" role="tablist">{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k}
        className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setPage(1) }}>{l}</button>)}</div>
      <div className="toolbar"><label className="search grow"><Search size={16} />
        <input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder="Search by patient name" aria-label="Search consultations" /></label></div>
      {loading && <LoadingState label="Loading consultations…" />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && (data.items.length === 0
        ? <EmptyState title="No consultations here" hint="Try another tab or clear the search." />
        : <><DataTable columns={cols} rows={data.items} /><Pagination page={page} total={data.total} size={SIZE} onChange={setPage} /></>)}
    </Card></>
}
