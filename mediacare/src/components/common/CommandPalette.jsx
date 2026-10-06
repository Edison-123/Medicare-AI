import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, ArrowRight, CornerDownLeft, Sparkles, FileText,
  Activity, Users, Calendar, Pill, Shield, Stethoscope,
  FlaskConical, MessageSquare, ClipboardList, X
} from 'lucide-react'

export default function CommandPalette({ isOpen, onClose, role }) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)
  const nav = useNavigate()

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Command sets tailored to current user role
  const getCommands = () => {
    if (role === 'doctor') {
      return [
        { group: 'Quick Navigation', title: 'Dashboard', desc: 'Overview, pending refills & today schedule', link: '/doctor/dashboard', icon: Activity },
        { group: 'Quick Navigation', title: 'Patients Directory', desc: 'Search records, clinical history, timeline', link: '/doctor/patients', icon: Users },
        { group: 'Quick Navigation', title: 'Consultations & AI Scribe', desc: 'Real-time ambient listening & note drafting', link: '/doctor/consultations', icon: Stethoscope },
        { group: 'Quick Navigation', title: 'Prescriptions Hub', desc: 'Review, seal & issue verified digital scripts', link: '/doctor/prescriptions', icon: FileText },
        { group: 'Quick Navigation', title: 'AI Clinical Tools', desc: 'Drug interactions & SOAP summarizer', link: '/doctor/ai-tools', icon: Sparkles },
        { group: 'Quick Navigation', title: 'Analytics & Reports', desc: 'Practice KPIs, patient trends & audit logs', link: '/doctor/reports', icon: ClipboardList },
        { group: 'Quick Actions', title: 'New Prescription Draft', desc: 'Start an electronic prescription draft', link: '/doctor/prescriptions/new', icon: FileText },
        { group: 'Clinical Records', title: 'John Doe (Patient #101)', desc: '42y Male • Stage 1 Hypertension • Next visit Oct 12', link: '/doctor/patients/101', icon: Users },
        { group: 'Clinical Records', title: 'Sarah Wilson (Patient #102)', desc: '35y Female • Moderate Asthma • ICS-formoterol', link: '/doctor/patients/102', icon: Users },
      ]
    }

    if (role === 'admin') {
      return [
        { group: 'Quick Navigation', title: 'Admin Dashboard', desc: 'System-wide analytics, hospital distribution', link: '/admin/dashboard', icon: Activity },
        { group: 'Quick Navigation', title: 'Physicians Registry', desc: 'Manage doctor licenses, status & onboarding', link: '/admin/doctors', icon: Stethoscope },
        { group: 'Quick Navigation', title: 'Master Patients List', desc: 'Cross-hospital patient database & risk tiers', link: '/admin/patients', icon: Users },
        { group: 'Quick Navigation', title: 'Hospital Network', desc: 'Facility bed capacity & HL7/FHIR integration', link: '/admin/hospitals', icon: Shield },
        { group: 'Quick Navigation', title: 'Prescription Audit', desc: 'Safety overrides & controlled substance review', link: '/admin/prescriptions', icon: FileText },
        { group: 'Quick Navigation', title: 'Security & System Logs', desc: 'Live audit trail, rate-limiting & auth events', link: '/admin/system-logs', icon: Activity },
        { group: 'System Controls', title: 'Platform Security Settings', desc: 'MFA policies, password expiration & backups', link: '/admin/settings', icon: Shield },
      ]
    }

    // Patient
    return [
      { group: 'Quick Navigation', title: 'My Health Dashboard', desc: 'Current vitals, medication schedule & overview', link: '/patient/dashboard', icon: Activity },
      { group: 'Quick Navigation', title: 'My Prescriptions', desc: 'Review active scripts, download PDF, request refills', link: '/patient/prescriptions', icon: FileText },
      { group: 'Quick Navigation', title: 'Doctor Visit Summaries', desc: 'Plain-language summaries of recent clinic visits', link: '/patient/visit-summaries', icon: ClipboardList },
      { group: 'Quick Navigation', title: 'Clinic Appointments', desc: 'View upcoming in-person doctor visits or book OPD', link: '/patient/appointments', icon: Calendar },
      { group: 'Quick Navigation', title: 'Lab Test Results', desc: 'Diagnostic blood panels, reference ranges & charts', link: '/patient/lab-tests', icon: FlaskConical },
      { group: 'Quick Navigation', title: 'Medicine Reminders', desc: 'Daily pill adherence tracker & refill warnings', link: '/patient/medicine-reminders', icon: Pill },
      { group: 'Quick Navigation', title: 'Medical Records & Allergies', desc: 'Chronic conditions, uploaded scans & documents', link: '/patient/medical-records', icon: Shield },
      { group: 'Quick Navigation', title: 'Doctor Messages', desc: 'Direct secure chat with Dr. John Smith', link: '/patient/messages', icon: MessageSquare },
      { group: 'Medications on File', title: 'Amlodipine 5mg', desc: 'Blood pressure • 1 tablet daily at morning', link: '/patient/prescriptions', icon: Pill },
      { group: 'Medications on File', title: 'Metformin 500mg', desc: 'Blood sugar control • 1 tablet with evening meal', link: '/patient/prescriptions', icon: Pill },
    ]
  }

  const allItems = getCommands()
  const filteredItems = query.trim()
    ? allItems.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.desc.toLowerCase().includes(query.toLowerCase()) ||
        item.group.toLowerCase().includes(query.toLowerCase())
      )
    : allItems

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleSelect = (item) => {
    onClose()
    if (item.link) {
      nav(item.link)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % (filteredItems.length || 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % (filteredItems.length || 1))
    } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
      e.preventDefault()
      handleSelect(filteredItems[selectedIndex])
    }
  }

  if (!isOpen) return null

  // Group filtered items by their group category
  const groups = {}
  filteredItems.forEach((item, idx) => {
    if (!groups[item.group]) groups[item.group] = []
    groups[item.group].push({ ...item, globalIndex: idx })
  })

  return (
    <div className="cmd-palette-backdrop" onClick={onClose}>
      <div className="cmd-palette" onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="cmd-search-box">
          <Search size={20} color="var(--primary)" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`Search ${role} commands, records, medicines, or pages…`}
            aria-label="Command search"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--muted)', padding: 4 }}
            >
              <X size={16} />
            </button>
          )}
          <span className="cmd-shortcut">ESC</span>
        </div>

        <div className="cmd-results">
          {filteredItems.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.9rem' }}>
              No commands or records matching "<strong>{query}</strong>"
            </div>
          ) : (
            Object.entries(groups).map(([groupTitle, items]) => (
              <div key={groupTitle}>
                <div className="cmd-group-title">{groupTitle}</div>
                {items.map(item => {
                  const Icon = item.icon
                  const isSelected = item.globalIndex === selectedIndex
                  return (
                    <div
                      key={item.title}
                      className={`cmd-item ${isSelected ? 'active' : ''}`}
                      onMouseEnter={() => setSelectedIndex(item.globalIndex)}
                      onClick={() => handleSelect(item)}
                    >
                      <span className="cmd-icon">
                        <Icon size={16} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ display: 'block', fontSize: '0.88rem' }}>{item.title}</strong>
                        <span style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>{item.desc}</span>
                      </div>
                      {isSelected && <CornerDownLeft size={14} color="var(--primary)" />}
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>

        <div className="cmd-footer">
          <div style={{ display: 'flex', gap: 14 }}>
            <span><span className="cmd-shortcut">↑</span> <span className="cmd-shortcut">↓</span> Navigate</span>
            <span><span className="cmd-shortcut">↵</span> Select</span>
          </div>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Sparkles size={12} color="var(--primary)" /> MediCare Quick Search
          </span>
        </div>
      </div>
    </div>
  )
}
