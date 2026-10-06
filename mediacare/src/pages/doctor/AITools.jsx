import { useState, useEffect } from 'react'
import { Sparkles, AlertTriangle, ShieldCheck, FileText, HelpCircle, Check, Copy, ArrowRight, Pill, RefreshCw } from 'lucide-react'
import { aiToolsApi } from '../../services/api'
import { Card, PageHeader, LoadingState, ErrorState, AIDraftBanner, StatusBadge } from '../../components/common/ui'

const SAMPLE_NOTE = `Patient 52yo male with history of mild HTN and dyslipidemia presenting with 3-day history of productive cough, low-grade fever (37.9 C), and mild exertional dyspnea. Auscultation reveals bilateral coarse crackles at lung bases. BP 138/86 mmHg, HR 82 bpm, SpO2 96% on room air. Prescribed Amoxicillin/Clavulanate 875/125mg BID x 7 days, encouraged oral fluids, advised isolation until afebrile 24h.`

export default function AITools() {
  const [tab, setTab] = useState('interactions')

  return (
    <>
      <PageHeader
        title="AI Clinical Tools"
        subtitle="Decision support suite: drug-drug interaction safety, clinical summarization, and medical guideline assistant."
      />

      <div className="tabs" role="tablist">
        <button
          className={tab === 'interactions' ? 'on' : ''}
          onClick={() => setTab('interactions')}
          role="tab"
          aria-selected={tab === 'interactions'}
        >
          <Pill size={16} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
          Drug Interaction Checker
        </button>
        <button
          className={tab === 'summarizer' ? 'on' : ''}
          onClick={() => setTab('summarizer')}
          role="tab"
          aria-selected={tab === 'summarizer'}
        >
          <FileText size={16} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
          Clinical Summarizer
        </button>
        <button
          className={tab === 'assistant' ? 'on' : ''}
          onClick={() => setTab('assistant')}
          role="tab"
          aria-selected={tab === 'assistant'}
        >
          <Sparkles size={16} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
          Guideline Assistant
        </button>
      </div>

      {tab === 'interactions' && <InteractionChecker />}
      {tab === 'summarizer' && <ClinicalSummarizer />}
      {tab === 'assistant' && <GuidelineAssistant />}
    </>
  )
}

