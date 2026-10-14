import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
/**
 * Digital writing pad. Pointer Events cover trackpad, mouse, touch and stylus (pressure used for pens).
 * Strokes are stored as vector data so they can be undone, erased and re-rendered; getImage() exports a PNG for OCR.
 */
const WritingPad = forwardRef(function WritingPad({ tool, color, width, onChange }, ref) {
  const wrap = useRef(), cv = useRef(), strokes = useRef([]), history = useRef([]), cur = useRef(null), erasing = useRef(false)
  const notify = () => onChange?.({ count: strokes.current.length, canUndo: history.current.length > 0 })
  const render = () => {
    const c = cv.current, ctx = c.getContext('2d'), dpr = devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, c.width, c.height)
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.shadowBlur = 0
    for (const s of strokes.current) {
      ctx.strokeStyle = s.color
      if (s.pts.length === 1) { ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(s.pts[0].x, s.pts[0].y, Math.max(1.5, s.pts[0].w / 2), 0, 7); ctx.fill(); continue }
      for (let i = 1; i < s.pts.length; i++) { // midpoint quadratic smoothing, per-point width for pressure
        const a = s.pts[i - 1], b = s.pts[i], m0 = i > 1 ? { x:(s.pts[i - 2].x + a.x) / 2, y:(s.pts[i - 2].y + a.y) / 2 } : a, m1 = { x:(a.x + b.x) / 2, y:(a.y + b.y) / 2 }
        ctx.lineWidth = Math.max(1.5, b.w * 1.15); ctx.beginPath(); ctx.moveTo(m0.x, m0.y); ctx.quadraticCurveTo(a.x, a.y, m1.x, m1.y); ctx.stroke()
      }
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
    if (tool === 'eraser') { erasing.current = true; erase(p) } else { cur.current = { color, pts:[p] }; strokes.current = [...strokes.current, cur.current]; render() }
    notify() }
  const move = e => { if (erasing.current) return erase(pt(e)); if (!cur.current) return
    cur.current.pts.push(pt(e)); render() }
  const up = () => { if (cur.current && cur.current.pts.length === 1) render(); cur.current = null; erasing.current = false; notify() }
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
