import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  Pause,
  Play,
  Pencil,
  Eraser,
  Undo2,
  Trash2,
  Square,
  Mic,
  Maximize2,
  Minimize2
} from 'lucide-react'
import { consultationsApi, settingsApi } from '../../services/api'
import { speechToText, ocr, llm, normalizeHandwrittenText } from '../../services/ai'
import { useAsync } from '../../hooks'
import { useRecording } from '../../components/ai/useRecording'
import { autoStartRecordingIfEnabled } from './recordingPreferences'
import WritingPad from '../../components/ai/WritingPad'
import ConsultationReview from './ConsultationReview'
import {
  Card,
  StatusBadge,
  LoadingState,
  ErrorState,
  ConfirmationDialog
} from '../../components/common/ui'

const fmt = s =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

const COLORS = [
  ['Black', '#111827'],
  ['Blue', '#1d4ed8'],
  ['Red', '#b91c1c']
]

export default function ConsultationDetail() {
  const { consultationId } = useParams()

  const {
    data,
    loading,
    error,
    reload
  } = useAsync(
    () => consultationsApi.get(consultationId),
    [consultationId]
  )

  if (loading) {
    return <LoadingState label="Loading consultation…" />
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={reload}
      />
    )
  }

  return (
    <Stage
      key={data.id}
      data={data}
    />
  )
}

function Stage({ data }) {
  const { data: settings } = useAsync(settingsApi.getSettings)
  const locked =
    data.status === 'Completed' ||
    data.status === 'Cancelled'

  const [stage, setStage] = useState(
    locked ||
    data.ai?.inkImage ||
    data.ai?.transcript
      ? 'review'
      : 'pad'
  )

  const [payload, setPayload] = useState(null)
  const [ai, setAi] = useState(data.ai)

  if (stage === 'pad') {
    return (
      <PadStage
        data={data}
        autoStartRecording={settings?.preferences?.autoStartRecording === true}
        onEnd={p => {
          /*
           * IMPORTANT:
           * Preserve the consultation ID when moving from
           * the recording stage to the AI processing stage.
           *
           * The backend transcription endpoint requires:
           *
           * POST /api/ai/transcription
           * consultationId = Long
           */
          setPayload({
            ...p,
            consultationId: data.id
          })

          setStage('processing')
        }}
      />
    )
  }

  if (stage === 'processing') {
    return (
      <Processing
        payload={payload}
        onDone={r => {
          setAi(r)
          setStage('review')
        }}
      />
    )
  }

  return (
    <ConsultationReview
      data={data}
      initialAi={ai}
    />
  )
}