function InteractionChecker() {
  const [drugs, setDrugs] = useState(['Warfarin', 'Aspirin'])
  const [inputVal, setInputVal] = useState('')
  const [available, setAvailable] = useState([])
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)

  useEffect(() => {
    aiToolsApi.getDrugList().then(setAvailable)
  }, [])

  const addDrug = (name) => {
    const trimmed = name.trim()
    if (trimmed && !drugs.map(d => d.toLowerCase()).includes(trimmed.toLowerCase())) {
      setDrugs([...drugs, trimmed])
      setInputVal('')
      setResults(null)
    }
  }

  const removeDrug = (index) => {
    setDrugs(drugs.filter((_, i) => i !== index))
    setResults(null)
  }

  const check = async () => {
    if (drugs.length < 2) return
    setLoading(true)
    try {
      const res = await aiToolsApi.checkInteractions(drugs)
      setResults(res)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="stack">
      <Card title="Drug-to-Drug Interaction Analysis">
        <p className="muted small" style={{ marginBottom: 12 }}>
          Check for pharmacokinetic & pharmacodynamic interactions across multiple concurrent medications.
        </p>

        <div className="row" style={{ marginBottom: 12 }}>
          <label className="field grow" style={{ maxWidth: 400 }}>
            <span>Add Medication</span>
            <div className="row">
              <input
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDrug(inputVal) } }}
                placeholder="Type drug name (e.g., Warfarin, Metformin)"
                list="drug-suggestions"
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => addDrug(inputVal)}
                disabled={!inputVal.trim()}
              >
                Add
              </button>
            </div>
            <datalist id="drug-suggestions">
              {available.map(d => <option key={d} value={d} />)}
            </datalist>
          </label>

          <div style={{ alignSelf: 'flex-end', marginBottom: 6 }}>
            <span className="muted small" style={{ display: 'block', marginBottom: 4 }}>Quick test pairs:</span>
            <div className="row">
              <button type="button" className="btn btn-sm" onClick={() => { setDrugs(['Warfarin', 'Aspirin']); setResults(null) }}>Warfarin + Aspirin</button>
              <button type="button" className="btn btn-sm" onClick={() => { setDrugs(['Lisinopril', 'Spironolactone']); setResults(null) }}>Lisinopril + Spironolactone</button>
              <button type="button" className="btn btn-sm" onClick={() => { setDrugs(['Amlodipine', 'Paracetamol']); setResults(null) }}>Amlodipine + Paracetamol</button>
            </div>
          </div>
        </div>

        <div className="tags" style={{ marginBottom: 16 }}>
          {drugs.map((d, i) => (
            <span key={i} className="tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.9rem', padding: '6px 12px' }}>
              <Pill size={14} />
              <strong>{d}</strong>
              <button
                type="button"
                onClick={() => removeDrug(i)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'bold' }}
                title="Remove"
              >
                ×
              </button>
            </span>
          ))}
        </div>

        <div className="row">
          <button
            className="btn btn-primary"
            onClick={check}
            disabled={drugs.length < 2 || loading}
          >
            <Sparkles size={16} />
            {loading ? 'Evaluating interactions…' : `Analyze Interactions (${drugs.length} drugs)`}
          </button>
          {drugs.length < 2 && <span className="muted small">Add at least 2 medications to run interaction analysis.</span>}
        </div>
      </Card>

      {results && (
        <Card title="Analysis Results" action={<span className="badge badge-purple"><Sparkles size={12} /> AI Assisted</span>}>
          {results.interactions.length === 0 ? (
            <div className="state" style={{ padding: '24px 0' }}>
              <ShieldCheck size={36} color="var(--green)" />
              <strong>No Known Critical Interactions Detected</strong>
              <span className="muted">No direct contraindicated interactions found between {drugs.join(', ')} in the active formulary.</span>
            </div>
          ) : (
            <div className="stack">
              <div className="alert err">
                <strong>Attention Required:</strong> Found {results.interactions.length} potential interaction(s) requiring clinical review.
              </div>

              {results.interactions.map((it, idx) => (
                <div key={idx} className="med conflict" style={{ padding: 16 }}>
                  <div className="med-head">
                    <strong>{it.drugs.join(' ↔ ')}</strong>
                    <span className={`badge ${it.severity === 'High' ? 'badge-red' : it.severity === 'Moderate' ? 'badge-orange' : 'badge-blue'}`}>
                      <AlertTriangle size={12} style={{ marginRight: 4 }} />
                      {it.severity} Severity
                    </span>
                  </div>
                  <div>
                    <strong>Effect:</strong> {it.effect}
                  </div>
                  <p className="muted small">{it.description}</p>
                  <div style={{ marginTop: 8, background: '#fff', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)' }}>
                    <strong>Clinical Action:</strong> {it.recommendation}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

function ClinicalSummarizer() {
  const [note, setNote] = useState(SAMPLE_NOTE)
  const [format, setFormat] = useState('soap')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)

  const summarize = async () => {
    if (!note.trim()) return
    setLoading(true)
    try {
      const res = await aiToolsApi.summarizeClinicalText(note, format)
      setResult(res)
    } finally {
      setLoading(false)
    }
  }

  const copy = () => {
    if (!result?.summary) return
    navigator.clipboard.writeText(result.summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="split">
      <Card title="Source Clinical Notes">
        <label className="field">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span>Unstructured Clinical Text / Dictation</span>
            <button
              type="button"
              className="link"
              onClick={() => setNote(SAMPLE_NOTE)}
            >
              Reset to sample
            </button>
          </div>
          <textarea
            rows={10}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Paste clinical progress notes, consultation dictation, or findings..."
          />
        </label>

        <div className="row" style={{ marginTop: 12 }}>
          <label className="field grow">
            <span>Target Output Format</span>
            <select value={format} onChange={e => setFormat(e.target.value)}>
              <option value="soap">SOAP Note (Subjective, Objective, Assessment, Plan)</option>
              <option value="discharge">Patient Discharge Instructions</option>
            </select>
          </label>
        </div>

        <div style={{ marginTop: 16 }}>
          <button
            className="btn btn-primary"
            onClick={summarize}
            disabled={!note.trim() || loading}
          >
            <Sparkles size={16} />
            {loading ? 'Synthesizing Summary…' : 'Generate Summary'}
          </button>
        </div>
      </Card>

      <Card
        title="Synthesized Output"
        action={
          result && (
            <button className="btn btn-sm" onClick={copy}>
              {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
            </button>
          )
        }
      >
        {loading && <LoadingState label="Analyzing clinical notes with LLM…" />}
        {!loading && !result && (
          <div className="state" style={{ padding: '40px 0' }}>
            <FileText size={32} />
            <strong>No summary generated yet</strong>
            <span className="muted">Click "Generate Summary" to extract structured documentation.</span>
          </div>
        )}
        {!loading && result && (
          <div className="stack">
            <AIDraftBanner>
              — Generated format: <strong>{result.style.toUpperCase()}</strong>. Review accuracy before placing in patient EHR.
            </AIDraftBanner>
            <pre style={{
              background: '#f8fafc',
              border: '1px solid var(--line)',
              borderRadius: 10,
              padding: 16,
              fontFamily: 'inherit',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6,
              fontSize: '0.9rem',
              color: 'var(--text)'
            }}>
              {result.summary}
            </pre>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--muted)' }}>
              <span>Readability: {result.readabilityScore}</span>
              <span>Generated at: {result.timestamp}</span>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

function GuidelineAssistant() {
  const [query, setQuery] = useState('')
  const [history, setHistory] = useState([
    {
      query: 'What are the first-line pharmacotherapies for uncomplicated hypertension?',
      answer: 'AHA/ACC Guidelines: First-line agents include thiazide diuretics, CCBs (e.g. Amlodipine), and ACE inhibitors / ARBs. Target BP < 130/80 mmHg in most adult populations.',
      source: 'MediCare Clinical AI Knowledge Base (Mock)',
      timestamp: 'Today, 09:15 AM'
    }
  ])
  const [loading, setLoading] = useState(false)

  const ask = async (qText) => {
    const q = (qText || query).trim()
    if (!q) return
    setLoading(true)
    try {
      const res = await aiToolsApi.queryAssistant(q)
      setHistory(prev => [res, ...prev])
      setQuery('')
    } finally {
      setLoading(false)
    }
  }

  const SUGGESTIONS = [
    'GINA 2024 recommendations for asthma reliever therapy',
    'Target blood pressure thresholds in diabetic adults',
    'Metformin renal safety dosage guidelines'
  ]

  return (
    <div className="stack">
      <Card title="Clinical Guideline & Protocol Assistant">
        <p className="muted small" style={{ marginBottom: 12 }}>
          Query evidence-based medical literature, clinical practice guidelines, and medication titration protocols.
        </p>

        <div className="row" style={{ marginBottom: 10 }}>
          <input
            style={{ flex: 1, minWidth: 260 }}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') ask() }}
            placeholder="Ask a clinical question (e.g. 'Asthma step-up treatment protocol')..."
          />
          <button className="btn btn-primary" onClick={() => ask()} disabled={!query.trim() || loading}>
            <Sparkles size={16} />
            {loading ? 'Searching…' : 'Ask Assistant'}
          </button>
        </div>

        <div className="row" style={{ gap: 6 }}>
          <span className="muted small">Quick queries:</span>
          {SUGGESTIONS.map((s, i) => (
            <button key={i} type="button" className="btn btn-sm" onClick={() => { setQuery(s); ask(s) }}>
              {s}
            </button>
          ))}
        </div>
      </Card>

      <Card title="Knowledge Feed">
        <div className="stack">
          {history.map((h, idx) => (
            <div key={idx} style={{
              border: '1px solid var(--line)',
              borderRadius: 12,
              padding: 16,
              background: '#fff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span className="badge badge-blue">Clinical Inquiry</span>
                <strong>{h.query}</strong>
                <span className="muted small" style={{ marginLeft: 'auto' }}>{h.timestamp}</span>
              </div>
              <div style={{
                background: '#f9faff',
                padding: '12px 14px',
                borderRadius: 8,
                borderLeft: '4px solid var(--primary)',
                fontSize: '0.9rem',
                lineHeight: 1.5
              }}>
                {h.answer}
              </div>
              <div className="row" style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--muted)' }}>
                <span>Source: {h.source}</span>
                <span>• Verified Clinical Protocol</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
