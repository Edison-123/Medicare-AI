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

const TREND_SERIES = [
  { key: 'consultations', label: 'Consultations', color: '#2563eb' },
  { key: 'prescriptions', label: 'Prescriptions', color: '#16a34a' },
  { key: 'aiDrafts', label: 'AI-Assisted Drafts', color: '#7c3aed' }
]

export default function AdminReports() {
  const [timeframe, setTimeframe] = useState('30d')
  const [visibleSeries, setVisibleSeries] = useState({ consultations: true, prescriptions: true, aiDrafts: true })
  const [selectedTrendMonth, setSelectedTrendMonth] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')

  const {
    data,
    loading,
    error,
    reload
  } = useAsync(() => adminApi.getReports(timeframe), [timeframe])

  const handleExport = async () => {
    if (!data) return
    setExporting(true)
    setExportError('')
    try {
      const { default: ExcelJS } = await import('exceljs')
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'MediCare AI'
      workbook.subject = 'Platform analytics'
      workbook.created = new Date()

      const addTableSheet = (name, columns, rows) => {
        const worksheet = workbook.addWorksheet(name)
        worksheet.columns = columns
        worksheet.addRows(rows)
        worksheet.views = [{ state: 'frozen', ySplit: 1 }]
        worksheet.autoFilter = {
          from: 'A1',
          to: `${worksheet.getColumn(columns.length).letter}${Math.max(rows.length + 1, 1)}`
        }
        worksheet.getRow(1).height = 24
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF245B63' } }
        worksheet.eachRow((row, rowNumber) => {
          row.eachCell(cell => {
            cell.alignment = { vertical: 'top', wrapText: rowNumber > 1 }
            if (rowNumber > 1 && rowNumber % 2 === 0) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F7F6' } }
            }
          })
        })
        return worksheet
      }

      const summaryLabels = {
        totalPatients: 'Total Patients',
        consultationsCompleted: 'Completed Consultations',
        prescriptionsIssued: 'Prescriptions Issued',
        aiAdoptionRate: 'AI Adoption Rate (%)',
        avgConsultTimeMinutes: 'Average Consultation (Minutes)',
        allergyAlertsAvoided: 'Safety Interceptions'
      }
      const overviewRows = [
        { metric: 'Selected period', value: data.timeframe ?? timeframe },
        { metric: 'Generated', value: new Date().toLocaleString() },
        ...Object.entries(data.summary || {}).map(([key, value]) => ({ metric: summaryLabels[key] || key, value })),
        ...(Array.isArray(data.kpis) ? data.kpis : []).map(kpi => ({ metric: kpi.label || kpi.key, value: kpi.value }))
      ]

      addTableSheet('Overview', [
        { header: 'Metric', key: 'metric', width: 38 },
        { header: 'Value', key: 'value', width: 24 }
      ], overviewRows)

      addTableSheet('Monthly Trends', [
        { header: 'Month', key: 'month', width: 18 },
        { header: 'Consultations', key: 'consultations', width: 20 },
        { header: 'Prescriptions', key: 'prescriptions', width: 20 },
        { header: 'AI-Assisted Drafts', key: 'aiDrafts', width: 22 }
      ], Array.isArray(data.monthlyTrends) ? data.monthlyTrends : [])

      addTableSheet('Top Conditions', [
        { header: 'Condition', key: 'label', width: 42 },
        { header: 'Prescription Count', key: 'count', width: 22 },
        { header: 'Share (%)', key: 'percentage', width: 16 }
      ], Array.isArray(data.topConditions) ? data.topConditions : [])

      addTableSheet('Drug Classes', [
        { header: 'Drug Class', key: 'category', width: 36 },
        { header: 'Share (%)', key: 'share', width: 16 }
      ], Array.isArray(data.prescribedDrugClasses) ? data.prescribedDrugClasses : [])

      addTableSheet('Hospitals', [
        { header: 'Hospital', key: 'name', width: 36 },
        { header: 'Code', key: 'code', width: 18 },
        { header: 'Consultations', key: 'consults', width: 20 },
        { header: 'Share (%)', key: 'share', width: 16 },
        { header: 'Status', key: 'status', width: 18 }
      ], Array.isArray(data.hospitalDistribution) ? data.hospitalDistribution : [])

      addTableSheet('System Health', [
        { header: 'Metric', key: 'metric', width: 36 },
        { header: 'Value', key: 'value', width: 34 }
      ], Object.entries(data.systemHealth || {}).map(([metric, value]) => ({ metric, value })))

      addTableSheet('AI Quality', [
        { header: 'Metric', key: 'metric', width: 36 },
        { header: 'Value', key: 'value', width: 34 }
      ], Object.entries(data.aiQualityMetrics || {}).map(([metric, value]) => ({ metric, value })))

      const buffer = await workbook.xlsx.writeBuffer()
      const url = URL.createObjectURL(new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `medicare-platform-analytics-${timeframe}.xlsx`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (exportFailure) {
      setExportError(exportFailure.message || 'Could not generate the Excel workbook.')
    } finally {
      setExporting(false)
    }
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
  const selectedTrend = monthlyTrends.find(month => month.month === selectedTrendMonth)
    || monthlyTrends[monthlyTrends.length - 1]

  const toggleTrendSeries = (key) => {
    setVisibleSeries(current => {
      if (current[key] && Object.values(current).filter(Boolean).length === 1) return current
      return { ...current, [key]: !current[key] }
    })
  }

  const prescribedDrugClasses =
    Array.isArray(data?.prescribedDrugClasses)
      ? data.prescribedDrugClasses
      : []

  const topConditions =
    Array.isArray(data?.topConditions)
      ? data.topConditions
      : []

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
              disabled={loading || !data || exporting}
            >
              <Download size={15} />
              {exporting ? 'Preparing workbook…' : 'Export Excel'}
            </button>

          </div>
        }
      />

      {exportError && <div className="alert err" role="alert">{exportError}</div>}

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
            />

            <StatCard
              icon={FileCheck}
              tone="green"
              value={
                summary.prescriptionsIssued ?? 0
              }
              label="Prescriptions Issued"
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
            />

            <StatCard
              icon={ShieldAlert}
              tone="orange"
              value={
                summary.allergyAlertsAvoided ?? 0
              }
              label="Safety Interceptions"
            />

          </div>

          {/* =====================================================
              MONTHLY TRENDS
          ====================================================== */}

          <Card title="Monthly Clinical Volume Trends (Selected Period)">

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
                    gridTemplateColumns: 'repeat(auto-fit, minmax(64px, 1fr))',
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

                      const maxVal = Math.max(140,
                        visibleSeries.consultations ? consultations : 0,
                        visibleSeries.prescriptions ? prescriptions : 0,
                        visibleSeries.aiDrafts ? aiDrafts : 0)

                      const consultHeight =
                        visibleSeries.consultations ? Math.round(
                          (consultations /
                            maxVal) *
                            160
                        ) : 0

                      const rxHeight =
                        visibleSeries.prescriptions ? Math.round(
                          (prescriptions /
                            maxVal) *
                            160
                        ) : 0

                      const aiHeight =
                        visibleSeries.aiDrafts ? Math.round(
                          (aiDrafts /
                            maxVal) *
                            160
                        ) : 0

                      return (
                        <button
                          type="button"
                          key={
                            m?.month ||
                            `month-${index}`
                          }
                          aria-label={`${m?.month || 'Month'} clinical volumes: ${consultations} consultations, ${prescriptions} prescriptions, ${aiDrafts} AI-assisted drafts`}
                          aria-pressed={selectedTrend?.month === m?.month}
                          onClick={() => setSelectedTrendMonth(m?.month || null)}
                          style={{
                            all: 'unset',
                            boxSizing: 'border-box',
                            minWidth: 0,
                            cursor: 'pointer',
                            color: 'inherit',
                            font: 'inherit',
                            display: 'flex',
                            flexDirection:
                              'column',
                            alignItems:
                              'center',
                            height: '100%',
                            justifyContent:
                              'flex-end',
                            borderRadius: 8,
                            background: selectedTrend?.month === m?.month ? 'var(--bg)' : 'transparent'
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
                                display: visibleSeries.consultations ? 'block' : 'none',
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
                                display: visibleSeries.prescriptions ? 'block' : 'none',
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
                                display: visibleSeries.aiDrafts ? 'block' : 'none',
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

                        </button>
                      )
                    }
                  )}

                </div>

                {selectedTrend && (
                  <div aria-live="polite" style={{ margin: '14px 10px 0', padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 8 }}>
                    <strong>{selectedTrend.month} volumes</strong>
                    <div className="row" style={{ marginTop: 6, gap: 14 }}>
                      {TREND_SERIES.filter(series => visibleSeries[series.key]).map(series => (
                        <span key={series.key} style={{ fontSize: '0.82rem' }}>
                          {series.label}: <strong>{selectedTrend[series.key] ?? 0}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'center',
                    gap: 8,
                    marginTop: 16,
                    fontSize: '0.82rem',
                    flexWrap: 'wrap'
                  }}
                >

                  {TREND_SERIES.map(series => (
                    <button
                      key={series.key}
                      type="button"
                      aria-pressed={visibleSeries[series.key]}
                      onClick={() => toggleTrendSeries(series.key)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        border: `1px solid ${visibleSeries[series.key] ? series.color : 'var(--line)'}`,
                        borderRadius: 8,
                        padding: '6px 9px',
                        background: visibleSeries[series.key] ? '#fff' : 'var(--bg)',
                        color: visibleSeries[series.key] ? 'var(--text)' : 'var(--muted)',
                        font: 'inherit',
                        fontSize: '0.82rem',
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ width: 10, height: 10, background: series.color, borderRadius: 3, opacity: visibleSeries[series.key] ? 1 : 0.35 }} />
                      {series.label}
                    </button>
                  ))}

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

        </div>
      )}

    </>
  )
}