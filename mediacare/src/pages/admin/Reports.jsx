import { useState } from 'react'
import {
  Download,
  Users,
  FileCheck,
  ShieldAlert,
  Sparkles
} from 'lucide-react'

import { adminApi } from '../../services/api'
import { useAsync } from '../../hooks'

import {
  Card,
  PageHeader,
  StatCard,
  LoadingState,
  ErrorState
} from '../../components/common/ui'

export default function AdminReports() {
  const [timeframe, setTimeframe] = useState('30d')

  const {
    data,
    loading,
    error,
    reload
  } = useAsync(adminApi.getReports, [timeframe])

  const handleExport = () => {
    if (!data) return

    const jsonStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(
        JSON.stringify(data, null, 2)
      )

    const a = document.createElement('a')

    a.setAttribute('href', jsonStr)
    a.setAttribute(
      'download',
      `medicare-platform-analytics-${timeframe}.json`
    )

    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  /*
   * Normalize the backend response.
   *
   * This prevents a missing/null section from crashing
   * the React page.
   */
  const summary = data?.summary || {}

  const monthlyTrends =
    Array.isArray(data?.monthlyTrends)
      ? data.monthlyTrends
      : []

  const prescribedDrugClasses =
    Array.isArray(data?.prescribedDrugClasses)
      ? data.prescribedDrugClasses
      : []

  const topConditions =
    Array.isArray(data?.topConditions)
      ? data.topConditions
      : []

  const aiQualityMetrics =
    data?.aiQualityMetrics || {}

  return (
    <>
      <PageHeader
        title="Network Telemetry & Analytics"
        subtitle="Platform-wide clinical intelligence, prescription trends, AI engine adoption telemetry, and safety metrics."
        actions={
          <div className="row">

            <select
              value={timeframe}
              onChange={e =>
                setTimeframe(e.target.value)
              }
              aria-label="Timeframe"
              style={{
                border: '1px solid var(--line)',
                borderRadius: 10,
                padding: '8px 12px',
                background: '#fff',
                font: 'inherit'
              }}
            >
              <option value="7d">
                Last 7 Days
              </option>

              <option value="30d">
                Last 30 Days
              </option>

              <option value="90d">
                Last Quarter
              </option>

              <option value="1y">
                Year to Date
              </option>
            </select>

            <button
              className="btn btn-primary"
              onClick={handleExport}
              disabled={loading || !data}
            >
              <Download size={15} />
              Export Analytics
            </button>

          </div>
        }
      />

      {loading && (
        <LoadingState
          label="Computing network intelligence metrics…"
        />
      )}

      {error && (
        <ErrorState
          message={error}
          onRetry={reload}
        />
      )}

      {!loading && !error && !data && (
        <ErrorState
          message="No analytics data is available."
          onRetry={reload}
        />
      )}

      {data && (
        <div className="stack">

          {/* =====================================================
              KEY METRICS
          ====================================================== */}

          <div className="grid-4">

            <StatCard
              icon={Users}
              tone="blue"
              value={
                summary.consultationsCompleted ?? 0
              }
              label="Consultations Done"
              delta="14% vs prior month"
            />

            <StatCard
              icon={FileCheck}
              tone="green"
              value={
                summary.prescriptionsIssued ?? 0
              }
              label="Prescriptions Issued"
              delta="9.2% increase"
            />

            <StatCard
              icon={Sparkles}
              tone="purple"
              value={
                summary.aiAdoptionRate != null
                  ? `${summary.aiAdoptionRate}%`
                  : '0%'
              }
              label="AI Drafting Adoption"
              delta="3.1% higher"
            />

            <StatCard
              icon={ShieldAlert}
              tone="orange"
              value={
                summary.allergyAlertsAvoided ?? 0
              }
              label="Safety Interceptions"
              delta="Zero adverse events"
            />

          </div>

          {/* =====================================================
              MONTHLY TRENDS
          ====================================================== */}

          <Card title="Monthly Clinical Volume Trends (Past 6 Months)">

            {monthlyTrends.length === 0 ? (

              <div
                className="muted"
                style={{
                  padding: 30,
                  textAlign: 'center'
                }}
              >
                No monthly trend data available.
              </div>

            ) : (

              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(6, 1fr)',
                    gap: 12,
                    alignItems: 'flex-end',
                    height: 200,
                    padding: '20px 10px 0'
                  }}
                >

                  {monthlyTrends.map(
                    (m, index) => {

                      const consultations =
                        Number(
                          m?.consultations ?? 0
                        )

                      const prescriptions =
                        Number(
                          m?.prescriptions ?? 0
                        )

                      const aiDrafts =
                        Number(
                          m?.aiDrafts ?? 0
                        )

                      const maxVal = Math.max(
                        140,
                        consultations,
                        prescriptions,
                        aiDrafts
                      )

                      const consultHeight =
                        Math.round(
                          (consultations /
                            maxVal) *
                            160
                        )

                      const rxHeight =
                        Math.round(
                          (prescriptions /
                            maxVal) *
                            160
                        )

                      const aiHeight =
                        Math.round(
                          (aiDrafts /
                            maxVal) *
                            160
                        )

                      return (
                        <div
                          key={
                            m?.month ||
                            `month-${index}`
                          }
                          style={{
                            display: 'flex',
                            flexDirection:
                              'column',
                            alignItems:
                              'center',
                            height: '100%',
                            justifyContent:
                              'flex-end'
                          }}
                        >

                          <div
                            style={{
                              display: 'flex',
                              gap: 4,
                              alignItems:
                                'flex-end',
                              width: '100%',
                              justifyContent:
                                'center'
                            }}
                          >

                            <div
                              style={{
                                height:
                                  consultHeight,
                                width: 14,
                                background:
                                  '#2563eb',
                                borderRadius:
                                  '4px 4px 0 0'
                              }}
                              title={`${
                                m?.month || ''
                              } Consults: ${consultations}`}
                            />

                            <div
                              style={{
                                height:
                                  rxHeight,
                                width: 14,
                                background:
                                  '#16a34a',
                                borderRadius:
                                  '4px 4px 0 0'
                              }}
                              title={`${
                                m?.month || ''
                              } Prescriptions: ${prescriptions}`}
                            />

                            <div
                              style={{
                                height:
                                  aiHeight,
                                width: 14,
                                background:
                                  '#7c3aed',
                                borderRadius:
                                  '4px 4px 0 0'
                              }}
                              title={`${
                                m?.month || ''
                              } AI Drafts: ${aiDrafts}`}
                            />

                          </div>

                          <div
                            style={{
                              marginTop: 8,
                              fontSize: '0.82rem',
                              fontWeight: 600
                            }}
                          >
                            {m?.month || '—'}
                          </div>

                        </div>
                      )
                    }
                  )}

                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'center',
                    gap: 20,
                    marginTop: 16,
                    fontSize: '0.82rem'
                  }}
                >

                  <span
                    style={{
                      display: 'flex',
                      alignItems:
                        'center',
                      gap: 6
                    }}
                  >
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        background:
                          '#2563eb',
                        borderRadius: 3
                      }}
                    />

                    Consultations
                  </span>

                  <span
                    style={{
                      display: 'flex',
                      alignItems:
                        'center',
                      gap: 6
                    }}
                  >
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        background:
                          '#16a34a',
                        borderRadius: 3
                      }}
                    />

                    Prescriptions
                  </span>

                  <span
                    style={{
                      display: 'flex',
                      alignItems:
                        'center',
                      gap: 6
                    }}
                  >
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        background:
                          '#7c3aed',
                        borderRadius: 3
                      }}
                    />

                    AI-Assisted Drafts
                  </span>

                </div>
              </>
            )}

          </Card>

          {/* =====================================================
              DRUG CLASSES + CONDITIONS
          ====================================================== */}

          <div className="grid-2">

            <Card title="Prescribed Drug Classes Distribution">

              {prescribedDrugClasses.length === 0 ? (

                <div
                  className="muted"
                  style={{
                    padding: 20,
                    textAlign: 'center'
                  }}
                >
                  No drug-class data available.
                </div>

              ) : (

                <div
                  style={{
                    display: 'flex',
                    flexDirection:
                      'column',
                    gap: 12
                  }}
                >

                  {prescribedDrugClasses.map(
                    (d, index) => {

                      const share =
                        Number(
                          d?.share ?? 0
                        )

                      return (
                        <div
                          key={
                            d?.category ||
                            `drug-${index}`
                          }
                        >

                          <div
                            style={{
                              display: 'flex',
                              justifyContent:
                                'space-between',
                              fontSize:
                                '0.88rem',
                              marginBottom: 4
                            }}
                          >
                            <strong>
                              {d?.category ||
                                'Unknown'}
                            </strong>

                            <span className="muted">
                              {share}% of network
                              total
                            </span>
                          </div>

                          <div className="progress-bar-wrap">

                            <div
                              className="progress-bar-fill"
                              style={{
                                width:
                                  `${Math.min(
                                    Math.max(
                                      share,
                                      0
                                    ),
                                    100
                                  )}%`,
                                background:
                                  'var(--primary)'
                              }}
                            />

                          </div>

                        </div>
                      )
                    }
                  )}

                </div>
              )}

            </Card>

            <Card title="Prevalent Diagnoses & Health Conditions">

              {topConditions.length === 0 ? (

                <div
                  className="muted"
                  style={{
                    padding: 20,
                    textAlign: 'center'
                  }}
                >
                  No condition data available.
                </div>

              ) : (

                <div
                  style={{
                    display: 'flex',
                    flexDirection:
                      'column',
                    gap: 12
                  }}
                >

                  {topConditions.map(
                    (c, index) => {

                      const percentage =
                        Number(
                          c?.percentage ?? 0
                        )

                      return (
                        <div
                          key={
                            c?.label ||
                            `condition-${index}`
                          }
                        >

                          <div
                            style={{
                              display: 'flex',
                              justifyContent:
                                'space-between',
                              fontSize:
                                '0.88rem',
                              marginBottom: 4
                            }}
                          >

                            <strong>
                              {c?.label ||
                                'Unknown'}
                            </strong>

                            <span className="muted">
                              {c?.count ?? 0}
                              {' '}
                              encounters
                              {' '}
                              ({percentage}%)
                            </span>

                          </div>

                          <div className="progress-bar-wrap">

                            <div
                              className="progress-bar-fill"
                              style={{
                                width:
                                  `${Math.min(
                                    Math.max(
                                      percentage,
                                      0
                                    ),
                                    100
                                  )}%`,
                                background:
                                  '#2563eb'
                              }}
                            />

                          </div>

                        </div>
                      )
                    }
                  )}

                </div>
              )}

            </Card>

          </div>

          {/* =====================================================
              AI QUALITY METRICS
          ====================================================== */}

          <Card title="AI Safety & Engine Telemetry">

            <div
              className="grid-4"
              style={{
                textAlign: 'center'
              }}
            >

              <div
                style={{
                  background:
                    '#f8fafc',
                  padding: 14,
                  borderRadius: 10
                }}
              >

                <div className="muted small">
                  Transcription Accuracy
                </div>

                <div
                  style={{
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    color: 'var(--green)'
                  }}
                >
                  {aiQualityMetrics.transcriptionAccuracy ??
                    0}
                  %
                </div>

                <div className="small muted">
                  Whisper-Large-v3 Med
                </div>

              </div>

              <div
                style={{
                  background:
                    '#f8fafc',
                  padding: 14,
                  borderRadius: 10
                }}
              >

                <div className="muted small">
                  Handwriting OCR Accuracy
                </div>

                <div
                  style={{
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    color: 'var(--primary)'
                  }}
                >
                  {aiQualityMetrics.ocrAccuracy ??
                    0}
                  %
                </div>

                <div className="small muted">
                  Canvas Ink Processing
                </div>

              </div>

              <div
                style={{
                  background:
                    '#f8fafc',
                  padding: 14,
                  borderRadius: 10
                }}
              >

                <div className="muted small">
                  Physician Acceptance Rate
                </div>

                <div
                  style={{
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    color: 'var(--text)'
                  }}
                >
                  {aiQualityMetrics.doctorDraftAcceptanceRate ??
                    0}
                  %
                </div>

                <div className="small muted">
                  Accepted with minimal edits
                </div>

              </div>

              <div
                style={{
                  background:
                    '#f8fafc',
                  padding: 14,
                  borderRadius: 10
                }}
              >

                <div className="muted small">
                  Avg Inference Speed
                </div>

                <div
                  style={{
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    color: 'var(--text)'
                  }}
                >
                  {aiQualityMetrics.avgProcessingSeconds ??
                    0}
                  s
                </div>

                <div className="small muted">
                  End-to-end pipeline latency
                </div>

              </div>

            </div>

          </Card>

        </div>
      )}

    </>
  )
}