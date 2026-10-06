import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Plus, Trash2, Sparkles, Eye } from 'lucide-react'
import { prescriptionsApi, patientsApi, consultationsApi, FREQUENCIES, ROUTES, FOOD } from '../../services/api'
import { llm } from '../../services/ai'
import { useAsync } from '../../hooks'
import { Card, PageHeader, StatusBadge, LoadingState, ErrorState, ConfirmationDialog, Modal, AIDraftBanner } from '../../components/common/ui'

const blankItem = () => ({ name:'', strength:'', dosage:'', frequency:'Once daily', duration:'', route:'Oral', food:'Any', instructions:'' })
const blank = () => ({ id:null, patientId:'', diagnosis:'', items:[blankItem()], notes:'', followUp:'', status:'Draft', aiAssisted:false })

export default function PrescriptionEditor() {
  const { prescriptionId } = useParams(); const [sp] = useSearchParams()
  const { data, loading, error, reload } = useAsync(async () => {
    const patients = (await patientsApi.list({ size:100 })).items
    if (prescriptionId) return { patients, rx: await prescriptionsApi.get(prescriptionId) }
    const rx = { ...blank(), patientId: sp.get('patientId') ? Number(sp.get('patientId')) : '' }
    const cid = sp.get('consultationId')
    if (cid) { const c = await consultationsApi.get(cid); Object.assign(rx, { patientId:c.patientId, diagnosis:c.form.diagnosis, notes:c.form.plan, followUp:c.form.followUp }) }
    return { patients, rx }
  }, [prescriptionId, sp.toString()])
  if (loading) return <LoadingState label="Loading prescription…" />
  if (error) return <ErrorState message={error} onRetry={reload} />
  return <Editor key={data.rx.id ?? 'new'} patients={data.patients} initial={data.rx} />
}

