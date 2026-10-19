import { useRef, useState, useEffect } from 'react'
import { Mic, Square, Upload } from 'lucide-react'
import { validateAudio } from '../../services/ai'

const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
// Emits onAudio(blob|file). Browser capture via MediaRecorder; upload as fallback.
export default function Recorder({ onAudio, disabled }) {
  const [rec, setRec] = useState(false); const [secs, setSecs] = useState(0); const [err, setErr] = useState('')
  const mr = useRef(null), chunks = useRef([]), timer = useRef(null), stream = useRef(null)
  useEffect(() => () => { clearInterval(timer.current); stream.current?.getTracks().forEach(t => t.stop()) }, [])
  const start = async () => {
    setErr('')
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio:true })
      mr.current = new MediaRecorder(stream.current); chunks.current = []
      mr.current.ondataavailable = e => chunks.current.push(e.data)
      mr.current.onstop = () => { stream.current.getTracks().forEach(t => t.stop()); onAudio(new Blob(chunks.current, { type:mr.current.mimeType || 'audio/webm' })) }
      mr.current.start(); setRec(true); setSecs(0); timer.current = setInterval(() => setSecs(s => s + 1), 1000)
    } catch { setErr('Microphone unavailable or permission denied. Upload an audio file instead.') }
  }
  const stop = () => { mr.current?.stop(); clearInterval(timer.current); setRec(false) }
  const pick = e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return
    const v = validateAudio(f); v ? setErr(v) : (setErr(''), onAudio(f)) }
  return <div className="recorder">
    <div className="row">
      {!rec ? <button className="btn btn-primary" onClick={start} disabled={disabled}><Mic size={16} /> Start recording</button>
            : <button className="btn btn-danger" onClick={stop}><Square size={16} /> Stop recording</button>}
      <label className={`btn ${disabled || rec ? 'is-disabled' : ''}`}><Upload size={16} /> Upload audio
        <input type="file" accept="audio/*" hidden onChange={pick} disabled={disabled || rec} /></label>
      {rec && <span className="rec-live" role="status"><i /> Recording {fmt(secs)}</span>}
    </div>
    {err && <div className="alert err" role="alert">{err}</div>}
  </div>
}