function PadStage({ data, onEnd, autoStartRecording }) {
  const rec = useRecording()
  const pad = useRef()
  const p = data.patientInfo

  const [tool, setTool] = useState('pen')
  const [color, setColor] = useState(COLORS[0][1])
  const [width, setWidth] = useState(2.5)
  const [focusMode, setFocusMode] = useState(false)

  const [info, setInfo] = useState({
    count: 0,
    canUndo: false
  })

  const [dialog, setDialog] = useState(null)

  useEffect(() => {
    autoStartRecordingIfEnabled(data.status, autoStartRecording, rec.start)
  }, [autoStartRecording, data.status, rec.start])

  const end = async () => {
    setDialog(null)

    const audio = await rec.stop()
    const strokes = pad.current.getStrokes()

    onEnd({
      audio,

      inkImage:
        strokes.length
          ? pad.current.getImage()
          : null,

      strokes
    })
  }

  useEffect(() => {
    /*
     * Starting a consultation changes the EXISTING
     * consultation + linked appointment to In Progress.
     */
    consultationsApi.start(data.id)
  }, [])

  useEffect(() => {
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

      if (hasShortcutChord && key === 'enter') {
        if (dialog === 'end') void end()
        else if (!dialog) setDialog('end')
        event.preventDefault()
        return
      }

      if (dialog) return

      if (hasShortcutChord && key === 'f') {
        setFocusMode(current => !current)
        event.preventDefault()
        return
      }

      if (hasUndoChord && key === 'z') {
        pad.current?.undo()
        event.preventDefault()
        return
      }

      if (!hasShortcutChord) return

      if (key === 'p') {
        setTool(current => current === 'pen' ? 'eraser' : 'pen')
        event.preventDefault()
      } else if (key === 'c') {
        const currentIndex = COLORS.findIndex(([, value]) => value === color)
        setColor(COLORS[(currentIndex + 1) % COLORS.length][1])
        setTool('pen')
        event.preventDefault()
      } else if (key === 'r') {
        if (rec.state === 'idle' || rec.state === 'denied') void rec.start()
        else if (rec.state === 'recording') rec.pause()
        else if (rec.state === 'paused') rec.resume()
        event.preventDefault()
      }
    }

    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [color, dialog, end, rec.start, rec.state])

  useEffect(() => {
    const warn = e => {
      e.preventDefault()
      e.returnValue = ''
    }

    if (
      rec.state === 'recording' ||
      rec.state === 'paused' ||
      info.count
    ) {
      addEventListener(
        'beforeunload',
        warn
      )
    }

    return () =>
      removeEventListener(
        'beforeunload',
        warn
      )
  }, [rec.state, info.count])

  const nothing =
    !info.count &&
    rec.state !== 'recording' &&
    rec.state !== 'paused'

  return (
    <div className={`pad-stage${focusMode ? ' focus-mode' : ''}`}>

      <div className="pad-bar">

        <div className="pad-who">

          {focusMode && (
            <button
              className="focus-exit"
              onClick={() => setFocusMode(false)}
              title="Exit focus writing mode (Ctrl+Alt+Shift+F)"
            >
              <Minimize2 size={16} />
              <span>Exit focus</span>
            </button>
          )}

          <strong>
            {data.patient}
          </strong>

          <span className="muted small">
            {p.age} yrs • {p.gender}
          </span>

          {p.allergies.length > 0 && (
            <span
              className="chip-warn"
              title="Allergies"
            >
              <AlertTriangle size={13} />

              {p.allergies.join(', ')}
            </span>
          )}

        </div>

        <div
          className="pad-tools"
          role="toolbar"
          aria-label="Writing tools"
        >

          <button
            className={`tool ${
              tool === 'pen'
                ? 'on'
                : ''
            }`}
            onClick={() =>
              setTool('pen')
            }
            aria-label="Pen"
            aria-pressed={
              tool === 'pen'
            }
            title="Toggle pen/eraser (Ctrl+Alt+Shift+P)"
          >
            <Pencil size={17} />
          </button>

          <button
            className={`tool ${
              tool === 'eraser'
                ? 'on'
                : ''
            }`}
            onClick={() =>
              setTool('eraser')
            }
            aria-label="Eraser (removes whole strokes)"
            aria-pressed={
              tool === 'eraser'
            }
            title="Toggle pen/eraser (Ctrl+Alt+Shift+P)"
          >
            <Eraser size={17} />
          </button>

          {COLORS.map(
            ([n, c]) => (
              <button
                key={c}
                className={`swatch ${
                  color === c &&
                  tool === 'pen'
                    ? 'on'
                    : ''
                }`}
                style={{
                  background: c
                }}
                aria-label={`${n} ink`}
                title={`${n} ink; cycle colors with Ctrl+Alt+Shift+C`}
                onClick={() => {
                  setColor(c)
                  setTool('pen')
                }}
              />
            )
          )}

          <select
            value={width}
            onChange={e =>
              setWidth(
                +e.target.value
              )
            }
            aria-label="Pen thickness"
          >
            <option value={1.5}>
              Fine
            </option>

            <option value={2.5}>
              Medium
            </option>

            <option value={4.5}>
              Bold
            </option>
          </select>

          <button
            className="tool"
            onClick={() =>
              pad.current.undo()
            }
            disabled={
              !info.canUndo
            }
            aria-label="Undo"
            title="Undo (Ctrl+Shift+Z)"
          >
            <Undo2 size={17} />
          </button>

          <button
            className="tool"
            onClick={() =>
              setDialog('clear')
            }
            disabled={!info.count}
            aria-label="Clear page"
            title="Clear page"
          >
            <Trash2 size={17} />
          </button>

        </div>

        <div className="row">

          <span
            className={`rec-pill ${rec.state}`}
            role="status"
          >

            {rec.state ===
              'recording' && (
              <>
                <i />

                Recording{' '}
                {fmt(rec.secs)}
              </>
            )}

            {rec.state ===
              'paused' && (
              <>
                Paused{' '}
                {fmt(rec.secs)}
              </>
            )}

            {rec.state ===
              'requesting' && (
              <>
                Waiting for microphone…
              </>
            )}

            {rec.state ===
              'idle' && (
              <>Microphone off</>
            )}

            {rec.state ===
              'denied' && (
              <>
                <Mic size={13} />

                Not recording
              </>
            )}

          </span>

          {(rec.state === 'idle' || rec.state === 'denied') && (
            <button
              className="btn btn-primary"
              onClick={rec.start}
              title="Start recording (Ctrl+Alt+Shift+R)"
            >
              <Mic size={14} />

              {rec.state === 'denied' ? 'Try recording again' : 'Start recording'}
            </button>
          )}

          {rec.state ===
            'recording' && (
            <button
              className="btn btn-sm"
              onClick={
                rec.pause
              }
              title="Pause recording (Ctrl+Alt+Shift+R)"
            >
              <Pause size={14} />

              Pause
            </button>
          )}

          {rec.state ===
            'paused' && (
            <button
              className="btn btn-sm"
              onClick={
                rec.resume
              }
              title="Resume recording (Ctrl+Alt+Shift+R)"
            >
              <Play size={14} />

              Resume
            </button>
          )}

          {!focusMode && (
            <button
              className="btn"
              onClick={() => setFocusMode(true)}
              title="Focus writing (Ctrl+Alt+Shift+F)"
            >
              <Maximize2 size={14} />

              Focus writing
            </button>
          )}

          <button
            className="btn btn-primary"
            onClick={() =>
              setDialog('end')
            }
            title="End consultation (Ctrl+Alt+Shift+Enter twice)"
          >
            <Square size={14} />

            End consultation
          </button>

        </div>

      </div>

      {rec.state ===
        'denied' && (
        <div
          className="alert err"
          role="alert"
        >
          The microphone is blocked or unavailable,
          so nothing is being recorded. You can still
          write; allow microphone access in your browser
          and{' '}
          <button
            className="link"
            onClick={rec.start}
          >
            try again
          </button>.
        </div>
      )}

      <WritingPad
        ref={pad}
        tool={tool}
        color={color}
        width={width}
        onChange={setInfo}
      />

      <ConfirmationDialog
        open={
          dialog === 'clear'
        }
        title="Clear the page?"
        confirmLabel="Clear page"
        message="All handwriting on this page will be removed. You can undo this straight afterwards."
        onClose={() =>
          setDialog(null)
        }
        onConfirm={() => {
          pad.current.clear()
          setDialog(null)
        }}
      />

      <ConfirmationDialog
        open={
          dialog === 'end'
        }
        title="End consultation?"
        confirmLabel="End and process"
        message={
          nothing
            ? 'Nothing was recorded or written. You will go to the review screen with no AI draft.'
            : 'Recording stops and the audio and handwriting are sent for AI processing. You will review the AI draft before anything is saved to the record.'
        }
        onClose={() =>
          setDialog(null)
        }
        onConfirm={end}
      />

    </div>
  )
}

