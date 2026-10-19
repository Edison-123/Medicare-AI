import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, AlertTriangle, AlertOctagon, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 4)
    setToasts(prev => [...prev, { id, message, type }])
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }, [removeToast])

  const toast = {
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur),
    warn: (msg, dur) => addToast(msg, 'warn', dur),
    info: (msg, dur) => addToast(msg, 'info', dur),
  }

  const icons = {
    success: <CheckCircle2 size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: 1 }} />,
    error: <AlertOctagon size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />,
    warn: <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />,
    info: <Info size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: 1 }} />,
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`} role="alert">
            {icons[t.type] || icons.info}
            <div style={{ flex: 1, fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.4 }}>
              {t.message}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              style={{ background: 'none', border: 0, cursor: 'pointer', padding: 2, color: 'var(--muted)', display: 'grid', placeItems: 'center' }}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
