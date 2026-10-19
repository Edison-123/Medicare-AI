import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { patientsApi } from '../../services/api'
import { useAsync, useDebounced } from '../../hooks'
import { Avatar, DataTable, StatusBadge, Pagination, PageHeader, Card, LoadingState, ErrorState, EmptyState } from '../../components/common/ui'

const SIZE = 5
export default function Patients() {
  const [q, setQ] = useState(''); const [status, setStatus] = useState('All'); const [sort, setSort] = useState('name'); const [dir, setDir] = useState('asc'); const [page, setPage] = useState(1)
  const dq = useDebounced(q)
  const { data, loading, error, reload } = useAsync(() => patientsApi.list({ q:dq, status, sort, dir, page, size:SIZE }), [dq, status, sort, dir, page])
  const onSort = k => { setDir(sort === k && dir === 'asc' ? 'desc' : 'asc'); setSort(k); setPage(1) }
  const cols = [
    { key:'name', label:'Patient', sortable:true, render:p => <Link className="who" to={`/doctor/patients/${p.id}`}><Avatar name={p.name} src={p.profilePicture} /><strong>{p.name}</strong></Link> },
    { key:'age', label:'Age', sortable:true }, { key:'gender', label:'Gender' }, { key:'phone', label:'Phone' },
    { key:'lastVisit', label:'Last Visit', sortable:true }, { key:'nextAppt', label:'Next Appointment' },
    { key:'status', label:'Status', render:p => <StatusBadge status={p.status} /> },
    { key:'actions', label:'Actions', render:p => <div className="row">
      <Link className="btn btn-sm" to={`/doctor/patients/${p.id}`}>View</Link>
      <Link className="btn btn-sm" to={`/doctor/prescriptions/new?patientId=${p.id}`}>Prescribe</Link></div> },
  ]
  return <>
    <PageHeader title="Patients" subtitle="Patients assigned to you." />
    <Card>
      <div className="toolbar">
        <label className="search grow"><Search size={16} /><input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder="Search by patient name" aria-label="Search patients" /></label>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} aria-label="Filter by status">
          {['All', 'Active', 'Follow-up', 'Inactive'].map(s => <option key={s}>{s}</option>)}</select></div>
      {loading && <LoadingState label="Loading patients…" />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && (data.items.length === 0
        ? <EmptyState title="No patients match your filters" hint="Clear the search or choose a different status." />
        : <><DataTable columns={cols} rows={data.items} sort={sort} dir={dir} onSort={onSort} />
            <Pagination page={page} total={data.total} size={SIZE} onChange={setPage} /></>)}
    </Card></>
}