function Editor({ patients, initial }) {
  const nav = useNavigate()
  const [rx, setRx] = useState(initial), [errs, setErrs] = useState({}), [busy, setBusy] = useState(false), [msg, setMsg] = useState(null), [dialog, setDialog] = useState(null)
  const [aiNote, setAiNote] = useState(''), [aiBusy, setAiBusy] = useState(false), [aiDraft, setAiDraft] = useState(null)
  const locked = ['Finalized', 'Cancelled'].includes(rx.status)
  const patient = patients.find(p => p.id === Number(rx.patientId))
  const set = (k, v) => setRx(r => ({ ...r, [k]: v }))
  const setItem = (i, k, v) => setRx(r => ({ ...r, items: r.items.map((it, j) => j === i ? { ...it, [k]: v } : it) }))
  const allergyHit = it => patient?.allergies.find(a => it.name.trim() && it.name.toLowerCase().includes(a.toLowerCase()))

  const validate = strict => {
    const e = {}; if (!rx.patientId) e.patient = 'Choose a patient'
    if (strict) { if (!rx.diagnosis.trim()) e.diagnosis = 'Enter a diagnosis'
      if (!rx.items.length) e.items = 'Add at least one medicine'
      rx.items.forEach((it, i) => { if (!it.name.trim() || !it.dosage.trim() || !it.duration.trim()) e['item' + i] = 'Medicine name, dosage and duration are required' }) }
    setErrs(e); return Object.keys(e).length === 0
  }
  const run = async (fn, ok) => { setBusy(true); setMsg(null); try { await fn(); ok && setMsg({ type:'ok', text:ok }) } catch (e) { setMsg({ type:'err', text:e.message }) } finally { setBusy(false); setDialog(null) } }
  const persist = async () => { const saved = await prescriptionsApi.save(rx.id, rx); setRx(saved); if (!rx.id) nav(`/doctor/prescriptions/${saved.id}`, { replace:true }); return saved }
  const saveDraft = () => validate(false) && run(persist, 'Draft saved.')
  const approve = () => validate(true) && run(async () => { const s = await persist(); setRx(await prescriptionsApi.transition(s.id, 'approve')) }, 'Approved. Finalize when you are ready to issue it.')
  const finalize = () => run(async () => setRx(await prescriptionsApi.transition(rx.id, 'finalize')), 'Prescription finalized. It can no longer be edited.')
  const cancel = () => run(async () => setRx(await prescriptionsApi.transition(rx.id, 'cancel')), 'Prescription cancelled.')

  const generate = async () => {
    if (!rx.diagnosis.trim() && !aiNote.trim()) return setMsg({ type:'err', text:'Enter a diagnosis or clinical information for the assistant to work from.' })
    setAiBusy(true); setMsg(null)
    try { const r = await llm.suggestPrescription({ diagnosis:rx.diagnosis, clinicalInfo:aiNote, allergies:patient?.allergies ?? [], currentMedications:patient?.meds ?? [] }); setAiDraft(r) }
    catch { setMsg({ type:'err', text:'The assistant could not generate a draft. Try again or enter medicines manually.' }) } finally { setAiBusy(false) }
  }
  const addAi = () => { const fresh = aiDraft.items.map(i => ({ ...blankItem(), ...i, ai:true }))
    setRx(r => ({ ...r, aiAssisted:true, items:[...r.items.filter(i => i.name.trim()), ...fresh] })); setAiDraft(null); setMsg({ type:'ok', text:'AI suggestions added to the prescription. Check each row before approving.' }) }

  return <>
    <PageHeader title={rx.code ?? 'New prescription'} subtitle={patient ? `${patient.name} • ${patient.age} yrs • ${patient.gender}` : 'Choose a patient to begin'}
      actions={<><StatusBadge status={rx.status} />{rx.aiAssisted && <span className="badge badge-purple"><Sparkles size={11} /> AI-assisted</span>}<Link className="btn" to="/doctor/prescriptions">Back</Link></>} />
    {msg && <div className={`alert ${msg.type === 'err' ? 'err' : 'ok'}`} role={msg.type === 'err' ? 'alert' : 'status'}>{msg.text}</div>}
    {rx.status === 'Reviewed' && <div className="alert">Approved. Any change returns this prescription to Draft and it must be approved again.</div>}
    {patient?.allergies.length > 0 && <div className="allergy has"><AlertTriangle size={16} /> Allergies: {patient.allergies.join(', ')}</div>}
    <div className="stack" style={{ marginTop: 12 }}>
      <Card title="Details"><fieldset disabled={locked || busy} className="fs">
        <label className="field">Patient<select value={rx.patientId} onChange={e => set('patientId', e.target.value)} disabled={!!rx.id}>
          <option value="">Select a patient</option>{patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>{errs.patient && <span className="err-t">{errs.patient}</span>}</label>
        <label className="field">Diagnosis<input value={rx.diagnosis} onChange={e => set('diagnosis', e.target.value)} />{errs.diagnosis && <span className="err-t">{errs.diagnosis}</span>}</label>
      </fieldset></Card>

      {!locked && <Card title="Prescription assistant" action={<span className="badge badge-purple"><Sparkles size={12} /> Draft only</span>}>
        <label className="field">Clinical information (optional)<textarea rows={2} value={aiNote} onChange={e => setAiNote(e.target.value)} placeholder="Symptoms, findings, constraints. The diagnosis above is also used." /></label>
        <div className="row" style={{ marginTop: 10 }}><button className="btn btn-primary" onClick={generate} disabled={aiBusy || busy}><Sparkles size={16} /> {aiBusy ? 'Generating…' : 'Generate with AI'}</button>
          <span className="muted small">Suggestions are never added automatically.</span></div>
        {aiDraft && <div className="draft"><AIDraftBanner />
          {aiDraft.provider?.startsWith('mock') && <div className="alert">Demo mode: suggestions are fixed sample text from a mock provider.</div>}
          <ul className="list">{aiDraft.items.map((i, k) => <li key={k}><div className="grow"><strong>{i.name} {i.strength}</strong><div className="muted small">{i.dosage} • {i.frequency} • {i.duration} • {i.food}</div></div></li>)}</ul>
          <div className="row"><button className="btn btn-primary" onClick={addAi}>Add to prescription</button><button className="btn" onClick={() => setAiDraft(null)}>Discard</button></div></div>}
      </Card>}

      <Card title="Medicines" action={!locked && <button className="btn btn-sm" onClick={() => setRx(r => ({ ...r, items:[...r.items, blankItem()] }))}><Plus size={14} /> Add medicine</button>}>
        {errs.items && <span className="err-t">{errs.items}</span>}
        <fieldset disabled={locked || busy} className="fs">
          {rx.items.map((it, i) => { const hit = allergyHit(it); return <div key={i} className={`med ${hit ? 'conflict' : ''}`}>
            <div className="med-head"><strong>Medicine {i + 1}</strong>{it.ai && <span className="badge badge-purple"><Sparkles size={11} /> AI suggested</span>}
              {hit && <span className="badge badge-red"><AlertTriangle size={11} /> Matches allergy: {hit}</span>}
              {!locked && rx.items.length > 1 && <button className="icon-btn" aria-label={`Remove medicine ${i + 1}`} onClick={() => setRx(r => ({ ...r, items:r.items.filter((_, j) => j !== i) }))}><Trash2 size={16} /></button>}</div>
            <div className="med-grid">
              <label className="field">Medicine name<input value={it.name} onChange={e => setItem(i, 'name', e.target.value)} /></label>
              <label className="field">Strength<input value={it.strength} onChange={e => setItem(i, 'strength', e.target.value)} placeholder="e.g. 500 mg" /></label>
              <label className="field">Dosage<input value={it.dosage} onChange={e => setItem(i, 'dosage', e.target.value)} placeholder="e.g. 1 tablet" /></label>
              <label className="field">Frequency<select value={it.frequency} onChange={e => setItem(i, 'frequency', e.target.value)}>{FREQUENCIES.map(f => <option key={f}>{f}</option>)}</select></label>
              <label className="field">Duration<input value={it.duration} onChange={e => setItem(i, 'duration', e.target.value)} placeholder="e.g. 5 days" /></label>
              <label className="field">Route<select value={it.route} onChange={e => setItem(i, 'route', e.target.value)}>{ROUTES.map(f => <option key={f}>{f}</option>)}</select></label>
              <label className="field">Food<select value={it.food} onChange={e => setItem(i, 'food', e.target.value)}>{FOOD.map(f => <option key={f}>{f}</option>)}</select></label>
              <label className="field wide">Instructions<input value={it.instructions} onChange={e => setItem(i, 'instructions', e.target.value)} /></label></div>
            {errs['item' + i] && <span className="err-t">{errs['item' + i]}</span>}</div> })}
          <p className="muted small">Allergy check compares medicine names with recorded allergies only. It does not replace clinical judgement or an interaction check.</p>
        </fieldset></Card>

      <Card title="Notes and follow-up"><fieldset disabled={locked || busy} className="fs">
        <label className="field">Notes<textarea rows={2} value={rx.notes} onChange={e => set('notes', e.target.value)} /></label>
        <label className="field">Follow-up date<input type="date" value={rx.followUp} onChange={e => set('followUp', e.target.value)} /></label></fieldset></Card>

      <div className="row end sticky-actions">
        <button className="btn" onClick={() => setDialog('preview')}><Eye size={16} /> Preview</button>
        {!locked && <><button className="btn btn-danger-o" disabled={busy || !rx.id} onClick={() => setDialog('cancel')}>Cancel prescription</button>
          <button className="btn" disabled={busy} onClick={saveDraft}>{busy ? 'Saving…' : 'Save draft'}</button>
          {rx.status === 'Draft' && <button className="btn btn-primary" disabled={busy} onClick={approve}>Approve</button>}
          {rx.status === 'Reviewed' && <button className="btn btn-primary" disabled={busy} onClick={() => setDialog('finalize')}>Finalize</button>}</>}
      </div>
    </div>

    <Modal open={dialog === 'preview'} title="Prescription preview" onClose={() => setDialog(null)}>
      <div className="rx-prev"><strong>{patient?.name ?? 'No patient selected'}</strong> <span className="muted small">{patient && `${patient.age} yrs • ${patient.gender}`}</span>
        <p><b>Diagnosis:</b> {rx.diagnosis || '—'}</p>
        <ol>{rx.items.filter(i => i.name).map((i, k) => <li key={k}><b>{i.name} {i.strength}</b> — {i.dosage}, {i.frequency}, {i.duration}, {i.route}, {i.food}{i.instructions && `. ${i.instructions}`}</li>)}</ol>
        {rx.notes && <p><b>Notes:</b> {rx.notes}</p>}{rx.followUp && <p><b>Follow-up:</b> {rx.followUp}</p>}
        {rx.status !== 'Finalized' && <p className="muted small">Not valid until finalized by the doctor.</p>}</div></Modal>
    <ConfirmationDialog open={dialog === 'finalize'} title="Finalize prescription?" confirmLabel="Finalize" onConfirm={finalize} onClose={() => setDialog(null)}
      message="Once finalized the prescription is issued to the patient and cannot be edited. You confirm every medicine and dose has been checked." />
    <ConfirmationDialog open={dialog === 'cancel'} title="Cancel prescription?" confirmLabel="Cancel prescription" onConfirm={cancel} onClose={() => setDialog(null)}
      message="A cancelled prescription cannot be reopened." />
  </>
}
