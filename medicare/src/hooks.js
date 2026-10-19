import { useCallback, useEffect, useRef, useState } from 'react'
// Generic async loader -> { data, loading, error, reload }
export function useAsync(fn, deps = []) {
  const [s, setS] = useState({ data:null, loading:true, error:null })
  const requestId = useRef(0)
  const run = useCallback(() => {
    const currentRequest = ++requestId.current
    setS(p => ({ ...p, loading:true, error:null }))
    Promise.resolve().then(fn).then(
      data => { if (currentRequest === requestId.current) setS({ data, loading:false, error:null }) },
      e => { if (currentRequest === requestId.current) setS({ data:null, loading:false, error:e.message }) }
    )
  }, deps) // eslint-disable-line
  useEffect(() => {
    run()
    return () => { requestId.current += 1 }
  }, [run])
  return { ...s, reload: run }
}
export function useDebounced(v, ms = 300) {
  const [d, setD] = useState(v); useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t) }, [v, ms]); return d
}
