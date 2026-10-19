import { useContext, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CalendarDays, Plus, MapPin, Clock, User, CheckCircle2,
  XCircle, Calendar, AlertCircle, PhoneCall
} from 'lucide-react'
import { patientApi } from '../../services/api'
import { useAsync } from '../../hooks'
import { useToast } from '../../context/ToastContext'
import { WorkflowSettingsContext } from '../../context/WorkflowSettingsContext'
import {
  Card, PageHeader, StatusBadge, LoadingState, ErrorState,
  Modal, ConfirmationDialog, Avatar
} from '../../components/common/ui'

const TIME_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM'
]

const isUpcomingAppointment = appointment => {
  const status = (appointment.status || '').toLowerCase()
  return (appointment.date || '') >= new Date().toISOString().slice(0, 10)
    && status !== 'completed'
    && status !== 'cancelled'
}

const appointmentSortKey = appointment => {
  const match = (appointment.time || '').match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return `${appointment.date || ''}T99:99`
  const hour = Number(match[1]) % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0)
  return `${appointment.date || ''}T${String(hour).padStart(2, '0')}:${match[2]}`
}

export default function PatientAppointments() {
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()
  const workflowSettings = useContext(WorkflowSettingsContext)
  const canBookAppointments = workflowSettings.patientAppointmentBookingEnabled !== false
  const { data: appointments, loading, error, reload } = useAsync(patientApi.getAppointments)
  const { data: doctors, loading: doctorsLoading, error: doctorsError, reload: reloadDoctors } = useAsync(patientApi.getDoctors)
  const hospitalOptions = [...new Set((doctors || []).map(doctor => doctor.hospital?.trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  const [activeTab, setActiveTab] = useState('upcoming')

  // Booking modal state
  const [showBookModal, setShowBookModal] = useState(false)
  useEffect(() => {
    if (searchParams.get('book') !== '1' || !canBookAppointments) return
    setShowBookModal(true)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('book')
    setSearchParams(nextParams, { replace: true })
  }, [canBookAppointments, searchParams, setSearchParams])
  const [bookingForm, setBookingForm] = useState({
    doctorId: '',
    doctor: '',
    specialty: '',
    hospital: '',
    date: '',
    time: '',
    type: 'In-person OPD',
    room: '',
    reason: ''
  })
  const doctorsForHospital = (doctors || []).filter(doctor =>
    doctor.hospital?.trim().toLowerCase() === bookingForm.hospital.trim().toLowerCase()
  )
  const [booking, setBooking] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const today = new Date()
  const minAppointmentDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  // Cancel dialog state
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelling, setCancelling] = useState(false)

  const handleDoctorChange = (doctorId) => {
    const d = doctorsForHospital.find(x => String(x.id) === String(doctorId))
    if (d) {
      setBookingForm(prev => ({
        ...prev,
        doctorId: d.id,
        doctor: d.name,
        specialty: d.specialty,
        hospital: d.hospital
      }))
    }
  }

  const handleBookSubmit = async (e) => {
    e.preventDefault()
    setBooking(true)
    setBookingError('')
    try {
      await patientApi.bookAppointment({
        ...bookingForm,
        room: 'OPD Consultation Suite'
      })
      toast.success(`Clinic appointment booked with ${bookingForm.doctor} for ${bookingForm.date}`)
      setShowBookModal(false)
      reload()
    } catch (error) {
      setBookingError(error.message || 'We could not book this appointment. Please check the date and time.')
    } finally {
      setBooking(false)
    }
  }

  const handleCancelAppointment = async () => {
    if (!cancelTarget) return
    setCancelling(true)
    try {
      await patientApi.cancelAppointment(cancelTarget.id)
      toast.warn('Appointment cancelled')
      setCancelTarget(null)
      reload()
    } finally {
      setCancelling(false)
    }
  }

  const filteredAppointments = (appointments || []).filter(a => {
    if (activeTab === 'upcoming') return isUpcomingAppointment(a)
    if (activeTab === 'past') return !isUpcomingAppointment(a)
    return true
  })
  const filtered = [...filteredAppointments].sort((a, b) => {
    const comparison = appointmentSortKey(a).localeCompare(appointmentSortKey(b))
    return activeTab === 'upcoming' ? comparison : -comparison
  })

  return (
    <>
      <PageHeader
        title="Doctor Appointments & Clinic Visits"
        subtitle="Manage upcoming clinical visits, schedule hospital consultations with specialists, and view consultation history."
        actions={canBookAppointments && (
          <button className="btn btn-primary" onClick={() => setShowBookModal(true)}>
            <Plus size={15} /> Book New Appointment
          </button>
        )}
      />

      {!canBookAppointments && <div className="alert" role="status">Appointment booking is temporarily unavailable. Your existing appointments are still available below.</div>}

      <div className="tabs">
        <button className={activeTab === 'upcoming' ? 'on' : ''} onClick={() => setActiveTab('upcoming')}>
          Upcoming ({appointments?.filter(isUpcomingAppointment).length || 0})
        </button>
        <button className={activeTab === 'past' ? 'on' : ''} onClick={() => setActiveTab('past')}>
          Past Visits ({appointments?.filter(a => !isUpcomingAppointment(a)).length || 0})
        </button>
        <button className={activeTab === 'all' ? 'on' : ''} onClick={() => setActiveTab('all')}>
          All Records ({appointments?.length || 0})
        </button>
      </div>

      {loading && <LoadingState label="Loading your appointments…" />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {!loading && filtered.length === 0 && (
        <Card>
          <div className="state">
            <CalendarDays size={32} />
            <strong>No appointments found</strong>
            <p className="muted small">You don't have any appointments in this view.</p>
            {canBookAppointments && <button className="btn btn-primary" onClick={() => setShowBookModal(true)}>
              Schedule an Appointment
            </button>}
          </div>
        </Card>
      )}

      <div className="stack">
        {filtered.map(appt => (
          <Card key={appt.id} style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', gap: 14 }}>
                <Avatar name={appt.doctor} size={48} src={appt.doctorProfilePicture} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <strong style={{ fontSize: '1.1rem' }}>{appt.doctor}</strong>
                    <StatusBadge status={appt.status} />
                  </div>
                  <div className="muted small">{appt.specialty} • {appt.hospital}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text)', marginTop: 4 }}>
                    Reason: <strong>{appt.reason}</strong>
                  </div>
                </div>
              </div>

              <div className="row">
                {appt.status === 'Scheduled' && appt.source !== 'consultation' && (
                  <>
                    <button
                      className="btn btn-sm"
                      onClick={() => alert(`Directions: ${appt.hospital}, ${appt.room}`)}
                    >
                      <MapPin size={14} /> Clinic Directions
                    </button>
                    <button
                      className="btn btn-sm btn-danger-o"
                      onClick={() => setCancelTarget(appt)}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Time & Room Info Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, background: '#f8fafc', padding: '10px 14px', borderRadius: 8, fontSize: '0.85rem', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--primary)', fontWeight: 600 }}>
                  <Calendar size={15} /> {appt.date}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={15} /> {appt.time}
                </span>
                <span className="tag" style={{ background: '#eef2ff' }}>
                  {appt.type}
                </span>
              </div>
              <div className="muted small">
                Location: <strong>{appt.room}</strong>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Book New Appointment Modal */}
      {showBookModal && canBookAppointments && (
        <Modal
          open={showBookModal}
          title="Schedule Doctor Appointment"
          onClose={() => setShowBookModal(false)}
        >
          <form onSubmit={handleBookSubmit}>
            {bookingError && <div className="alert err" role="alert">{bookingError}</div>}
            {doctorsError && <ErrorState message={doctorsError} onRetry={reloadDoctors} />}
            <label className="field" style={{ marginBottom: 12 }}>
              Hospital
              <select
                value={bookingForm.hospital}
                onChange={e => setBookingForm(prev => ({
                  ...prev,
                  hospital: e.target.value,
                  doctorId: '',
                  doctor: '',
                  specialty: ''
                }))}
                disabled={doctorsLoading || hospitalOptions.length === 0}
                required
              >
                <option value="">Select hospital</option>
                {hospitalOptions.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
              {!doctorsLoading && hospitalOptions.length === 0 && <span className="muted small">No hospitals with active doctors are currently available.</span>}
            </label>
            <label className="field" style={{ marginBottom: 12 }}>
              Consulting Physician & Specialty
              <select
                value={bookingForm.doctorId}
                onChange={e => handleDoctorChange(e.target.value)}
                disabled={doctorsLoading || !bookingForm.hospital || doctorsForHospital.length === 0}
                required
              >
                <option value="">{bookingForm.hospital ? 'Select doctor' : 'Select hospital first'}</option>
                {doctorsForHospital.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.specialty}
                  </option>
                ))}
              </select>
              {!doctorsLoading && bookingForm.hospital && doctorsForHospital.length === 0 && <span className="muted small">No active doctors are available at this hospital.</span>}
            </label>

            <div className="grid-2" style={{ marginBottom: 12 }}>
              <label className="field">
                Consultation Type
                <select
                  value={bookingForm.type}
                  onChange={e => setBookingForm({ ...bookingForm, type: e.target.value })}
                >
                  <option value="In-person OPD">Hospital Outpatient (OPD)</option>
                  <option value="Follow-up Review">Follow-up Clinic Review</option>
                  <option value="Specialist Consultation">Specialist Consultation</option>
                </select>
              </label>

              <label className="field">
                Preferred Date
                <input
                  type="date"
                  required
                  min={minAppointmentDate}
                  value={bookingForm.date}
                  onChange={e => {
                    setBookingError('')
                    setBookingForm({ ...bookingForm, date: e.target.value })
                  }}
                />
              </label>
            </div>

            <label className="field" style={{ marginBottom: 12 }}>
              Select Time Slot
              <select
                value={bookingForm.time}
                onChange={e => {
                  setBookingError('')
                  setBookingForm({ ...bookingForm, time: e.target.value })
                }}
              >
                {TIME_SLOTS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>

            <label className="field" style={{ marginBottom: 16 }}>
              Primary Reason for Consultation / Symptoms
              <textarea
                rows={3}
                required
                placeholder="Describe your symptoms or reason for scheduling..."
                value={bookingForm.reason}
                onChange={e => setBookingForm({ ...bookingForm, reason: e.target.value })}
              />
            </label>

            <div className="row end">
              <button type="button" className="btn" onClick={() => setShowBookModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={booking || doctorsLoading || !bookingForm.doctorId}>
                {booking ? 'Confirming…' : 'Confirm Appointment'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirmation Dialog for Cancellation */}
      {cancelTarget && (
        <ConfirmationDialog
          open={Boolean(cancelTarget)}
          title="Cancel Scheduled Appointment"
          message={`Are you sure you want to cancel your appointment with ${cancelTarget.doctor} on ${cancelTarget.date} at ${cancelTarget.time}?`}
          confirmLabel={cancelling ? 'Cancelling…' : 'Yes, Cancel Appointment'}
          onConfirm={handleCancelAppointment}
          onClose={() => setCancelTarget(null)}
        />
      )}
    </>
  )
}
