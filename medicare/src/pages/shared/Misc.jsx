import { Link } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { EmptyState, PageHeader } from '../../components/common/ui'
export const Forbidden = () => <div className="auth"><div className="card auth-card"><h1>403 — Access denied</h1><p className="muted">Your role cannot open this area.</p><Link className="btn btn-primary" to="/">Back to your dashboard</Link></div></div>
export const NotFound = () => <div className="auth"><div className="card auth-card"><h1>Page not found</h1><Link className="btn btn-primary" to="/">Go home</Link></div></div>
export function ModuleStub() { // honest placeholder for modules scheduled in later phases
  const t = useLocation().pathname.split('/').filter(Boolean).slice(1).join(' / ').replace(/-/g, ' ')
  return <><PageHeader title={t.replace(/\b\w/g, c => c.toUpperCase())} /><div className="card"><EmptyState title="This module is scheduled for the next build phase" hint="Navigation, layout, role guard and API service layer are already in place." /></div></>
}
