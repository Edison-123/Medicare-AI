import { useState, useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Menu, Search, Bell, LogOut, LayoutDashboard, Users, Stethoscope, FileText, BarChart3, MessageSquare, Settings,
  ClipboardList, CalendarDays, Pill, User, Building2, Activity, X, CheckCheck, Trash2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { DEFAULT_WORKFLOW_SETTINGS, WorkflowSettingsContext } from '../../context/WorkflowSettingsContext'
import { subscribeToNotificationUpdates, systemApi } from '../../services/api'
import { Avatar } from '../common/ui'
import CommandPalette from '../common/CommandPalette'

const NAV = {
  doctor: { theme:'doctor', brand:'Smart Prescription Platform', items:[
    ['dashboard','Dashboard',LayoutDashboard],['patients','Patients',Users],['consultations','Consultations',Stethoscope],['prescriptions','Prescriptions',FileText],
    ['reports','Reports',BarChart3],['messages','Messages',MessageSquare],['settings','Settings',Settings]] },
  patient: { theme:'patient', brand:'Your Health, Our Priority', items:[
    ['dashboard','Dashboard',LayoutDashboard],['prescriptions','Prescriptions',FileText],['visit-summaries','Visit Summaries',ClipboardList],
    ['appointments','Appointments',CalendarDays],['medicine-reminders','Medicine Reminders',Pill],['messages','Messages',MessageSquare],
    ['profile','Profile & Account',User],['settings','Settings',Settings]] },
  admin: { theme:'admin', brand:'Admin Panel', items:[
    ['dashboard','Dashboard',LayoutDashboard],['doctors','Doctors',Stethoscope],['patients','Patients',Users],['hospitals','Hospitals',Building2],['prescriptions','Prescriptions',FileText],
    ['reports','Reports & Analytics',BarChart3],['system-logs','System Logs',Activity],['settings','Settings',Settings]] },
}
// One layout, three themes: DoctorLayout / PatientLayout / AdminLayout are thin wrappers so the systems stay related.
function AppLayout({ kind }) {
  const cfg = NAV[kind]; const { user, logout } = useAuth(); const nav = useNavigate(); const location = useLocation()
  const messagesView = (kind === 'doctor' && location.pathname === '/doctor/messages')
    || (kind === 'patient' && location.pathname === '/patient/messages')
  const [open, setOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(236)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifs, setNotifs] = useState([])
  const [cmdOpen, setCmdOpen] = useState(false)
  const [workflowSettings, setWorkflowSettings] = useState(DEFAULT_WORKFLOW_SETTINGS)
  const notifRef = useRef(null)

  const greeting = kind === 'doctor' ? 'Good Morning,' : kind === 'patient' ? 'Welcome,' : 'Signed in as'

  const loadNotifs = () => {
    systemApi.getNotifications(kind).then(data => {
      setNotifs(data ? [...data] : [])
    }).catch(() => {})
  }

  useEffect(() => {
    loadNotifs()
    const unsubscribe = subscribeToNotificationUpdates(loadNotifs)
    const handleNotificationsUpdated = () => loadNotifs()
    window.addEventListener('notifications-updated', handleNotificationsUpdated)
    return () => {
      unsubscribe()
      window.removeEventListener('notifications-updated', handleNotificationsUpdated)
    }
  }, [kind])

  useEffect(() => {
    let active = true
    systemApi.getWorkflowSettings()
      .then(settings => {
        if (active) setWorkflowSettings({ ...DEFAULT_WORKFLOW_SETTINGS, ...settings })
      })
      .catch(() => {})
    const handleWorkflowSettingsUpdated = event => {
      setWorkflowSettings(current => ({ ...current, ...event.detail }))
    }
    window.addEventListener('workflow-settings-updated', handleWorkflowSettingsUpdated)
    return () => {
      active = false
      window.removeEventListener('workflow-settings-updated', handleWorkflowSettingsUpdated)
    }
  }, [])

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

  const handleClearNotifications = async (e) => {
    e.stopPropagation()
    await systemApi.clearNotifications(kind)
    setNotifs(prev => prev.filter(n => n.unread))
  }

  const handleNotifClick = (notif) => {
    setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, unread: false } : n))
    setNotifOpen(false)
    if (notif.link) {
      nav(notif.link)
    }
  }

  const unreadCount = notifs.filter(n => n.unread).length

  const resizeSidebar = (width) => {
    if (width < 150) {
      setSidebarCollapsed(true)
      return
    }
    setSidebarCollapsed(false)
    setSidebarWidth(Math.min(360, Math.max(160, width)))
  }

  const startSidebarResize = (event) => {
    event.preventDefault()
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    const handlePointerMove = moveEvent => resizeSidebar(moveEvent.clientX)
    const stopResize = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopResize)
      window.removeEventListener('pointercancel', stopResize)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopResize)
    window.addEventListener('pointercancel', stopResize)
  }

  const handleSidebarResizeKeyDown = (event) => {
    if (event.key === 'Home') {
      event.preventDefault()
      setSidebarCollapsed(true)
      return
    }
    if (event.key === 'End') {
      event.preventDefault()
      resizeSidebar(360)
      return
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      resizeSidebar(sidebarWidth + (event.key === 'ArrowLeft' ? -16 : 16))
    }
  }

  return <div className={`shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`} data-theme={cfg.theme}>
    <aside className={`sidebar ${open ? 'open' : ''}`} style={{ '--sidebar-width': `${sidebarWidth}px` }} aria-label="Primary">
      <div className="brand">
        <NavLink to={`/${kind}/dashboard`} onClick={() => setOpen(false)} aria-label="MediCare AI dashboard"
          style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1, color: 'inherit', textDecoration: 'none' }}>
          <Stethoscope size={30} strokeWidth={2.2} />
          <div><strong>MediCare AI</strong><small>{cfg.brand}</small></div>
        </NavLink>
        <button className="icon-btn only-mobile" aria-label="Close menu" onClick={() => setOpen(false)}><X size={18} /></button></div>
      <nav>{cfg.items.map(([path, label, Icon, badge]) => <NavLink key={path} to={`/${kind}/${path}`} onClick={() => setOpen(false)}
        className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}><Icon size={18} /><span>{label}</span>{badge && <em>{badge}</em>}</NavLink>)}</nav>
      <div className="side-foot">{kind === 'admin' ? (
        <NavLink
          to="/admin/profile"
          className="side-profile-link"
          aria-label="Open admin profile"
          title="Admin profile"
          onClick={() => setOpen(false)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, color: 'inherit', textDecoration: 'none', borderRadius: 6 }}
        >
          <Avatar name={user.name} src={user.profilePicture} />
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</strong>
            <small style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.sub}</small>
          </div>
        </NavLink>
      ) : kind === 'doctor' ? (
        <NavLink
          to="/doctor/profile"
          className="side-profile-link"
          aria-label="Open doctor profile"
          title="Doctor profile"
          onClick={() => setOpen(false)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, color: 'inherit', textDecoration: 'none', borderRadius: 6 }}
        >
          <Avatar name={user.name} src={user.profilePicture} />
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</strong>
            <small style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.sub}</small>
          </div>
        </NavLink>
      ) : (
        <NavLink
          to="/patient/profile"
          className="side-profile-link"
          aria-label="Open patient profile and account"
          title="Profile & Account"
          onClick={() => setOpen(false)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, color: 'inherit', textDecoration: 'none', borderRadius: 6 }}
        >
          <Avatar name={user.name} src={user.profilePicture} />
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</strong>
            <small style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.sub}</small>
          </div>
        </NavLink>
      )}
        <button className="icon-btn light" aria-label="Log out" title="Log out" onClick={() => { logout(); nav('/login') }}><LogOut size={18} /></button></div>
      <div
        className="sidebar-resize"
        role="separator"
        aria-label="Resize sidebar"
        aria-orientation="vertical"
        aria-valuemin={160}
        aria-valuemax={360}
        aria-valuenow={sidebarWidth}
        tabIndex={0}
        onPointerDown={startSidebarResize}
        onKeyDown={handleSidebarResizeKeyDown}
      />
    </aside>
    {open && <div className="scrim" onClick={() => setOpen(false)} />}
    <div className={`main${messagesView ? ' messages-view' : ''}`}>
      <header className="topbar">
        {!open && <button className="icon-btn only-mobile" aria-label="Open menu" onClick={() => setOpen(true)}><Menu size={22} /></button>}
        {sidebarCollapsed && <button className="icon-btn sidebar-reveal" aria-label="Show sidebar" title="Show sidebar" onClick={() => setSidebarCollapsed(false)}><Menu size={22} /></button>}
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
                {notifs.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {unreadCount > 0 && (
                  <button
                    className="link"
                    style={{ fontSize: '0.78rem', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    onClick={handleMarkAllRead}
                  >
                    <CheckCheck size={14} /> Mark all read
                  </button>
                    )}
                    <button
                      className="link"
                      style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      onClick={handleClearNotifications}
                    >
                      <Trash2 size={14} /> Clear read
                    </button>
                  </div>
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

          {kind === 'admin' ? (
            <NavLink
              to="/admin/profile"
              aria-label="Open admin profile"
              title="Admin profile"
              style={{ display: 'inline-flex', borderRadius: '50%', textDecoration: 'none' }}
            >
              <Avatar name={user.name} src={user.profilePicture} />
            </NavLink>
          ) : kind === 'doctor' ? (
            <NavLink
              to="/doctor/profile"
              aria-label="Open doctor profile"
              title="Doctor profile"
              style={{ display: 'inline-flex', borderRadius: '50%', textDecoration: 'none' }}
            >
              <Avatar name={user.name} src={user.profilePicture} />
            </NavLink>
          ) : (
            <NavLink
              to="/patient/account"
              aria-label="Open account profile"
              title="Account profile"
              style={{ display: 'inline-flex', borderRadius: '50%', textDecoration: 'none' }}
            >
              <Avatar name={user.name} src={user.profilePicture} />
            </NavLink>
          )}
        </div>
      </header>
      <main className={`content${messagesView ? ' messages-view' : ''}`} aria-label={`${greeting} ${user.name}`}>
        <WorkflowSettingsContext.Provider value={workflowSettings}>
          <Outlet />
        </WorkflowSettingsContext.Provider>
      </main>
    </div>
    <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} role={kind} />
  </div>
}
export const DoctorLayout = () => <AppLayout kind="doctor" />
export const PatientLayout = () => <AppLayout kind="patient" />
export const AdminLayout = () => <AppLayout kind="admin" />
