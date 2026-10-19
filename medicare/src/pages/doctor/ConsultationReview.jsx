import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { AlertTriangle, Sparkles, Printer, FileText, ClipboardCheck, MessageSquare, Check, X } from 'lucide-react'
import { consultationsApi, ocrTrainingApi, prescriptionsApi } from '../../services/api'
import { speechToText, llm } from '../../services/ai'
import { useAuth } from '../../context/AuthContext'
import { useAsync } from '../../hooks'
import Recorder from '../../components/ai/Recorder'
import { Avatar, Card, StatusBadge, PageHeader, LoadingState, ErrorState, ConfirmationDialog, Modal } from '../../components/common/ui'

const DRAFT_FIELDS = [['chiefComplaint', 'Chief complaint'], ['symptoms', 'Symptoms and history'], ['vitals', 'Vitals'],
  ['exam', 'Physical examination / findings'], ['diagnosis', 'Diagnosis / assessment'], ['diagnosisStatus', 'Diagnosis status'], ['medications', 'Medications'],
  ['investigations', 'Investigations'], ['plan', 'Treatment plan'], ['followUp', 'Follow-up and safety instructions']]

const F = ({ label, children }) => <label className="field">{label}{children}</label>
const hasValue = value => value && typeof value === 'object'
  ? Object.values(value).some(hasValue)
  : String(value ?? '').trim().length > 0
const sameValue = (left, right) => JSON.stringify(left ?? '').trim().toLowerCase() === JSON.stringify(right ?? '').trim().toLowerCase()
const VITAL_FIELDS = ['bp', 'hr', 'temp', 'spo2', 'recordedAt']

