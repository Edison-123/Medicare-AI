import { useCallback, useEffect, useRef, useState } from 'react'
// state: idle | requesting | recording | paused | stopped | denied.  stop() resolves to a Blob (or null if nothing was captured).
export function useRecording() {
  const [state, setState] = useState('idle'); const [secs, setSecs] = useState(0)
  const mr = useRef(null), chunks = useRef([]), stream = useRef(null), timer = useRef(null), alive = useRef(true)
  const tick = () => { clearInterval(timer.current); timer.current = setInterval(() => setSecs(s => s + 1), 1000) }
  const start = useCallback(async () => {
    setState('requesting')
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio:true })
      if (!alive.current) { s.getTracks().forEach(t => t.stop()); return }
      stream.current = s; chunks.current = []; mr.current = new MediaRecorder(s)
      mr.current.ondataavailable = e => e.data.size && chunks.current.push(e.data)
      mr.current.start(1000); setSecs(0); setState('recording'); tick()
    } catch { setState('denied') }
  }, [])
  const pause = useCallback(() => { if (mr.current?.state === 'recording') { mr.current.pause(); clearInterval(timer.current); setState('paused') } }, [])
  const resume = useCallback(() => { if (mr.current?.state === 'paused') { mr.current.resume(); tick(); setState('recording') } }, [])
  const stop = useCallback(() => new Promise(resolve => {
    clearInterval(timer.current); const m = mr.current
    const blob = type => chunks.current.length ? new Blob(chunks.current, { type }) : null
    if (!m || m.state === 'inactive') return resolve(blob('audio/webm'))
    m.onstop = () => { stream.current?.getTracks().forEach(t => t.stop()); setState('stopped'); resolve(blob(m.mimeType || 'audio/webm')) }
    m.stop()
  }), [])
  useEffect(() => { alive.current = true; return () => { alive.current = false; clearInterval(timer.current)
    if (mr.current && mr.current.state !== 'inactive') mr.current.stop(); stream.current?.getTracks().forEach(t => t.stop()) } }, [])
  return { state, secs, start, pause, resume, stop }
}
