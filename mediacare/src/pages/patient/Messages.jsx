import { useState, useEffect, useRef } from 'react'
import {
  Send, Sparkles, User, Stethoscope, CheckCheck, Clock,
  ShieldCheck, AlertCircle, PhoneCall
} from 'lucide-react'
import { patientApi } from '../../services/api'
import { useAsync } from '../../hooks'
import {
  Card, PageHeader, LoadingState, ErrorState
} from '../../components/common/ui'

export default function PatientMessages() {
  const { data: thread, loading, error, reload } = useAsync(patientApi.getMessages)
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [thread?.messages.length])

  const handleSend = async (e) => {
    e?.preventDefault()
    const text = inputText.trim()
    if (!text) return
    setSending(true)
    try {
      await patientApi.sendMessage(text)
      setInputText('')
      reload()
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Direct Care Team Messages"
        subtitle="Chat with your care team about follow-up questions and prescription guidance."
        actions={
          <div className="row">
            <span className="row" style={{ fontSize: '0.85rem', color: 'var(--muted)', background: '#fff', border: '1px solid var(--line)', padding: '6px 12px', borderRadius: 10 }}>
              <span className="ping-indicator" /> Care team
            </span>
          </div>
        }
      />

      {loading && <LoadingState label="Loading messages with your doctor…" />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {thread && (
        <Card style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 220px)', minHeight: 520 }}>
          {/* Chat Header Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--line)', background: '#fafbfc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="avatar" style={{ width: 44, height: 44 }}>CT</div>
              <div>
                <strong style={{ fontSize: '1.05rem' }}>Care team</strong>
                <div className="muted small">Secure patient messaging</div>
              </div>
            </div>

            <div style={{ color: 'var(--green)', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
              <ShieldCheck size={16} /> Encrypted HIPAA-Compliant Channel
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              background: '#f8fafc'
            }}
          >
            <div className="ai-banner" style={{ margin: '0 auto 10px', maxWidth: 600, textAlign: 'center' }}>
              <strong>Notice:</strong> For acute medical emergencies, please dial 911 or visit the nearest emergency department immediately.
            </div>

            {thread.messages.map((m, idx) => {
              const isPatient = m.sender === 'patient'
              return (
                <div
                  key={m.id || idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isPatient ? 'flex-end' : 'flex-start',
                    maxWidth: '75%',
                    alignSelf: isPatient ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div
                    style={{
                      background: isPatient ? 'var(--primary)' : '#fff',
                      color: isPatient ? '#fff' : 'var(--text)',
                      border: isPatient ? 'none' : '1px solid var(--line)',
                      padding: '12px 16px',
                      borderRadius: isPatient ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      fontSize: '0.92rem',
                      lineHeight: 1.45
                    }}
                  >
                    {!isPatient && (
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>
                        Care team
                      </div>
                    )}
                    {m.text}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>{m.time}</span>
                    {isPatient && <CheckCheck size={13} color="var(--primary)" />}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Message Input Box */}
          <form
            onSubmit={handleSend}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 18px',
              borderTop: '1px solid var(--line)',
              background: '#fff'
            }}
          >
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Type a message or health question…"
              style={{
                flex: 1,
                border: '1px solid var(--line)',
                borderRadius: 10,
                padding: '10px 14px',
                font: 'inherit',
                fontSize: '0.9rem'
              }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={sending || !inputText.trim()}
              style={{ minWidth: 100 }}
            >
              <Send size={15} /> {sending ? 'Sending…' : 'Send'}
            </button>
          </form>
        </Card>
      )}
    </>
  )
}
