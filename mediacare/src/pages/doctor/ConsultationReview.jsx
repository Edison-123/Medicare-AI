import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { AlertTriangle, Sparkles, Printer, FileText, Share2, ClipboardCheck, MessageSquare, ArrowRight } from 'lucide-react'
import { consultationsApi } from '../../services/api'
import { speechToText, llm } from '../../services/ai'
import { useAuth } from '../../context/AuthContext'
import { useAsync } from '../../hooks'
import Recorder from '../../components/ai/Recorder'
import { Avatar, Card, StatusBadge, PageHeader, LoadingState, ErrorState, ConfirmationDialog, AIDraftBanner, Modal } from '../../components/common/ui'

const DRAFT_FIELDS = [['chiefComplaint', 'Chief complaint'], ['symptoms', 'Symptoms'], ['diagnosis', 'Diagnosis'], ['medications', 'Medications'],
  ['investigations', 'Investigations'], ['plan', 'Treatment plan'], ['followUp', 'Follow-up']]

const F = ({ label, children }) => <label className="field">{label}{children}</label>

export default function ConsultationReview({ data, initialAi }) {
  const nav = useNavigate(); const { user } = useAuth(); const consultationId = data.id
  const defaultForm = { chiefComplaint:'', symptoms:'', vitals:{ bp:'', hr:'', temp:'', spo2:'' }, exam:'', diagnosis:'', notes:'', plan:'', followUp:'' }
  const defaultAi = { transcript:'', handwritten:'', stt:'Idle', llm:'Idle', draft:null }
  const [form, setForm] = useState({ ...defaultForm, ...(data.form || {}), vitals:{ ...defaultForm.vitals, ...(data.form?.vitals || {}) } })
  const [ai, setAi] = useState({ ...defaultAi, ...(initialAi || {}) })
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(null); const [dialog, setDialog] = useState(null)
  const [labTests, setLabTests] = useState('Complete Blood Count (CBC)\nSerum Electrolytes\nChest X-Ray (PA View)')


  const p = data.patientInfo, locked = data.status === 'Completed' || data.status === 'Cancelled'
  const set = (k, v) => setForm(f => ({ ...f, [k]: v })); const setVital = (k, v) => setForm(f => ({ ...f, vitals:{ ...f.vitals, [k]: v } }))
  const patchAi = x => setAi(a => ({ ...a, ...x })); const flash = (type, text) => setMsg({ type, text })

  const transcribe = async audio => {
    patchAi({ stt:'Processing' }); setMsg(null)
    try { const r = await speechToText.transcribe(audio, { consultationId }); patchAi({ transcript:r.text, stt:'Completed', sttProvider:r.provider }) }
    catch { patchAi({ stt:'Failed' }); flash('err', 'Transcription failed. Record again or upload a different file.') }
  }
  const summarize = async () => {
    patchAi({ llm:'Processing' }); setMsg(null)
    try { const r = await llm.summarize({ transcript:ai.transcript, handwritten:ai.handwritten, notes:form.notes })
      patchAi({ llm:'Completed', draft:{ fields:r.fields, provider:r.provider, review:'Pending', reviewedBy:null } }) }
    catch { patchAi({ llm:'Failed' }); flash('err', 'Summary generation failed. Try again.') }
  }
  const editDraft = (k, v) => patchAi({ draft:{ ...ai.draft, fields:{ ...ai.draft.fields, [k]: v } } })
  const applyDraft = () => { // explicit doctor action: the only way AI text enters the record
    const d = ai.draft.fields
    setForm(f => ({ ...f, chiefComplaint:d.chiefComplaint || f.chiefComplaint, symptoms:d.symptoms || f.symptoms, diagnosis:d.diagnosis || f.diagnosis,
      plan:d.plan || f.plan, followUp:d.followUp || f.followUp,
      notes:[f.notes, d.medications && `Medications (AI-assisted): ${d.medications}`, d.investigations && `Investigations (AI-assisted): ${d.investigations}`].filter(Boolean).join('\n') }))
    patchAi({ draft:{ ...ai.draft, review:'Reviewed', reviewedBy:user.name }, llm:'Reviewed' }); setDialog(null)
    flash('ok', 'AI draft applied to the consultation. Review the fields below, then save.')
  }
  const save = async status => {
    setBusy(true); setMsg(null)
    try { await consultationsApi.save(consultationId, { form, ai, status })
      if (status === 'Completed') nav('/doctor/consultations'); else flash('ok', 'Consultation saved.') }
    catch (e) { flash('err', e.message) } finally { setBusy(false); setDialog(null) }
  }
  const pending = ai.draft && ai.draft.review !== 'Reviewed'
  const canSummarize = !locked && (String(ai.transcript || '').trim() || String(ai.handwritten || '').trim() || String(form.notes || '').trim()) && ai.llm !== 'Processing'

  return <>
    <PageHeader title={`Consultation — ${data.patient}`} subtitle={`${data.date} • ${data.time} • ${data.type}`}
      actions={<>
        <StatusBadge status={data.status} />
        {data.status === 'Completed' && <>
          <button className="btn" onClick={() => setDialog('print')}><Printer size={15} /> Print Summary</button>
          <button className="btn" onClick={() => setDialog('lab')}><ClipboardCheck size={15} /> Order Labs</button>
          <Link className="btn btn-primary" to={`/doctor/prescriptions/new?consultationId=${data.id}`}><FileText size={15} /> Create prescription</Link>
        </>}
        <Link className="btn" to="/doctor/consultations">Back</Link>
      </>} />
    {msg && <div className={`alert ${msg.type === 'err' ? 'err' : 'ok'}`} role={msg.type === 'err' ? 'alert' : 'status'}>{msg.text}</div>}
    <div className="split">
      <aside className="card patient-panel">
        <div className="who"><Avatar name={p.name} size={48} /><div><strong>{p.name}</strong><div className="muted small">{p.age} yrs • {p.gender}</div></div></div>
        <div className={`allergy ${p.allergies.length ? 'has' : ''}`}><AlertTriangle size={16} /> {p.allergies.length ? `Allergies: ${p.allergies.join(', ')}` : 'No known allergies'}</div>
        <dl className="dl one"><dt>Existing conditions</dt><dd>{p.conditions.join(', ') || 'None recorded'}</dd><dt>Current medications</dt><dd>{p.meds.join(', ') || 'None'}</dd></dl>
        <Link className="link" to={`/doctor/patients/${p.id}`}>Open full record</Link>
        {locked && (
          <div style={{ marginTop: 12, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
            <Link className="btn btn-sm block" to="/doctor/messages" style={{ width: '100%', boxSizing: 'border-box' }}>
              <MessageSquare size={14} /> Message Patient
            </Link>
          </div>
        )}
      </aside>

      <div className="stack">
        {locked && (
          <Card title="Post-Consultation Next Steps">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <Link to={`/doctor/prescriptions/new?consultationId=${data.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ padding: 12, border: '1px solid var(--line)', borderRadius: 10, background: '#f8fafc', height: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)' }}>
                    <FileText size={18} />
                    <strong>Create Prescription</strong>
                  </div>
                  <span className="muted small">Generate digital Rx with diagnosis & medications pre-filled.</span>
                </div>
              </Link>

              <div onClick={() => setDialog('lab')} style={{ cursor: 'pointer', padding: 12, border: '1px solid var(--line)', borderRadius: 10, background: '#f8fafc', height: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#16a34a' }}>
                  <ClipboardCheck size={18} />
                  <strong>Order Lab Tests</strong>
                </div>
                <span className="muted small">Request blood panels, imaging, or pathology work.</span>
              </div>

              <div onClick={() => setDialog('print')} style={{ cursor: 'pointer', padding: 12, border: '1px solid var(--line)', borderRadius: 10, background: '#f8fafc', height: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#7c3aed' }}>
                  <Printer size={18} />
                  <strong>Print Visit Summary</strong>
                </div>
                <span className="muted small">Export patient-friendly clinical note and discharge instructions.</span>
              </div>
            </div>
          </Card>
        )}

        <Card title="Consultation workspace">
          <fieldset disabled={locked} className="fs">
            <F label="Chief complaint"><input value={form.chiefComplaint} onChange={e => set('chiefComplaint', e.target.value)} /></F>
            <F label="Symptoms"><textarea rows={2} value={form.symptoms} onChange={e => set('symptoms', e.target.value)} /></F>
            <div className="vitals">{[['bp', 'BP (mmHg)'], ['hr', 'Heart rate'], ['temp', 'Temp (°C)'], ['spo2', 'SpO₂ (%)']].map(([k, l]) =>
              <F key={k} label={l}><input value={form.vitals[k]} onChange={e => setVital(k, e.target.value)} /></F>)}</div>
            <F label="Physical examination"><textarea rows={2} value={form.exam} onChange={e => set('exam', e.target.value)} /></F>
            <F label="Diagnosis"><input value={form.diagnosis} onChange={e => set('diagnosis', e.target.value)} /></F>
            <F label="Clinical notes"><textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} /></F>
            <F label="Treatment plan"><textarea rows={2} value={form.plan} onChange={e => set('plan', e.target.value)} /></F>
            <F label="Follow-up instructions"><input value={form.followUp} onChange={e => set('followUp', e.target.value)} /></F>
          </fieldset>
        </Card>

        {!locked && <Card title="AI assistant" action={<span className="badge badge-purple"><Sparkles size={12} /> Draft only</span>}>
          {(ai.inkImage || ai.handwritten) && <div className="ink-review">
            <div><div className="muted small">Handwritten notes</div>{ai.inkImage && <img className="ink-img" src={ai.inkImage} alt="Handwritten notes from the consultation" />}</div>
            <div>{ai.ocrProvider?.startsWith('mock') && <div className="alert">Demo mode: recognised text is sample text from a mock provider.</div>}
              <F label="Recognised text (editable)"><textarea rows={6} value={ai.handwritten || ''} onChange={e => patchAi({ handwritten:e.target.value })} /></F></div></div>}
          <Recorder onAudio={transcribe} disabled={ai.stt === 'Processing'} />
          <div className="job"><span>Speech-to-text</span><StatusBadge status={ai.stt === 'Idle' ? 'Draft' : ai.stt === 'Processing' ? 'In Progress' : ai.stt} /></div>
          {ai.stt === 'Processing' && <LoadingState label="Transcribing audio…" />}
          {ai.sttProvider?.startsWith('mock') && <div className="alert">Demo mode: this transcript is sample text from a mock provider, not your audio.</div>}
          <F label="Transcript (editable)"><textarea rows={6} value={ai.transcript} placeholder="Record or upload audio to generate a transcript, or paste one here."
            onChange={e => patchAi({ transcript:e.target.value })} /></F>
          <button className="btn btn-primary" disabled={!canSummarize} onClick={summarize}><Sparkles size={16} /> {ai.llm === 'Processing' ? 'Generating…' : ai.draft ? 'Regenerate summary' : 'Generate summary'}</button>

          {ai.draft && <div className="draft">
            <AIDraftBanner>{ai.draft.review === 'Reviewed' ? `— reviewed and applied by ${ai.draft.reviewedBy}.` : undefined}</AIDraftBanner>
            <div className="draft-grid">{DRAFT_FIELDS.map(([k, l]) => <F key={k} label={l}>
              <textarea rows={2} value={ai.draft.fields[k] || ''} onChange={e => editDraft(k, e.target.value)} disabled={ai.draft.review === 'Reviewed'} /></F>)}</div>
            {pending && <div className="row"><button className="btn btn-primary" onClick={() => setDialog('apply')}>Review & apply to consultation</button>
              <button className="btn" onClick={() => patchAi({ draft:null, llm:'Idle' })}>Discard draft</button></div>}
          </div>}
        </Card>}

        {!locked && <div className="row end sticky-actions">
          <button className="btn" disabled={busy} onClick={() => save()}>{busy ? 'Saving…' : 'Save draft'}</button>
          <button className="btn btn-primary" disabled={busy} onClick={() => pending ? flash('err', 'Review the AI draft (apply or discard) before completing this consultation.') : setDialog('complete')}>Complete consultation</button>
        </div>}
      </div>
    </div>

    <ConfirmationDialog open={dialog === 'apply'} title="Apply AI draft?" confirmLabel="Apply draft" onConfirm={applyDraft} onClose={() => setDialog(null)}
      message="AI output can contain errors. By applying it you confirm you have read and edited it, and you remain responsible for the clinical content." />
    <ConfirmationDialog open={dialog === 'complete'} title="Complete consultation?" confirmLabel="Complete" onConfirm={() => save('Completed')} onClose={() => setDialog(null)}
      message="Completed consultations become read-only." />

    {/* Print Visit Summary Modal */}
    <Modal open={dialog === 'print'} title="Clinical Consultation Summary" onClose={() => setDialog(null)}>
      <div style={{ fontSize: '0.88rem', lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ borderBottom: '2px solid var(--line)', paddingBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <strong style={{ fontSize: '1rem' }}>MediCare AI Clinic</strong>
            <div className="muted small">Attending Physician: {user.name}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div>Date: {data.date}</div>
            <div className="muted small">Time: {data.time}</div>
          </div>
        </div>

        <div>
          <strong>Patient:</strong> {p.name} ({p.age} yrs, {p.gender}) — Phone: {p.phone}
        </div>

        <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <div><span className="muted small">BP:</span> <b>{form.vitals.bp || '—'}</b></div>
          <div><span className="muted small">Heart Rate:</span> <b>{form.vitals.hr || '—'} bpm</b></div>
          <div><span className="muted small">Temp:</span> <b>{form.vitals.temp || '—'} °C</b></div>
          <div><span className="muted small">SpO2:</span> <b>{form.vitals.spo2 || '—'}%</b></div>
        </div>

        <div><b>Chief Complaint:</b> {form.chiefComplaint || '—'}</div>
        <div><b>Diagnosis:</b> {form.diagnosis || '—'}</div>
        <div><b>Clinical Findings / Exam:</b> {form.exam || '—'}</div>
        <div><b>Treatment Plan:</b> {form.plan || '—'}</div>
        {form.followUp && <div><b>Follow-up Recommendation:</b> {form.followUp}</div>}

        <div className="row end" style={{ marginTop: 16 }}>
          <button className="btn" onClick={() => setDialog(null)}>Close</button>
          <button className="btn btn-primary" onClick={() => window.print()}><Printer size={15} /> Print Clinical Slip</button>
        </div>
      </div>
    </Modal>

    {/* Order Lab Tests Modal */}
    <Modal open={dialog === 'lab'} title="Diagnostic Lab Order Requisition" onClose={() => setDialog(null)}>
      <div className="stack" style={{ fontSize: '0.88rem' }}>
        <p className="muted small">Order pathology, biochemistry, or radiology investigations for <strong>{p.name}</strong>.</p>
        <label className="field">
          <span>Requested Investigations (one per line)</span>
          <textarea rows={4} value={labTests} onChange={e => setLabTests(e.target.value)} />
        </label>
        <div className="row end">
          <button className="btn" onClick={() => setDialog(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={() => {
            flash('ok', 'Lab test requisition dispatched to diagnostic laboratory.')
            setDialog(null)
          }}>
            <ClipboardCheck size={15} /> Submit Requisition
          </button>
        </div>
      </div>
    </Modal>
  </>
}
