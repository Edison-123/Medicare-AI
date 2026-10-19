import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
/**
 * Digital writing pad. Pointer Events cover trackpad, mouse, touch and stylus (pressure used for pens).
 * Strokes are stored as vector data so they can be undone, erased and re-rendered; getImage() exports a PNG for OCR.
 */
const WritingPad = forwardRef(function WritingPad({ tool, color, width, onChange }, ref) {
  const wrap = useRef(), cv = useRef(), strokes = useRef([]), history = useRef([]), cur = useRef(null), erasing = useRef(false)
  const notify = () => onChange?.({ count: strokes.current.length, canUndo: history.current.length > 0 })
  const getContext = () => {
    const ctx = cv.current.getContext('2d'), dpr = devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.shadowBlur = 0
    return ctx
  }
  const drawDot = (ctx, stroke, point) => {
    ctx.fillStyle = stroke.color; ctx.beginPath()
    ctx.arc(point.x, point.y, Math.max(1.5, point.w / 2), 0, 7); ctx.fill()
  }
  const drawSegment = (ctx, stroke, from, to) => {
    ctx.strokeStyle = stroke.color; ctx.lineWidth = Math.max(1.5, to.w * 1.15)
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke()
  }
  const render = () => {
    const c = cv.current, ctx = getContext()
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, c.width, c.height)
    for (const s of strokes.current) {
      if (s.pts.length === 1) { drawDot(ctx, s, s.pts[0]); continue }
      for (let i = 1; i < s.pts.length; i++) drawSegment(ctx, s, s.pts[i - 1], s.pts[i])
    }
  }
  useEffect(() => { // size the canvas to its container (HiDPI aware)
    const fit = () => { const r = wrap.current.getBoundingClientRect(), dpr = devicePixelRatio || 1
      cv.current.width = r.width * dpr; cv.current.height = r.height * dpr; render() }
    fit(); const ro = new ResizeObserver(fit); ro.observe(wrap.current); return () => ro.disconnect()
  }, []) // eslint-disable-line
  const snapshot = () => { history.current.push(strokes.current.map(s => s)); if (history.current.length > 50) history.current.shift() }
  const pt = e => { const r = cv.current.getBoundingClientRect(); const pen = e.pointerType === 'pen'
    return { x:e.clientX - r.left, y:e.clientY - r.top, w: pen ? width * (0.6 + e.pressure * 1.3) : width * 1.3 } }
  const erase = p => { const before = strokes.current.length
    strokes.current = strokes.current.filter(s => !s.pts.some(q => Math.hypot(q.x - p.x, q.y - p.y) < 14))
    if (strokes.current.length !== before) { render(); notify() } }
  const down = e => { e.preventDefault(); cv.current.setPointerCapture(e.pointerId); const p = pt(e); snapshot()
    if (tool === 'eraser') { erasing.current = true; erase(p) } else {
      cur.current = { color, pts:[p] }; strokes.current = [...strokes.current, cur.current]
      drawDot(getContext(), cur.current, p)
    }
    notify() }
  const move = e => { if (erasing.current) return erase(pt(e)); if (!cur.current) return
    const previous = cur.current.pts[cur.current.pts.length - 1], point = pt(e)
    cur.current.pts.push(point)
    drawSegment(getContext(), cur.current, previous, point) }
  const up = e => {
    if (cur.current) {
      const rect = cv.current.getBoundingClientRect()
      const points = cur.current.pts
      const last = points[points.length - 1]
      const end = { x: e.clientX - rect.left, y: e.clientY - rect.top, w: last.w }
      if (Math.hypot(end.x - last.x, end.y - last.y) > 0.5) {
        points.push(end)
        drawSegment(getContext(), cur.current, last, end)
      }
    }
    cur.current = null
    erasing.current = false
    notify()
  }
  useImperativeHandle(ref, () => ({
    undo() { if (history.current.length) { strokes.current = history.current.pop(); render(); notify() } },
    clear() { if (strokes.current.length) { snapshot(); strokes.current = []; render(); notify() } },
    getStrokes: () => strokes.current,
    getImage() { const c = cv.current, o = document.createElement('canvas'); o.width = c.width; o.height = c.height
      const x = o.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, o.width, o.height); x.drawImage(c, 0, 0); return o.toDataURL('image/png') },
  }))
  return <div ref={wrap} className="paper"><canvas ref={cv} className={tool === 'eraser' ? 'erase' : ''} aria-label="Writing area. Draw with a trackpad, mouse or stylus."
    onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} /></div>
})
export default WritingPad