const LABELS = {
  stt: 'Speech-to-text (conversation)',
  ocr: 'Handwriting recognition',
  llm: 'Clinical detail extraction'
}

function Processing({
  payload,
  onDone
}) {

  const [steps, setSteps] =
    useState({
      stt: payload.audio
        ? 'Queued'
        : 'Skipped',

      ocr: payload.inkImage
        ? 'Queued'
        : 'Skipped',

      llm: 'Ready'
    })

  useEffect(() => {

    ;(async () => {

      const up = (
        k,
        v
      ) => {
        setSteps(
          s => ({
            ...s,
            [k]: v
          })
        )
      }

      const ai = {
        transcript: '',
        handwritten: '',
        ocrRecognizedText: '',
        processingMs: 0,
        stt: 'Idle',
        llm: 'Idle',
        sttError: '',
        ocrError: '',
        llmError: '',
        draft: null,
        inkImage:
          payload.inkImage,
        strokeCount:
          payload.strokes
            ?.length ?? 0
      }

      const jobs = []
      const processingStartedAt = performance.now()

      /*
       * FIX:
       *
       * Previously:
       *
       * speechToText.transcribe(payload.audio)
       *
       * That meant meta?.consultationId was undefined.
       *
       * The backend expects:
       *
       * @RequestParam Long consultationId
       *
       * so it received:
       *
       * consultationId=undefined
       *
       * Now we explicitly pass the consultation ID.
       */
      if (payload.audio) {

        up(
          'stt',
          'Processing'
        )

        jobs.push(
          speechToText
            .transcribe(
              payload.audio,
              {
                consultationId:
                  payload.consultationId
              }
            )
            .then(
              r => {

                ai.transcript =
                  r.text

                ai.sttOriginalTranscript =
                  r.text

                ai.stt =
                  'Completed'

                ai.sttProvider =
                  r.provider

                up(
                  'stt',
                  'Completed'
                )
              },
              e => {

                ai.stt =
                  'Failed'

                ai.sttError =
                  e.message || 'Speech-to-text failed. Check the configured Whisper provider and API key.'

                up(
                  'stt',
                  'Failed'
                )
              }
            )
        )
      }

      if (payload.inkImage) {

        up(
          'ocr',
          'Processing'
        )

        jobs.push(
          ocr
            .recognize(
              payload.inkImage
            )
            .then(
              r => {

                ai.handwritten =
                  normalizeHandwrittenText(r.text)

                ai.ocrRecognizedText =
                  r.text

                ai.ocrProvider =
                  r.provider

                up(
                  'ocr',
                  'Completed'
                )
              },
              e => {
                ai.ocrError =
                  e.message || 'Handwriting recognition failed. Check the configured OCR provider.'

                up(
                  'ocr',
                  'Failed'
                )
              }
            )
        )
      }

      await Promise.all(
        jobs
      )
      if (jobs.length > 0) {
        ai.processingMs = Math.round(performance.now() - processingStartedAt)
      }
      up('llm', ai.transcript || ai.handwritten ? 'Ready' : 'Skipped')

      setTimeout(
        () =>
          onDone(ai),
        700
      )

    })()

  }, [])

  return (
    <div className="processing">

      <Card title="Processing consultation">

        <p className="muted">Preparing the transcript and handwriting. Extracted details will fill the consultation fields after you request extraction.</p>

        <ul className="list steps">

          {Object.entries(
            steps
          ).map(
            ([k, v]) => (
              <li key={k}>

                <span className="grow">
                  {LABELS[k]}
                </span>

                <StatusBadge
                  status={v}
                />

              </li>
            )
          )}

        </ul>

      </Card>

    </div>
  )
}