export default function ConsultationReview({ data, initialAi }) {
  const nav = useNavigate(); const { user } = useAuth(); const consultationId = data.id
  const defaultForm = { chiefComplaint:'', symptoms:'', vitals:{ bp:'', hr:'', temp:'', spo2:'', recordedAt:'' }, exam:'', diagnosis:'', diagnosisStatus:'',
    medications:'', investigations:'', notes:'', plan:'', followUp:'' }
  const defaultAi = { transcript:'', sttOriginalTranscript:'', handwritten:'', ocrRecognizedText:'',
    stt:'Idle', llm:'Idle', sttError:'', ocrError:'', llmError:'', extraction:null }
  const [form, setForm] = useState(() => {
    const saved = { ...defaultForm, ...(data.form || {}), notes:data.form?.notes ?? data.doctorNotes ?? '',
      vitals:{ ...defaultForm.vitals, ...(data.form?.vitals || {}) } }
    const legacyFields = initialAi?.draft?.fields
    if (legacyFields && initialAi.draft.review !== 'Reviewed') {
      for (const [key] of DRAFT_FIELDS) {
        if (key === 'vitals') {
          for (const vital of VITAL_FIELDS) {
            if (!hasValue(saved.vitals[vital]) && hasValue(legacyFields.vitals?.[vital])) saved.vitals[vital] = legacyFields.vitals[vital]
          }
        } else if (!hasValue(saved[key]) && hasValue(legacyFields[key])) saved[key] = legacyFields[key]
      }
    }
    return saved
  })
  const [ai, setAi] = useState(() => {
    const saved = { ...defaultAi, ...(initialAi || {}) }
    if (!saved.extraction && saved.draft?.fields) {
      const fieldReview = Object.fromEntries(DRAFT_FIELDS.flatMap(([key]) => key === 'vitals'
        ? [hasValue(saved.draft.fields.vitals) ? [key, saved.draft.review === 'Reviewed' ? 'Confirmed' : 'Needs review'] : null].filter(Boolean)
        : hasValue(saved.draft.fields[key]) ? [[key, saved.draft.review === 'Reviewed' ? 'Confirmed' : 'Needs review']] : []))
      saved.extraction = { fields:saved.draft.fields, evidence:saved.draft.evidence || {}, fieldReview,
        autoFilled:Object.keys(fieldReview).filter(key => fieldReview[key] === 'Needs review') }
    }
    return saved
  })
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(null); const [dialog, setDialog] = useState(null)
  const [completed, setCompleted] = useState(false)
  const [trainingApproved, setTrainingApproved] = useState(false)
  const [trainingSample, setTrainingSample] = useState({ status:'idle', sampleId:'', error:'' })
  const [labTests, setLabTests] = useState('Complete Blood Count (CBC)\nSerum Electrolytes\nChest X-Ray (PA View)')


  const p = data.patientInfo, locked = data.status === 'Completed' || data.status === 'Cancelled' || completed
  const patchAi = x => setAi(a => ({ ...a, ...x })); const flash = (type, text) => setMsg({ type, text })
  const updateFieldReview = (key, status) => setAi(current => {
    const fieldReview = { ...current.extraction.fieldReview, [key]:status }
    const hasPending = Object.values(fieldReview).includes('Needs review')
    return { ...current, llm:hasPending ? 'Completed' : 'Reviewed', extraction:{ ...current.extraction, fieldReview } }
  })
  const set = (key, value) => {
    setForm(current => ({ ...current, [key]:value }))
    if (ai.extraction?.fieldReview?.[key] === 'Needs review') updateFieldReview(key, hasValue(value) ? 'Corrected' : 'Rejected')
  }
  const setVital = (key, value) => {
    setForm(current => ({ ...current, vitals:{ ...current.vitals, [key]:value } }))
    if (ai.extraction?.fieldReview?.vitals === 'Needs review') updateFieldReview('vitals', 'Corrected')
  }

  const saveOcrTrainingSample = async () => {
    const transcription = ai.handwritten?.trim()
    if (!ai.inkImage || !transcription || !trainingApproved) return

    setTrainingSample({ status:'saving', sampleId:'', error:'' })
    try {
      const result = await ocrTrainingApi.saveSample({
        image:ai.inkImage,
        recognizedText:ai.ocrRecognizedText || ai.handwritten,
        transcription
      })
      setTrainingSample({ status:'saved', sampleId:result.sampleId, error:'' })
    } catch (error) {
      setTrainingSample({ status:'error', sampleId:'', error:error.message || 'The OCR sample could not be saved.' })
    }
  }

  const transcribe = async audio => {
    const startedAt = performance.now()
    patchAi({ stt:'Processing' }); setMsg(null)
    try {
      const r = await speechToText.transcribe(audio, { consultationId })
      setAi(current => ({ ...current, transcript:r.text, sttOriginalTranscript:r.text, stt:'Completed', sttProvider:r.provider, sttError:'',
        processingMs:(current.processingMs || 0) + Math.round(performance.now() - startedAt) }))
    } catch (e) { patchAi({ stt:'Failed', sttError:e.message }); flash('err', e.message || 'Transcription failed. Record again or upload a different file.') }
  }
  const summarize = async () => {
    const startedAt = performance.now()
    patchAi({ llm:'Processing' }); setMsg(null)
    const consultation = {
      chiefComplaint:form.chiefComplaint, symptoms:form.symptoms, vitals:form.vitals, exam:form.exam,
      diagnosis:form.diagnosis, diagnosisStatus:form.diagnosisStatus, medications:form.medications,
      investigations:form.investigations, plan:form.plan, followUp:form.followUp, notes:form.notes
    }
    try {
      const r = await llm.summarize({ transcript:ai.transcript, handwritten:ai.handwritten, notes:form.notes, consultation })
      const fields = {
        chiefComplaint:'', symptoms:'', vitals:{ bp:'', hr:'', temp:'', spo2:'', recordedAt:'' }, exam:'', diagnosis:'',
        medications:'', investigations:'', plan:'', followUp:'', ...(r.fields || {})
      }
      fields.vitals = { bp:'', hr:'', temp:'', spo2:'', recordedAt:'', ...(r.fields?.vitals || {}) }
      const evidence = r.evidence || {}
      const fieldReview = {}
      const autoFilled = []
      const nextForm = { ...form, vitals:{ ...form.vitals } }
      for (const [key] of DRAFT_FIELDS) {
        if (key === 'vitals') {
          const addedVitals = []
          for (const vital of VITAL_FIELDS) {
            const source = evidence.vitals?.[vital]
            if (!hasValue(nextForm.vitals[vital]) && hasValue(fields.vitals[vital]) && source?.source !== 'consultation' && hasValue(source?.quote)) {
              nextForm.vitals[vital] = fields.vitals[vital]
              addedVitals.push(vital)
            }
          }
          if (addedVitals.length) {
            fieldReview.vitals = 'Needs review'
            autoFilled.push('vitals')
          }
        } else {
          const source = evidence[key]
          if (!hasValue(nextForm[key]) && hasValue(fields[key]) && source?.source !== 'consultation' && hasValue(source?.quote)) {
            nextForm[key] = fields[key]
            fieldReview[key] = 'Needs review'
            autoFilled.push(key)
          }
        }
      }
      setForm(nextForm)
      setAi(current => ({ ...current, llm:'Completed', llmError:'',
        processingMs:(current.processingMs || 0) + Math.round(performance.now() - startedAt),
        extraction:{ fields, evidence, fieldReview, autoFilled, provider:r.provider } }))
    }
    catch (e) { patchAi({ llm:'Failed', llmError:e.message }); flash('err', e.message || 'Summary generation failed. Try again.') }
  }
  const rejectExtraction = key => {
    const extraction = ai.extraction
    if (extraction?.autoFilled?.includes(key)) {
      setForm(current => {
        if (key === 'vitals') {
          const vitals = { ...current.vitals }
          for (const vital of VITAL_FIELDS) {
            if (sameValue(vitals[vital], extraction.fields.vitals?.[vital])) vitals[vital] = ''
          }
          return { ...current, vitals }
        }
        return sameValue(current[key], extraction.fields[key]) ? { ...current, [key]:'' } : current
      })
    }
    updateFieldReview(key, 'Rejected')
  }
  const renderFieldReview = key => {
    const status = ai.extraction?.fieldReview?.[key]
    if (!status) return null
    const evidence = ai.extraction.evidence?.[key]
    const quote = typeof evidence === 'string' ? evidence : evidence?.quote || evidence?.text
    const sourceName = typeof evidence === 'object' ? evidence?.source : ''
    const sourceLabel = { doctor_audio:'Doctor-labeled transcript', audio_transcript:'Unattributed audio transcript', handwritten:'Handwriting OCR', doctor_notes:'Doctor notes', consultation:'Consultation fields' }[sourceName] || sourceName
    return <div className="ai-field-review">
      <small>{quote ? `${sourceLabel || 'Source'}: “${quote}”` : 'No source excerpt returned. Verify the value against the transcript or handwriting.'}</small>
      {status === 'Needs review'
        ? <div className="ai-field-actions">
          <button type="button" className="btn btn-sm" onClick={() => updateFieldReview(key, 'Confirmed')}><Check size={14} /> Confirm</button>
          <button type="button" className="btn btn-sm" onClick={() => rejectExtraction(key)}><X size={14} /> Reject extraction</button>
        </div>
        : <small className="muted small">{status === 'Corrected' ? 'Edited by doctor' : status === 'Rejected' ? 'Extraction rejected' : 'Confirmed by doctor'}</small>}
    </div>
  }
  const createPrescriptionDraft = () => prescriptionsApi.createFromConsultation(consultationId, {
    diagnosis:form.diagnosis,
    medications:form.medications,
    notes:[form.plan, form.followUp].filter(Boolean).join('\n')
  })
  const openPrescription = async () => {
    setBusy(true); setMsg(null)
    try {
      const prescription = await createPrescriptionDraft()
      nav(`/doctor/prescriptions/${prescription.id}?consultationId=${consultationId}`)
    } catch (error) {
      flash('err', error.message || 'The prescription draft could not be opened.')
    } finally { setBusy(false) }
  }
  const save = async status => {
    setBusy(true); setMsg(null)
    try {
      await consultationsApi.save(consultationId, { form, ai, status })
      if (status === 'Completed') {
        setCompleted(true)
        if (form.medications.trim()) {
          const prescription = await createPrescriptionDraft()
          nav(`/doctor/prescriptions/${prescription.id}?consultationId=${consultationId}`)
        } else nav('/doctor/consultations')
      } else flash('ok', 'Consultation saved.')
    }
    catch (e) { flash('err', e.message) } finally { setBusy(false); setDialog(null) }
  }
  const pending = Object.values(ai.extraction?.fieldReview || {}).includes('Needs review')
  const canSummarize = !locked && (hasValue(ai.transcript) || hasValue(ai.handwritten)) && ai.llm !== 'Processing' && !pending

  return <>
    <PageHeader title={`Consultation — ${data.patient}`} subtitle={`${data.date} • ${data.time} • ${data.type}`}
      actions={<>
        <StatusBadge status={data.status} />
        {data.status === 'Completed' && <>
          <button className="btn" onClick={() => setDialog('print')}><Printer size={15} /> Print Summary</button>
          <button className="btn" onClick={() => setDialog('lab')}><ClipboardCheck size={15} /> Order Labs</button>
          {data.prescriptionId
            ? <Link className="btn btn-primary" to={`/doctor/prescriptions/${data.prescriptionId}?consultationId=${data.id}`}><FileText size={15} /> View prescription</Link>
            : form.medications.trim() && data.status !== 'Cancelled' && <button className="btn btn-primary" onClick={openPrescription} disabled={busy}><FileText size={15} /> Create prescription</button>}
        </>}
        <Link className="btn" to="/doctor/consultations">Back</Link>
      </>} />
    {msg && <div className={`alert ${msg.type === 'err' ? 'err' : 'ok'}`} role={msg.type === 'err' ? 'alert' : 'status'}>{msg.text}</div>}
    <div className="split">
      <aside className="card patient-panel">
        <div className="who"><Avatar name={p.name} size={48} src={p.profilePicture} /><div><strong>{p.name}</strong><div className="muted small">{p.age} yrs • {p.gender}</div></div></div>
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
              {data.prescriptionId ? <Link to={`/doctor/prescriptions/${data.prescriptionId}?consultationId=${data.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ padding: 12, border: '1px solid var(--line)', borderRadius: 10, background: '#f8fafc', height: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)' }}>
                    <FileText size={18} />
                    <strong>View Prescription</strong>
                  </div>
                  <span className="muted small">Open the saved medication draft.</span>
                </div>
              </Link> : form.medications.trim() && data.status !== 'Cancelled' && <button type="button" className="btn" onClick={openPrescription} disabled={busy}>
                <FileText size={16} /> Create prescription
              </button>}

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
          <fieldset disabled={locked || ai.llm === 'Processing'} className="fs">
            <F label="Chief complaint"><input value={form.chiefComplaint} onChange={e => set('chiefComplaint', e.target.value)} /></F>
            {renderFieldReview('chiefComplaint')}
            <F label="Symptoms and history"><textarea rows={3} value={form.symptoms} placeholder="Record doctor-stated onset, duration, severity, location, triggers, and relevant positives or negatives."
              onChange={e => set('symptoms', e.target.value)} /></F>
            {renderFieldReview('symptoms')}
            <div className="vitals">{[['bp', 'BP (mmHg)'], ['hr', 'Heart rate'], ['temp', 'Temp (°C)'], ['spo2', 'SpO₂ (%)']].map(([k, l]) =>
              <F key={k} label={l}><input value={form.vitals[k]} onChange={e => setVital(k, e.target.value)} /></F>)}
              <F label="Vitals recorded at"><input type="datetime-local" value={form.vitals.recordedAt} onChange={e => setVital('recordedAt', e.target.value)} /></F></div>
            {renderFieldReview('vitals')}
            <F label="Physical examination / findings"><textarea rows={3} value={form.exam} placeholder="Record only stated findings, including body site, side, and pertinent negatives when provided."
              onChange={e => set('exam', e.target.value)} /></F>
            {renderFieldReview('exam')}
            <div className="row">
              <F label="Diagnosis / assessment"><input value={form.diagnosis} onChange={e => set('diagnosis', e.target.value)} /></F>
              <F label="Diagnosis status"><select value={form.diagnosisStatus} onChange={e => set('diagnosisStatus', e.target.value)}>
                <option value="">Not stated</option><option value="Provisional">Provisional</option><option value="Confirmed">Confirmed</option>
              </select></F>
            </div>
            {renderFieldReview('diagnosis')}
            {renderFieldReview('diagnosisStatus')}
            <F label="Medications"><textarea rows={3} value={form.medications} placeholder="Doctor-stated name, dose and unit, route, frequency, duration, and start / stop / continue instruction. Leave unstated details blank."
              onChange={e => set('medications', e.target.value)} /></F>
            {renderFieldReview('medications')}
            <F label="Investigations"><textarea rows={2} value={form.investigations} placeholder="Exact test and whether it was ordered, recommended, or only discussed."
              onChange={e => set('investigations', e.target.value)} /></F>
            {renderFieldReview('investigations')}
            <F label="Treatment plan"><textarea rows={2} value={form.plan} onChange={e => set('plan', e.target.value)} /></F>
            {renderFieldReview('plan')}
            <F label="Follow-up and safety instructions"><textarea rows={2} value={form.followUp} placeholder="Document stated timeframe, appointment, and return / escalation instructions."
              onChange={e => set('followUp', e.target.value)} /></F>
            {renderFieldReview('followUp')}
          </fieldset>
        </Card>

        {!locked && <Card title="AI assistant" action={<span className="badge badge-purple"><Sparkles size={12} /> Doctor review required</span>}>
          {(ai.sttError || ai.ocrError || ai.llmError) && <div className="alert err" role="alert">{[ai.sttError, ai.ocrError, ai.llmError].filter(Boolean).join(' ')}</div>}
          {(ai.inkImage || ai.handwritten) && <div className="ink-review">
            <div><div className="muted small">Handwritten notes</div>{ai.inkImage && <img className="ink-img" src={ai.inkImage} alt="Handwritten notes from the consultation" />}</div>
            <div>
              <F label="Recognised text (editable)"><textarea rows={6} value={ai.handwritten || ''} onChange={e => {
                patchAi({ handwritten:e.target.value })
                setTrainingApproved(false)
                setTrainingSample({ status:'idle', sampleId:'', error:'' })
              }} /></F>
              {ai.inkImage && <div className="ai-field-review">
                <small>Save this live OCR image and prediction as a training pair after checking the corrected transcription.</small>
                <label><input type="checkbox" checked={trainingApproved} onChange={e => setTrainingApproved(e.target.checked)} /> I verified the image and text contain no patient-identifying information and are approved for OCR training.</label>
                {trainingSample.status === 'error' && <small className="alert err" role="alert">{trainingSample.error}</small>}
                {trainingSample.status === 'saved' && <small role="status">Training sample saved: {trainingSample.sampleId}</small>}
                <div className="ai-field-actions">
                  <button type="button" className="btn btn-sm" disabled={!trainingApproved || !ai.handwritten?.trim() || trainingSample.status === 'saving' || trainingSample.status === 'saved'} onClick={saveOcrTrainingSample}>
                    <FileText size={14} /> {trainingSample.status === 'saving' ? 'Saving sample…' : trainingSample.status === 'saved' ? 'Sample saved' : 'Add to OCR training'}
                  </button>
                </div>
              </div>}
            </div>
          </div>}
          <Recorder onAudio={transcribe} disabled={ai.stt === 'Processing'} />
          <div className="job"><span>Speech-to-text</span><StatusBadge status={ai.stt === 'Idle' ? 'Draft' : ai.stt === 'Processing' ? 'In Progress' : ai.stt} /></div>
          {ai.stt === 'Processing' && <LoadingState label="Transcribing audio…" />}
          <F label="Transcript (speaker not identified)"><textarea rows={6} value={ai.transcript} placeholder="Paste or edit the full conversation."
            onChange={e => patchAi({ transcript:e.target.value })} /></F>
          <button className="btn btn-primary" disabled={!canSummarize || pending} onClick={summarize}><Sparkles size={16} />
            {ai.llm === 'Processing' ? 'Extracting details…' : ai.extraction ? 'Re-extract details' : 'Extract documented details'}</button>
        </Card>}

        {!locked && <div className="row end sticky-actions">
          <button className="btn" disabled={busy} onClick={() => save()}>{busy ? 'Saving…' : 'Save draft'}</button>
          <button className="btn btn-primary" disabled={busy} onClick={() => pending ? flash('err', 'Confirm, correct, or reject each extracted field before completing this consultation.') : setDialog('complete')}>Complete consultation</button>
        </div>}
      </div>
    </div>

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
        {form.medications && <div><b>Medications:</b> {form.medications}</div>}
        {form.investigations && <div><b>Investigations:</b> {form.investigations}</div>}
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
