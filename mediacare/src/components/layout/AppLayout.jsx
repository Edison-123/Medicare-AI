import { useState, useEffect, useRef } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Menu, Search, Bell, Heart, LogOut, LayoutDashboard, Users, Stethoscope, FileText, Sparkles, BarChart3, MessageSquare, Settings,
  FolderHeart, ClipboardList, FlaskConical, CalendarDays, Pill, User, Building2, Activity, X, CheckCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { systemApi } from '../../services/api'
import { Avatar } from '../common/ui'
import CommandPalette from '../common/CommandPalette'

const NAV = {
  doctor: { theme:'doctor', brand:'Smart Prescription Platform', items:[
    ['dashboard','Dashboard',LayoutDashboard],['patients','Patients',Users],['consultations','Consultations',Stethoscope],['prescriptions','Prescriptions',FileText],
    ['ai-tools','AI Tools',Sparkles],['reports','Reports',BarChart3],['messages','Messages',MessageSquare],['settings','Settings',Settings]] },
  patient: { theme:'patient', brand:'Your Health, Our Priority', items:[
    ['dashboard','Dashboard',LayoutDashboard],['prescriptions','Prescriptions',FileText],['medical-records','Medical Records',FolderHeart],['visit-summaries','Visit Summaries',ClipboardList],
    ['lab-tests','Lab Tests',FlaskConical],['appointments','Appointments',CalendarDays],['medicine-reminders','Medicine Reminders',Pill],['messages','Messages',MessageSquare],
    ['profile','Profile',User],['settings','Settings',Settings]] },
  admin: { theme:'admin', brand:'Admin Panel', items:[
    ['dashboard','Dashboard',LayoutDashboard],['doctors','Doctors',Stethoscope],['patients','Patients',Users],['hospitals','Hospitals',Building2],['prescriptions','Prescriptions',FileText],
    ['reports','Reports & Analytics',BarChart3],['system-logs','System Logs',Activity],['settings','Settings',Settings]] },
}
// One layout, three themes: DoctorLayout / PatientLayout / AdminLayout are thin wrappers so the systems stay related.
function AppLayout({ kind }) {
  const cfg = NAV[kind]; const { user, logout } = useAuth(); const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifs, setNotifs] = useState([])
  const [cmdOpen, setCmdOpen] = useState(false)
  const notifRef = useRef(null)

  const greeting = kind === 'doctor' ? 'Good Morning,' : kind === 'patient' ? 'Welcome,' : 'Signed in as'

  const loadNotifs = () => {
    systemApi.getNotifications(kind).then(data => {
      setNotifs(data ? [...data] : [])
    }).catch(() => {})
  }

  useEffect(() => {
    loadNotifs()
    const refreshId = window.setInterval(loadNotifs, 15000)
    return () => window.clearInterval(refreshId)
  }, [kind])

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCmdOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    const handleOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    if (notifOpen) {
      document.addEventListener('mousedown', handleOutside)
    }
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [notifOpen])

  const handleMarkAllRead = async (e) => {
    e.stopPropagation()
    await systemApi.markAllAsRead(kind)
    setNotifs(prev => prev.map(n => ({ ...n, unread: false })))
  }

  const handleNotifClick = (notif) => {
    setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, unread: false } : n))
    setNotifOpen(false)
    if (notif.link) {
      nav(notif.link)
    }
  }

  const unreadCount = notifs.filter(n => n.unread).length

  return <div className="shell" data-theme={cfg.theme}>
    <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Primary">
      <div className="brand"><Heart fill="currentColor" size={30} /><div><strong>MediCare AI</strong><small>{cfg.brand}</small></div>
        <button className="icon-btn only-mobile" aria-label="Close menu" onClick={() => setOpen(false)}><X size={18} /></button></div>
      <nav>{cfg.items.map(([path, label, Icon, badge]) => <NavLink key={path} to={`/${kind}/${path}`} onClick={() => setOpen(false)}
        className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}><Icon size={18} /><span>{label}</span>{badge && <em>{badge}</em>}</NavLink>)}</nav>
      <div className="side-foot"><Avatar name={user.name} /><div><strong>{user.name}</strong><small>{user.sub}</small></div>
        <button className="icon-btn light" aria-label="Log out" title="Log out" onClick={() => { logout(); nav('/login') }}><LogOut size={18} /></button></div>
    </aside>
    {open && <div className="scrim" onClick={() => setOpen(false)} />}
    <div className="main">
      <header className="topbar">
        <button className="icon-btn only-mobile" aria-label="Open menu" onClick={() => setOpen(true)}><Menu size={22} /></button>
        <div
          className="search"
          onClick={() => setCmdOpen(true)}
          style={{ cursor: 'pointer', userSelect: 'none' }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setCmdOpen(true) }}
        >
          <Search size={16} />
          <span style={{ flex: 1, color: 'var(--muted)', fontSize: '0.85rem' }}>Find a page…</span>
          <span className="cmd-shortcut">Ctrl K</span>
        </div>
        <div className="row" style={{ position: 'relative' }} ref={notifRef}>
          <button
            className="icon-btn"
            aria-label={`Notifications (${unreadCount} unread)`}
            title="Notifications"
            onClick={() => {
              loadNotifs()
              setNotifOpen(o => !o)
            }}
          >
            <Bell size={20} />
            {unreadCount > 0 && <i className="dot" />}
          </button>

          {notifOpen && (
            <div className="notif-dropdown">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--line)', background: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong style={{ fontSize: '0.92rem' }}>Notifications</strong>
                  {unreadCount > 0 && (
                    <span className="badge badge-blue">{unreadCount} new</span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    className="link"
                    style={{ fontSize: '0.78rem', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    onClick={handleMarkAllRead}
                  >
                    <CheckCheck size={14} /> Mark all read
                  </button>
                )}
              </div>

              <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                {notifs.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
                    No notifications right now
                  </div>
                ) : (
                  notifs.map(n => (
                    <div
                      key={n.id}
                      className={`notif-item ${n.unread ? 'unread' : ''}`}
                      onClick={() => handleNotifClick(n)}
                    >
                      <div style={{ marginTop: 3 }}>
                        <span style={{
                          display: 'inline-block',
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: n.unread ? 'var(--primary)' : '#cbd5e1'
                        }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                          <strong style={{ fontSize: '0.86rem', color: n.unread ? 'var(--text)' : 'var(--muted)' }}>
                            {n.title}
                          </strong>
                          <span style={{ fontSize: '0.72rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                            {n.timeAgo || n.time}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text)', lineHeight: 1.35 }}>
                          {n.message}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <Avatar name={user.name} />
        </div>
      </header>
      <main className="content" aria-label={`${greeting} ${user.name}`}><Outlet /></main>
    </div>
    <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} role={kind} />
  </div>
}
export const DoctorLayout = () => <AppLayout kind="doctor" />
export const PatientLayout = () => <AppLayout kind="patient" />
export const AdminLayout = () => <AppLayout kind="admin" />
