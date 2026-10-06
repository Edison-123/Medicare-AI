import { useState, useEffect } from 'react'
import {
  CalendarDays, Plus, MapPin, Clock, User, CheckCircle2,
  XCircle, Calendar, AlertCircle, PhoneCall
} from 'lucide-react'
import { patientApi } from '../../services/api'
import { useAsync } from '../../hooks'
import { useToast } from '../../context/ToastContext'
import {
  Card, PageHeader, StatusBadge, LoadingState, ErrorState,
  Modal, ConfirmationDialog
} from '../../components/common/ui'

const MOCK_DOCTORS = []

const TIME_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM'
]

export default function PatientAppointments() {
  const toast = useToast()
  const { data: appointments, loading, error, reload } = useAsync(patientApi.getAppointments)
  const { data: doctors, loading: doctorsLoading, error: doctorsError, reload: reloadDoctors } = useAsync(patientApi.getDoctors)
  const [activeTab, setActiveTab] = useState('upcoming')

  // Booking modal state
  const [showBookModal, setShowBookModal] = useState(false)
  const [bookingForm, setBookingForm] = useState({
    doctorId: '',
    doctor: '',
    specialty: '',
    hospital: '',
    date: '2026-10-18',
    time: '10:00 AM',
    type: 'In-person OPD',
    room: 'Room 304, Building A',
    reason: 'Routine blood pressure follow-up'
  })
  const [booking, setBooking] = useState(false)

  // Cancel dialog state
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    if (!bookingForm.doctorId && doctors?.length) {
      handleDoctorChange(doctors[0].id)
    }
  }, [doctors])

  const handleDoctorChange = (doctorId) => {
    const d = (doctors || MOCK_DOCTORS).find(x => String(x.id) === String(doctorId))
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
    try {
      await patientApi.bookAppointment({
        ...bookingForm,
        room: 'OPD Consultation Suite'
      })
      toast.success(`Clinic appointment booked with ${bookingForm.doctor} for ${bookingForm.date}`)
      setShowBookModal(false)
      reload()
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

  const filtered = (appointments || []).filter(a => {
    if (activeTab === 'upcoming') return a.status === 'Scheduled'
    if (activeTab === 'past') return a.status === 'Completed' || a.status === 'Cancelled'
    return true
  })

  return (
    <>
      <PageHeader
        title="Doctor Appointments & Clinic Visits"
        subtitle="Manage upcoming clinical visits, schedule hospital consultations with specialists, and view consultation history."
        actions={
          <button className="btn btn-primary" onClick={() => setShowBookModal(true)}>
            <Plus size={15} /> Book New Appointment
          </button>
        }
      />

      <div className="tabs">
        <button className={activeTab === 'upcoming' ? 'on' : ''} onClick={() => setActiveTab('upcoming')}>
          Scheduled ({appointments?.filter(a => a.status === 'Scheduled').length || 0})
        </button>
        <button className={activeTab === 'past' ? 'on' : ''} onClick={() => setActiveTab('past')}>
          Past Visits ({appointments?.filter(a => a.status !== 'Scheduled').length || 0})
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
            <button className="btn btn-primary" onClick={() => setShowBookModal(true)}>
              Schedule an Appointment
            </button>
          </div>
        </Card>
      )}

      <div className="stack">
        {filtered.map(appt => (
          <Card key={appt.id} style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', gap: 14 }}>
                <div className="avatar" style={{ width: 48, height: 48, fontSize: '1.1rem' }}>
                  {appt.doctorAvatar || 'DR'}
                </div>
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
                {appt.status === 'Scheduled' && (
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
      {showBookModal && (
        <Modal
          open={showBookModal}
          title="Schedule Doctor Appointment"
          onClose={() => setShowBookModal(false)}
        >
          <form onSubmit={handleBookSubmit}>
            {doctorsError && <ErrorState message={doctorsError} onRetry={reloadDoctors} />}
            <label className="field" style={{ marginBottom: 12 }}>
              Consulting Physician & Specialty
              <select
                value={bookingForm.doctorId}
                onChange={e => handleDoctorChange(e.target.value)}
                disabled={doctorsLoading || !doctors?.length}
              >
                {(doctors || MOCK_DOCTORS).map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.specialty} ({d.hospital})
                  </option>
                ))}
              </select>
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
                  value={bookingForm.date}
                  onChange={e => setBookingForm({ ...bookingForm, date: e.target.value })}
                />
              </label>
            </div>

            <label className="field" style={{ marginBottom: 12 }}>
              Select Time Slot
              <select
                value={bookingForm.time}
                onChange={e => setBookingForm({ ...bookingForm, time: e.target.value })}
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
