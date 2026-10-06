import { useState } from 'react'
import {
  Activity, Search, Download, Trash2, RefreshCw, AlertTriangle,
  ShieldCheck, Server, Filter
} from 'lucide-react'
import { adminApi } from '../../services/api'
import { useAsync, useDebounced } from '../../hooks'
import {
  Card, PageHeader, LoadingState, ErrorState, EmptyState
} from '../../components/common/ui'

const COMPONENTS = [
  'All', 'RxEngine', 'AiSafetyFilter', 'AuthService',
  'TranscriptionService', 'RateLimiter', 'DbCluster', 'BackupEngine', 'LabConnector'
]

export default function AdminSystemLogs() {
  const [level, setLevel] = useState('All')
  const [component, setComponent] = useState('All')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search, 200)

  const { data: logs, loading, error, reload } = useAsync(
    () => adminApi.getSystemLogs({ level, component, q: debouncedSearch }),
    [level, component, debouncedSearch]
  )

  const [clearing, setClearing] = useState(false)

  const handleClear = async () => {
    setClearing(true)
    try {
      await adminApi.clearLogs()
      reload()
    } finally {
      setClearing(false)
    }
  }

  const handleExport = () => {
    if (!logs) return
    const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2))
    const a = document.createElement('a')
    a.setAttribute("href", jsonStr)
    a.setAttribute("download", `medicare-system-audit-logs-${new Date().toISOString().split('T')[0]}.json`)
    a.click()
  }

  return (
    <>
      <PageHeader
        title="Security & System Audit Logs"
        subtitle="Real-time security telemetry, access audits, cryptographic event signatures, and infrastructure alerts."
        actions={
          <div className="row">
            <button className="btn btn-sm" onClick={reload} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
            </button>
            <button className="btn btn-sm" onClick={handleExport} disabled={!logs || logs.length === 0}>
              <Download size={14} /> Export Logs
            </button>
            <button className="btn btn-sm btn-danger-o" onClick={handleClear} disabled={clearing || !logs || logs.length === 0}>
              <Trash2 size={14} /> Clear Buffer
            </button>
          </div>
        }
      />

      {/* Filter Bar */}
      <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div className="row">
          <label className="field" style={{ minWidth: 150 }}>
            <select value={level} onChange={e => setLevel(e.target.value)}>
              <option value="All">All Severity Levels</option>
              <option value="INFO">INFO Only</option>
              <option value="WARN">WARN Warnings</option>
              <option value="ERROR">ERROR Failures</option>
              <option value="CRITICAL">CRITICAL Security</option>
            </select>
          </label>

          <label className="field" style={{ minWidth: 170 }}>
            <select value={component} onChange={e => setComponent(e.target.value)}>
              {COMPONENTS.map(c => (
                <option key={c} value={c}>Component: {c}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="search" style={{ minWidth: 280 }}>
          <Search size={16} />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by IP, user, message, or ID…"
            aria-label="Search logs"
          />
        </label>
      </div>

      {loading && <LoadingState label="Reading stream from syslog cluster…" />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {!loading && logs && logs.length === 0 && (
        <Card>
          <EmptyState
            title="No log events matched"
            hint="Try changing your severity level filter or search keyword."
          />
        </Card>
      )}

      {/* Logs Table */}
      {logs && logs.length > 0 && (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap">
            <table className="table log-table" style={{ fontSize: '0.84rem' }}>
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>Timestamp</th>
                  <th>Severity</th>
                  <th>Subsystem</th>
                  <th>Actor / User</th>
                  <th>Origin IP</th>
                  <th>Audit Description</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td><code>{log.id}</code></td>
                    <td className="muted" style={{ whiteSpace: 'nowrap' }}>{log.timestamp}</td>
                    <td>
                      <span className={`badge log-level-${log.level}`}>
                        {log.level}
                      </span>
                    </td>
                    <td>
                      <span className="tag">{log.component}</span>
                    </td>
                    <td>
                      <strong>{log.user}</strong>
                    </td>
                    <td><code>{log.ip}</code></td>
                    <td style={{ maxWidth: 450 }}>
                      {log.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  )
}
