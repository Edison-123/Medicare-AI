import { useEffect } from 'react'
import { Loader2, Inbox, AlertTriangle, X, ChevronLeft, ChevronRight } from 'lucide-react'

export const Avatar = ({ name, size = 36 }) => {
  const i = name.replace(/^Dr\.\s*/, '').split(' ').map(w => w[0]).slice(0, 2).join('')
  return <span className="avatar" style={{ width:size, height:size, fontSize:size * .38 }} aria-hidden>{i}</span>
}
const TONES = { Completed:'green', Saved:'green', Active:'green', Finalized:'green', 'In Progress':'blue', Reviewed:'blue',
  Upcoming:'purple', Draft:'gray', Inactive:'gray', 'Follow-up':'orange', Cancelled:'red', Failed:'red', Processing:'blue', Queued:'gray', Skipped:'gray' }
export const StatusBadge = ({ status }) => <span className={`badge badge-${TONES[status] || 'gray'}`}>{status}</span>

export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="page-header"><div><h1>{title}</h1>{subtitle && <p className="muted">{subtitle}</p>}</div>
    {actions && <div className="row">{actions}</div>}</div>)

export const StatCard = ({ icon: Icon, tone, value, label, delta, link }) => (
  <div className={`card stat tone-${tone}`}>
    <span className="stat-icon"><Icon size={22} /></span>
    <div><div className="stat-value">{value}</div><div className="stat-label">{label}</div>
      {delta && <div className="stat-delta">↑ {delta}</div>}
      {link && <a className="link" href="#follow">{link}</a>}</div>
  </div>)

export const Card = ({ title, action, children, className = '' }) => (
  <section className={`card ${className}`}>
    {(title || action) && <header className="card-head"><h2>{title}</h2>{action}</header>}{children}</section>)

export const LoadingState = ({ label = 'Loading…' }) => <div className="state" role="status"><Loader2 className="spin" /> {label}</div>
export const EmptyState = ({ title, hint }) => <div className="state"><Inbox size={28} /><strong>{title}</strong>{hint && <span className="muted">{hint}</span>}</div>
export const ErrorState = ({ message, onRetry }) => (
  <div className="state" role="alert"><AlertTriangle size={28} color="var(--red)" /><strong>Something went wrong</strong>
    <span className="muted">{message}</span>{onRetry && <button className="btn" onClick={onRetry}>Try again</button>}</div>)

export function Modal({ open, title, onClose, children, size = 'md', className = '' }) {
  useEffect(() => { if (!open) return; const k = e => e.key === 'Escape' && onClose(); addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [open, onClose])
  if (!open) return null
  const sizeClass = size === 'lg' ? 'modal-lg' : size === 'xl' ? 'modal-xl' : ''
  return <div className="overlay" onMouseDown={onClose}><div className={`modal ${sizeClass} ${className}`.trim()} role="dialog" aria-modal="true" aria-label={title} onMouseDown={e => e.stopPropagation()}>
    <header className="card-head" style={{ marginBottom: 12, flexShrink: 0 }}><h2>{title}</h2><button className="icon-btn" aria-label="Close" onClick={onClose}><X size={18} /></button></header>
    <div className="modal-body">{children}</div></div></div>
}
export const ConfirmationDialog = ({ open, title, message, confirmLabel = 'Confirm', onConfirm, onClose }) => (
  <Modal open={open} title={title} onClose={onClose}><p>{message}</p>
    <div className="row end"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-danger" onClick={onConfirm}>{confirmLabel}</button></div></Modal>)

export const Pagination = ({ page, total, size, onChange }) => {
  const pages = Math.max(1, Math.ceil(total / size))
  return <div className="pagination"><span className="muted">{total === 0 ? 0 : (page - 1) * size + 1}–{Math.min(page * size, total)} of {total}</span>
    <div className="row"><button className="icon-btn" aria-label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft size={18} /></button>
      <span>Page {page} of {pages}</span>
      <button className="icon-btn" aria-label="Next page" disabled={page >= pages} onClick={() => onChange(page + 1)}><ChevronRight size={18} /></button></div></div>
}
export const Timeline = ({ items }) => (
  <ol className="timeline">{items.map((t, i) => <li key={i}><time>{t.date}</time><strong>{t.title}</strong><p className="muted">{t.body}</p></li>)}</ol>)

export const AIDraftBanner = ({ children }) => <div className="ai-banner"><strong>AI generated draft</strong> {children || '— requires doctor review and approval before it becomes part of the record.'}</div>

// DataTable: columns [{key,label,sortable,render}]; sorting is delegated to the parent (server-side friendly)
export function DataTable({ columns, rows, sort, dir, onSort, rowKey = 'id' }) {
  return <div className="table-wrap"><table className="table"><thead><tr>{columns.map(c =>
    <th key={c.key} aria-sort={sort === c.key ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}>
      {c.sortable ? <button className="th-btn" onClick={() => onSort(c.key)}>{c.label}{sort === c.key ? (dir === 'asc' ? ' ▲' : ' ▼') : ''}</button> : c.label}</th>)}</tr></thead>
    <tbody>{rows.map(r => <tr key={r[rowKey]}>{columns.map(c => <td key={c.key} data-label={c.label}>{c.render ? c.render(r) : r[c.key] ?? '—'}</td>)}</tr>)}</tbody></table></div>
}
