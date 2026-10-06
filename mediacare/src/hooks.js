import { useCallback, useEffect, useState } from 'react'
// Generic async loader -> { data, loading, error, reload }
export function useAsync(fn, deps = []) {
  const [s, setS] = useState({ data:null, loading:true, error:null })
  const run = useCallback(() => { setS(p => ({ ...p, loading:true, error:null }))
    fn().then(data => setS({ data, loading:false, error:null }), e => setS({ data:null, loading:false, error:e.message })) }, deps) // eslint-disable-line
  useEffect(run, [run])
  return { ...s, reload: run }
}
export function useDebounced(v, ms = 300) {
  const [d, setD] = useState(v); useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t) }, [v, ms]); return d
}
