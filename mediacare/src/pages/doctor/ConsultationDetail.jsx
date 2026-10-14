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
  Mic
} from 'lucide-react'
import { consultationsApi } from '../../services/api'
import { speechToText, ocr, llm, normalizeHandwrittenText } from '../../services/ai'
import { useAsync } from '../../hooks'
import { useRecording } from '../../components/ai/useRecording'
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

function PadStage({ data, onEnd }) {
  const rec = useRecording()
  const pad = useRef()
  const p = data.patientInfo

  const [tool, setTool] = useState('pen')
  const [color, setColor] = useState(COLORS[0][1])
  const [width, setWidth] = useState(2.5)

  const [info, setInfo] = useState({
    count: 0,
    canUndo: false
  })

  const [dialog, setDialog] = useState(null)

  useEffect(() => {
    /*
     * Starting a consultation changes the EXISTING
     * consultation + linked appointment to In Progress.
     */
    consultationsApi.start(data.id)
  }, [])

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

  const nothing =
    !info.count &&
    rec.state !== 'recording' &&
    rec.state !== 'paused'

  return (
    <div className="pad-stage">

      <div className="pad-bar">

        <div className="pad-who">

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
            title="Pen"
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
            title="Eraser"
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
            title="Undo"
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

          {rec.state ===
            'idle' && (
            <button
              className="btn btn-primary"
              onClick={rec.start}
            >
              <Mic size={14} />

              Start recording
            </button>
          )}

          {rec.state ===
            'recording' && (
            <button
              className="btn btn-sm"
              onClick={
                rec.pause
              }
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
            >
              <Play size={14} />

              Resume
            </button>
          )}

          <button
            className="btn btn-primary"
            onClick={() =>
              setDialog('end')
            }
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