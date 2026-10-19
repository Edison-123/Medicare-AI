import { useState, useEffect, useRef, useContext } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, Send, FileText, User, CheckCheck, Clock, MessageSquare } from 'lucide-react'
import { messagesApi, subscribeToMessageUpdates } from '../../services/api'
import { WorkflowSettingsContext } from '../../context/WorkflowSettingsContext'
import { useAsync } from '../../hooks'
import { Avatar, Card, PageHeader, LoadingState, ErrorState, EmptyState } from '../../components/common/ui'

export default function Messages() {
  const workflowSettings = useContext(WorkflowSettingsContext)
  const [searchParams] = useSearchParams()
  const canMessage = workflowSettings.patientMessagingEnabled !== false
  const { data: threads, loading, error, reload } = useAsync(messagesApi.listThreads)
  const [selectedId, setSelectedId] = useState(null)
  const [q, setQ] = useState('')
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => subscribeToMessageUpdates(reload), [reload])

  const markThreadRead = async patientId => {
    await messagesApi.markAsRead(patientId)
    window.dispatchEvent(new Event('notifications-updated'))
    reload()
  }

  useEffect(() => {
    if (selectedId !== null || !threads?.length) return
    const requestedPatientId = Number(searchParams.get('patientId'))
    const selectedThread = threads.find(thread => thread.patientId === requestedPatientId) || threads[0]
    setSelectedId(selectedThread.patientId)
    void markThreadRead(selectedThread.patientId)
  }, [threads, selectedId, searchParams])

  const activeThread = threads?.find(t => t.patientId === selectedId)

  // Scroll to bottom when thread messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [selectedId, activeThread?.messages.length])

  const selectThread = async (id) => {
    setSelectedId(id)
    await markThreadRead(id)
  }

  const handleSend = async (e) => {
    e?.preventDefault()
    const text = inputText.trim()
    if (!text || !activeThread) return
    setSending(true)
    try {
      await messagesApi.sendMessage(activeThread.patientId, text)
      setInputText('')
      reload()
    } finally {
      setSending(false)
    }
  }

  const filteredThreads = (threads || []).filter(t =>
    t.patientName.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <>
      <PageHeader
        title="Messages"
        subtitle="Patient communications, triage follow-ups, and medication queries."
      />

      {loading && <LoadingState label="Loading patient message threads…" />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {threads && (
        <div className="card doctor-message-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', border: '1px solid var(--line)', borderRadius: 'var(--r)' }}>
          {/* Left panel: Conversation List */}
          <div style={{ width: 320, minHeight: 0, flexShrink: 0, borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', background: '#fafbfc' }}>
            <div style={{ padding: 12, borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
              <label className="search" style={{ width: '100%', boxSizing: 'border-box' }}>
                <Search size={16} />
                <input
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Search conversations…"
                  aria-label="Search conversations"
                />
              </label>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain' }}>
              {filteredThreads.length === 0 ? (
                <EmptyState
                  title={threads.length === 0 ? 'No conversations yet' : 'No matching patients'}
                  hint={threads.length === 0 ? 'Patient conversations will appear here when a care relationship is established.' : 'Try another patient name.'}
                />
              ) : (
                filteredThreads.map(t => {
                  const lastMsg = t.messages[t.messages.length - 1]
                  const isSelected = t.patientId === selectedId
                  return (
                    <div
                      key={t.patientId}
                      onClick={() => selectThread(t.patientId)}
                      style={{
                        padding: '12px 14px',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--line)',
                        background: isSelected ? '#eef2ff' : 'transparent',
                        borderLeft: isSelected ? '4px solid var(--primary)' : '4px solid transparent',
                        transition: 'background 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={t.patientName} size={38} src={t.profilePicture} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <strong style={{ fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {t.patientName}
                            </strong>
                            <span className="muted small" style={{ fontSize: '0.72rem' }}>
                              {t.lastActivity}
                            </span>
                          </div>
                          <p style={{
                            margin: '3px 0 0',
                            fontSize: '0.78rem',
                            color: 'var(--muted)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {lastMsg ? lastMsg.text : 'No messages'}
                          </p>
                        </div>
                        {t.unreadCount > 0 && (
                          <span style={{
                            background: 'var(--primary)',
                            color: '#fff',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: 99
                          }}>
                            {t.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Right panel: Chat window */}
          <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#fff' }}>
            {activeThread ? (
              <>
                {/* Header */}
                <div style={{
                  padding: '12px 20px',
                  borderBottom: '1px solid var(--line)',
                  display: 'flex',
                  flexShrink: 0,
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#fff'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={activeThread.patientName} size={40} src={activeThread.profilePicture} />
                    <div>
                      <strong style={{ fontSize: '0.95rem' }}>{activeThread.patientName}</strong>
                      <span className="muted small" style={{ display: 'block', fontSize: '0.75rem' }}>Patient ID: #{activeThread.patientId}</span>
                    </div>
                  </div>
                  <div className="row">
                    <Link className="btn btn-sm" to={`/doctor/patients/${activeThread.patientId}`}>
                      <User size={14} /> Full Record
                    </Link>
                    <Link className="btn btn-sm btn-primary" to={`/doctor/prescriptions/new?patientId=${activeThread.patientId}`}>
                      <FileText size={14} /> Prescribe
                    </Link>
                  </div>
                </div>

                {/* Messages stream */}
                <div
                  ref={scrollRef}
                  style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    overscrollBehavior: 'contain',
                    padding: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    background: '#f8fafc'
                  }}
                >
                  {activeThread.messages.length === 0 ? <EmptyState title="No messages yet" hint="Send a message to start this conversation with the patient." /> : activeThread.messages.map((m, idx) => {
                    const isDoctor = m.sender === 'doctor'
                    return (
                      <div
                        key={idx}
                        style={{
                          alignSelf: isDoctor ? 'flex-end' : 'flex-start',
                          maxWidth: '72%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isDoctor ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <div
                          style={{
                            background: isDoctor ? 'var(--primary)' : '#fff',
                            color: isDoctor ? '#fff' : 'var(--text)',
                            padding: '10px 14px',
                            borderRadius: isDoctor ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                            border: isDoctor ? 'none' : '1px solid var(--line)',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            fontSize: '0.9rem',
                            lineHeight: 1.45
                          }}
                        >
                          {m.text}
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 3 }}>
                          {m.time} {isDoctor && <CheckCheck size={12} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 2 }} />}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Send Input Bar */}
                {canMessage ? <form
                  onSubmit={handleSend}
                  style={{
                    padding: '12px 16px',
                    borderTop: '1px solid var(--line)',
                    display: 'flex',
                    flexShrink: 0,
                    gap: 10,
                    alignItems: 'center',
                    background: '#fff'
                  }}
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder={`Reply to ${activeThread.patientName}…`}
                    disabled={sending}
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
                    disabled={!inputText.trim() || sending}
                  >
                    <Send size={15} />
                    {sending ? 'Sending…' : 'Send'}
                  </button>
                </form> : <div className="alert" role="status" style={{ margin: 12 }}>Patient messaging is temporarily unavailable. Conversation history remains available.</div>}
              </>
            ) : (
              <div className="state" style={{ margin: 'auto' }}>
                <MessageSquare size={36} />
                <strong>Select a conversation</strong>
                <span className="muted">Choose a patient from the list on the left to review messages.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
