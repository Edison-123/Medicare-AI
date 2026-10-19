import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Check, Eraser, FileText, Maximize2, Minimize2, Pencil, RotateCcw, Trash2, Undo2 } from 'lucide-react'
import WritingPad from '../../components/ai/WritingPad'
import { useAuth } from '../../context/AuthContext'
import { ocr } from '../../services/ai'
import { ocrTrainingApi } from '../../services/api'

const COLORS = [
  ['Black', '#111827'],
  ['Blue', '#1d4ed8'],
  ['Red', '#b91c1c']
]

export default function OcrTraining() {
  const { user, ready } = useAuth()
  const pad = useRef(null)
  const [focusMode, setFocusMode] = useState(true)
  const [tool, setTool] = useState('pen')
  const [color, setColor] = useState(COLORS[0][1])
  const [width, setWidth] = useState(2.5)
  const [info, setInfo] = useState({ count: 0, canUndo: false })
  const [step, setStep] = useState('write')
  const [image, setImage] = useState('')
  const [recognizedText, setRecognizedText] = useState('')
  const [ocrProvider, setOcrProvider] = useState('')
  const [transcription, setTranscription] = useState('')
  const [sampleId, setSampleId] = useState('')
  const [error, setError] = useState('')
  const [ocrError, setOcrError] = useState('')
  const [working, setWorking] = useState(false)

  const recognizeWriting = async () => {
    if (!info.count) {
      setError('Write a sample before running OCR.')
      return
    }

    const capturedImage = pad.current.getImage()
    setImage(capturedImage)
    setRecognizedText('')
    setOcrProvider('')
    setTranscription('')
    setError('')
    setOcrError('')
    setStep('review')
    setWorking(true)

    try {
      const result = await ocr.recognize(capturedImage)
      setRecognizedText(result.text || '')
      setOcrProvider(result.provider?.includes('training-adapter') ? 'TrOCR training adapter' : result.provider || 'OCR service')
      setTranscription(result.text || '')
    } catch (requestError) {
      setOcrError(requestError.message || 'OCR could not read this sample. You can still enter the correct transcription.')
    } finally {
      setWorking(false)
    }
  }

  const saveSample = async event => {
    event.preventDefault()
    const label = transcription.trim()
    if (!label) {
      setError('Enter the correct transcription before saving.')
      return
    }

    setWorking(true)
    setError('')
    try {
      const result = await ocrTrainingApi.saveSample({
        image,
        recognizedText,
        transcription: label
      })
      setSampleId(result.sampleId)
      setStep('saved')
    } catch (requestError) {
      setError(requestError.message || 'The sample could not be saved.')
    } finally {
      setWorking(false)
    }
  }

  const startNewSample = () => {
    setFocusMode(true)
    setTool('pen')
    setColor(COLORS[0][1])
    setWidth(2.5)
    setInfo({ count: 0, canUndo: false })
    setImage('')
    setRecognizedText('')
    setOcrProvider('')
    setTranscription('')
    setSampleId('')
    setError('')
    setOcrError('')
    setStep('write')
  }

  useEffect(() => {
    if (step !== 'write') return

    const handleShortcut = event => {
      if (event.repeat) return

      const target = event.target
      const isEditing = target instanceof HTMLElement && (
        target.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
      )
      if (isEditing) return

      const key = event.key.toLowerCase()
      const hasShortcutChord = (event.ctrlKey || event.metaKey) && event.altKey && event.shiftKey
      const hasUndoChord = (event.ctrlKey || event.metaKey) && event.shiftKey && !event.altKey

      if (hasUndoChord && key === 'z') {
        pad.current?.undo()
        event.preventDefault()
        return
      }

      if (!hasShortcutChord) return

      if (key === 'p') {
        setTool(current => current === 'pen' ? 'eraser' : 'pen')
      } else if (key === 'c') {
        const currentIndex = COLORS.findIndex(([, value]) => value === color)
        setColor(COLORS[(currentIndex + 1) % COLORS.length][1])
        setTool('pen')
      } else if (key === 'f') {
        setFocusMode(current => !current)
      } else if (key === 'enter') {
        void recognizeWriting()
      } else {
        return
      }

      event.preventDefault()
    }

    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [color, info.count, recognizeWriting, step])

  if (!ready) {
    return <main className="ocr-training-access" role="status">Checking access…</main>
  }

  if (!user || !['ROLE_DOCTOR', 'ROLE_ADMIN'].includes(user.role)) {
    return (
      <main className="ocr-training-access">
        <h1>OCR sample collection</h1>
        <p>{user ? 'This page is available to doctors and administrators.' : 'Sign in with a doctor or administrator account to collect samples.'}</p>
        {!user && <Link className="btn btn-primary" to="/login">Sign in</Link>}
      </main>
    )
  }

  return (
    <div className={`ocr-training-page${step === 'write' && focusMode ? ' is-focused' : ''}`}>
      <header className="ocr-training-header">
        <div>
          <div className="ocr-training-eyebrow">MediCare AI / HANDWRITING DATA</div>
          <h1>OCR sample collection</h1>
        </div>
        <div className="ocr-training-header-actions">
          {step === 'write' && (
            <button
              className="ocr-training-button"
              onClick={() => setFocusMode(current => !current)}
              title={`${focusMode ? 'Exit' : 'Enter'} focus writing mode (Ctrl+Alt+Shift+F)`}
              aria-pressed={focusMode}
            >
              {focusMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              <span>{focusMode ? 'Exit focus' : 'Focus writing'}</span>
            </button>
          )}
          <Link className="ocr-training-back" to="/doctor/consultations">
            Back to consultations
          </Link>
        </div>
      </header>

      <main className="ocr-training-main">
        <div className="ocr-training-title-row">
          <div>
            <h2>{step === 'write' ? 'Write a sample' : step === 'review' ? 'Review transcription' : 'Sample saved'}</h2>
            <p>{step === 'write' ? 'Write a short phrase or sentence, then compare the OCR result with the exact text.' : step === 'review' ? 'Correct the transcription to match exactly what you wrote.' : 'The image and verified transcription are stored as a training pair.'}</p>
          </div>
          {step !== 'write' && step !== 'saved' && (
            <button className="ocr-training-button" onClick={startNewSample}>
              <RotateCcw size={16} /> Start over
            </button>
          )}
        </div>

        <div className="ocr-training-privacy" role="note">
          <AlertTriangle size={16} />
          <span>Use non-identifying sample text only. Do not enter patient names, dates of birth, or other personal health information.</span>
        </div>

        {error && <div className="ocr-training-error" role="alert">{error}</div>}

        {step === 'write' && (
          <section className="ocr-training-writing" aria-label="Handwriting sample">
            <div className="ocr-training-toolbar" role="toolbar" aria-label="Writing tools">
              <button className={`tool ${tool === 'pen' ? 'on' : ''}`} onClick={() => setTool('pen')} aria-label="Pen" aria-pressed={tool === 'pen'} title="Pen (Ctrl+Alt+Shift+P toggles pen/eraser)">
                <Pencil size={17} />
              </button>
              <button className={`tool ${tool === 'eraser' ? 'on' : ''}`} onClick={() => setTool('eraser')} aria-label="Eraser" aria-pressed={tool === 'eraser'} title="Eraser (Ctrl+Alt+Shift+P toggles pen/eraser)">
                <Eraser size={17} />
              </button>
              {COLORS.map(([name, value]) => (
                <button key={value} className={`swatch ${color === value && tool === 'pen' ? 'on' : ''}`} style={{ background: value }} aria-label={`${name} ink`} title={`${name} ink (Ctrl+Alt+Shift+C cycles colors)`} onClick={() => { setColor(value); setTool('pen') }} />
              ))}
              <select value={width} onChange={event => setWidth(Number(event.target.value))} aria-label="Pen thickness">
                <option value={1.5}>Fine</option>
                <option value={2.5}>Medium</option>
                <option value={4.5}>Bold</option>
              </select>
              <button className="tool" onClick={() => pad.current?.undo()} disabled={!info.canUndo} aria-label="Undo" title="Undo (Ctrl+Shift+Z)">
                <Undo2 size={17} />
              </button>
              <button className="tool" onClick={() => pad.current?.clear()} disabled={!info.count} aria-label="Clear writing" title="Clear writing">
                <Trash2 size={17} />
              </button>
              <span className="ocr-training-count">{info.count ? `${info.count} strokes` : 'Blank page'}</span>
            </div>
            <div className="ocr-training-canvas">
              <WritingPad ref={pad} tool={tool} color={color} width={width} onChange={setInfo} />
            </div>
            <div className="ocr-training-actions">
              <button className="btn btn-primary" onClick={recognizeWriting} disabled={working || !info.count} title="Recognize handwriting (Ctrl+Alt+Shift+Enter)">
                <FileText size={16} /> Recognize handwriting
              </button>
            </div>
          </section>
        )}

        {step === 'review' && (
          <form className="ocr-training-review" onSubmit={saveSample}>
            <figure className="ocr-training-image">
              <img src={image} alt="Captured handwritten sample" />
              <figcaption>Captured handwriting</figcaption>
            </figure>
            <div className="ocr-training-labels">
              <section>
                <h3>OCR result{ocrProvider && <span className="ocr-training-model-tag">{ocrProvider}</span>}</h3>
                {working ? <p className="ocr-training-muted" role="status">Reading handwriting…</p> : ocrError ? <p className="ocr-training-inline-error" role="status">{ocrError}</p> : <pre className="ocr-training-result">{recognizedText || 'No text recognized.'}</pre>}
              </section>
              <label className="ocr-training-transcription" htmlFor="training-transcription">
                <span>Correct transcription</span>
                <textarea id="training-transcription" rows="7" maxLength="20000" value={transcription} onChange={event => setTranscription(event.target.value)} placeholder="Type exactly what you wrote" required />
                <small>This text is saved as the ground-truth label for training.</small>
              </label>
              <button className="btn btn-primary" type="submit" disabled={working || !transcription.trim()}>
                <Check size={16} /> {working ? 'Saving sample…' : 'Save training sample'}
              </button>
            </div>
          </form>
        )}

        {step === 'saved' && (
          <section className="ocr-training-saved" role="status">
            <span className="ocr-training-saved-icon"><Check size={22} /></span>
            <h3>Training pair saved</h3>
            <p>Sample ID: <code>{sampleId}</code></p>
            <button className="btn btn-primary" onClick={startNewSample}>Write another sample</button>
          </section>
        )}
      </main>
    </div>
  )
}
