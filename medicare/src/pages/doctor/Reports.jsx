import { useState } from 'react'
import { BarChart3, Download, TrendingUp, Users, FileCheck, ShieldAlert, Sparkles, Clock, Activity, CheckCircle2 } from 'lucide-react'
import { reportsApi } from '../../services/api'
import { useAsync } from '../../hooks'
import { Card, PageHeader, StatCard, LoadingState, ErrorState, EmptyState } from '../../components/common/ui'

export default function Reports() {
  const [timeframe, setTimeframe] = useState('30d')
  const { data, loading, error, reload } = useAsync(() => reportsApi.getReports(timeframe), [timeframe])

  const exportData = () => {
    if (!data) return
    const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2))
    const dlAnchorElem = document.createElement('a')
    dlAnchorElem.setAttribute("href", jsonStr)
    dlAnchorElem.setAttribute("download", `medicare-report-${timeframe}.json`)
    dlAnchorElem.click()
  }

  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Practice metrics, diagnostic trends, prescription patterns, and AI safety telemetry."
        actions={
          <>
            <select
              value={timeframe}
              onChange={e => setTimeframe(e.target.value)}
              aria-label="Timeframe"
              style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 12px', background: '#fff', font: 'inherit' }}
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 3 Months</option>
              <option value="1y">Year to Date</option>
            </select>
            <button className="btn btn-primary" onClick={exportData} disabled={loading || !data}>
              <Download size={15} /> Export Report
            </button>
          </>
        }
      />

      {loading && <LoadingState label="Computing practice analytics…" />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {data && (
        <div className="stack">
          {/* Key Metric Stat Cards */}
          <div className="grid-4">
            <StatCard
              icon={Users}
              tone="blue"
              value={data.summary.consultationsCompleted}
              label="Consultations Done"
            />
            <StatCard
              icon={FileCheck}
              tone="green"
              value={data.summary.prescriptionsIssued}
              label="Prescriptions Issued"
            />
            <StatCard
              icon={Sparkles}
              tone="purple"
              value={`${data.summary.aiAdoptionRate}%`}
              label="AI Assisted Consultations"
            />
            <StatCard
              icon={ShieldAlert}
              tone="orange"
              value={data.summary.allergyAlertsAvoided}
              label="Allergy Conflicts Caught"
            />
          </div>

          {/* Monthly Trends & AI Quality */}
          <div className="grid-2">
            <Card title="Monthly Volume & AI Draft Adoption">
              <p className="muted small" style={{ marginBottom: 16 }}>
                Tracking total consultations, finalized prescriptions, and AI drafts utilized.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {data.monthlyTrends.length === 0 ? <EmptyState title="No monthly trend data" hint="Practice trends will appear as consultations and prescriptions are recorded." /> : data.monthlyTrends.map(m => {
                  const maxVal = 130
                  return (
                    <div key={m.month} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.85rem' }}>
                      <span style={{ width: 36, fontWeight: 600 }}>{m.month}</span>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div
                            style={{
                              height: 12,
                              borderRadius: 6,
                              background: 'var(--primary)',
                              width: `${(m.consultations / maxVal) * 100}%`,
                              minWidth: 8
                            }}
                            title={`Consultations: ${m.consultations}`}
                          />
                          <span className="muted small">{m.consultations} consults</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div
                            style={{
                              height: 8,
                              borderRadius: 4,
                              background: '#7c3aed',
                              width: `${(m.aiDrafts / maxVal) * 100}%`,
                              minWidth: 6
                            }}
                            title={`AI Drafts: ${m.aiDrafts}`}
                          />
                          <span className="muted small" style={{ fontSize: '0.75rem' }}>{m.aiDrafts} AI drafts</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="row" style={{ marginTop: 16, fontSize: '0.8rem', gap: 16 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--primary)', display: 'inline-block' }} /> Consultations
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i style={{ width: 10, height: 10, borderRadius: 2, background: '#7c3aed', display: 'inline-block' }} /> AI Generated Drafts
                </span>
              </div>
            </Card>

            <Card title="AI Accuracy & Quality Telemetry">
              <p className="muted small" style={{ marginBottom: 16 }}>
                Text match compares saved AI output with the final saved transcript or edited OCR text for consultations in this period. Speech uses 1 − word error rate; OCR uses 1 − character error rate. This is not a clinical accuracy measure.
              </p>
              <div className="stack" style={{ gap: 16 }}>
                <div>
                  <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>Speech transcript text match</span>
                    <span><strong style={{ color: 'var(--green)' }}>{data.aiQualityMetrics.transcriptionAccuracy == null ? 'Not reported' : `${data.aiQualityMetrics.transcriptionAccuracy}%`}</strong><small className="muted small" style={{ marginLeft: 8 }}>{data.aiQualityMetrics.transcriptionSampleCount} consultations</small></span>
                  </div>
                  <div style={{ width: '100%', height: 10, background: '#eef2ff', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${data.aiQualityMetrics.transcriptionAccuracy ?? 0}%`, height: '100%', background: 'var(--green)' }} />
                  </div>
                </div>

                <div>
                  <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>Handwriting OCR text match</span>
                    <span><strong style={{ color: '#2563eb' }}>{data.aiQualityMetrics.ocrAccuracy == null ? 'Not reported' : `${data.aiQualityMetrics.ocrAccuracy}%`}</strong><small className="muted small" style={{ marginLeft: 8 }}>{data.aiQualityMetrics.ocrSampleCount} consultations</small></span>
                  </div>
                  <div style={{ width: '100%', height: 10, background: '#eef2ff', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${data.aiQualityMetrics.ocrAccuracy ?? 0}%`, height: '100%', background: '#2563eb' }} />
                  </div>
                </div>

                <div>
                  <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>AI drafts accepted unchanged</span>
                    <span><strong style={{ color: '#7c3aed' }}>{data.aiQualityMetrics.doctorDraftAcceptanceRate == null ? 'Not reported' : `${data.aiQualityMetrics.doctorDraftAcceptanceRate}%`}</strong><small className="muted small" style={{ marginLeft: 8 }}>{data.aiQualityMetrics.doctorDraftReviewSampleCount} reviewed</small></span>
                  </div>
                  <p className="muted small">Counted only when every suggested field was confirmed without correction or rejection.</p>
                  <div style={{ width: '100%', height: 10, background: '#eef2ff', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${data.aiQualityMetrics.doctorDraftAcceptanceRate ?? 0}%`, height: '100%', background: '#7c3aed' }} />
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid var(--line)' }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                      <Clock size={16} /> Average AI Processing Time
                    </span>
                    <span><strong>{data.aiQualityMetrics.avgProcessingSeconds == null ? 'Not reported' : `${data.aiQualityMetrics.avgProcessingSeconds}s`}</strong><small className="muted small" style={{ marginLeft: 8 }}>{data.aiQualityMetrics.processingSampleCount} consultations</small></span>
                  </div>
                  <p className="muted small">Includes speech, OCR, and clinical-summary calls; excludes doctor review time.</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Top Diagnoses and Drug Class Distribution */}
          <div className="grid-2">
            <Card title="Primary Diagnoses Treated">
              <div className="stack" style={{ gap: 12 }}>
                {data.topConditions.length === 0 ? <EmptyState title="No diagnosis data" hint="Diagnoses from completed consultations will appear here." /> : data.topConditions.map(c => (
                  <div key={c.label}>
                    <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.88rem' }}>{c.label}</span>
                      <span className="muted small">{c.count} cases ({c.percentage}%)</span>
                    </div>
                    <div style={{ width: '100%', height: 8, background: 'var(--line)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${c.percentage}%`, height: '100%', background: 'var(--primary)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Prescribed Drug Classes">
              <div className="stack" style={{ gap: 12 }}>
                {data.prescribedDrugClasses.length === 0 ? <EmptyState title="No prescription data" hint="Prescribed drug classes will appear after prescriptions are recorded." /> : data.prescribedDrugClasses.map(p => (
                  <div key={p.category}>
                    <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.88rem' }}>{p.category}</span>
                      <strong style={{ fontSize: '0.85rem' }}>{p.share}%</strong>
                    </div>
                    <div style={{ width: '100%', height: 8, background: 'var(--line)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${p.share}%`, height: '100%', background: '#10b981' }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </>
  )
}
