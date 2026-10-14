import { useState } from 'react'
import {
  Pill, Plus, CheckCircle2, Clock, AlertTriangle, Sparkles,
  Flame, Calendar, ShieldCheck, RefreshCw
} from 'lucide-react'
import { patientApi } from '../../services/api'
import { useAsync } from '../../hooks'
import { useToast } from '../../context/ToastContext'
import {
  Card, PageHeader, LoadingState, ErrorState, Modal
} from '../../components/common/ui'

export default function PatientMedicineReminders() {
  const toast = useToast()
  const { data: reminders, loading, error, reload } = useAsync(patientApi.getReminders)
  const [togglingId, setTogglingId] = useState(null)

  // Add reminder modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [reminderForm, setReminderForm] = useState({
    medicineName: '',
    strength: '',
    dosage: '',
    slot: '',
    time: '',
    food: '',
    instructions: '',
    totalPills: 0,
    remainingPills: 0
  })
  const [saving, setSaving] = useState(false)

  const handleToggle = async (id, name) => {
    setTogglingId(id)
    try {
      const res = await patientApi.toggleReminder(id)
      if (res?.taken) {
        toast.success(`Dose confirmed for ${name || 'medication'}! Streak updated.`)
      } else {
        toast.info(`Reminder unchecked for ${name || 'medication'}`)
      }
      reload()
    } finally {
      setTogglingId(null)
    }
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    if (!reminderForm.medicineName.trim()) return
    setSaving(true)
    try {
      await patientApi.addReminder(reminderForm)
      toast.success(`Medication reminder set for ${reminderForm.medicineName}`)
      setShowAddModal(false)
      setReminderForm({
        medicineName: '',
        strength: '',
        dosage: '',
        slot: '',
        time: '',
        food: '',
        instructions: '',
        totalPills: 0,
        remainingPills: 0
      })
      reload()
    } finally {
      setSaving(false)
    }
  }

  // Calculate statistics
  const totalCount = reminders?.length || 0
  const takenCount = reminders?.filter(r => r.taken).length || 0
  const adherenceRate = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 100

  return (
    <>
      <PageHeader
        title="Medicine Reminders & Adherence"
        subtitle="Track your daily medication schedule, log doses, monitor refill levels, and maintain your streak."
        actions={
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={15} /> Add Custom Reminder
          </button>
        }
      />

      {loading && <LoadingState label="Loading medicine reminder schedule…" />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {reminders && (
        <div className="stack">
          {/* Adherence Scorecard */}
          <div className="grid-3">
            <Card style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className="stat-icon" style={{ background: '#e3f8ea', color: '#16a34a' }}>
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{adherenceRate}%</div>
                  <div className="muted small">Today's Dose Adherence</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--green)', marginTop: 2 }}>
                    {takenCount} of {totalCount} medications taken
                  </div>
                </div>
              </div>
            </Card>

            <Card style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className="stat-icon" style={{ background: '#fff0e0', color: '#ea580c' }}>
                  <Flame size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>Not reported</div>
                  <div className="muted small">Consecutive Adherence Streak</div>
                  <div style={{ fontSize: '0.75rem', color: '#ea580c', marginTop: 2 }}>
                    Streak tracking is unavailable
                  </div>
                </div>
              </div>
            </Card>

            <Card style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className="stat-icon" style={{ background: '#efeaff', color: '#7c3aed' }}>
                  <Pill size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{totalCount} Daily</div>
                  <div className="muted small">Prescribed Active Regimens</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: 2 }}>
                    Linked to your active prescriptions
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Pill Schedule Items */}
          <Card title="Today's Pill Tracker">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {reminders.map(rem => {
                const pillsLeft = rem.remainingPills ?? 20
                const isLow = pillsLeft < 10
                const progressPct = Math.round((pillsLeft / (rem.totalPills || 30)) * 100)

                return (
                  <div
                    key={rem.id}
                    className={`pill-card ${rem.taken ? 'is-taken' : ''}`}
                    style={{ padding: 18, border: rem.taken ? '1px solid #86efac' : '1px solid var(--line)' }}
                  >
                    <span className={`pill-time-badge ${rem.slot.toLowerCase()}`} style={{ minWidth: 90, textAlign: 'center' }}>
                      <Clock size={13} style={{ display: 'inline', marginRight: 4 }} />
                      {rem.time}
                      <div style={{ fontSize: '0.7rem' }}>{rem.slot}</div>
                    </span>

                    <div className="grow">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '1.05rem' }}>{rem.medicineName}</strong>
                        <span className="muted">({rem.strength} — {rem.dosage})</span>
                        {isLow && (
                          <span className="badge badge-orange" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <AlertTriangle size={12} /> Low Supply ({pillsLeft} left)
                          </span>
                        )}
                      </div>

                      <div className="muted small" style={{ margin: '4px 0 8px' }}>
                        {rem.food} • {rem.instructions}
                      </div>

                      {/* Pill Inventory Progress */}
                      <div style={{ maxWidth: 260 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 2 }}>
                          <span>Supply Remaining</span>
                          <strong>{pillsLeft} / {rem.totalPills || 30} pills</strong>
                        </div>
                        <div className="progress-bar-wrap">
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${progressPct}%`,
                              background: isLow ? '#f59e0b' : 'var(--primary)'
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <button
                        className={`btn ${rem.taken ? 'btn-primary' : ''}`}
                        onClick={() => handleToggle(rem.id)}
                        disabled={togglingId === rem.id}
                        style={{ minWidth: 150 }}
                      >
                        <CheckCircle2 size={16} />
                        {rem.taken ? 'Dose Taken ✓' : 'Mark as Taken'}
                      </button>
                      {rem.taken && rem.takenAt && (
                        <span className="muted small">Logged at {rem.takenAt}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Add Reminder Modal */}
      {showAddModal && (
        <Modal
          open={showAddModal}
          title="Add Medication Reminder"
          onClose={() => setShowAddModal(false)}
        >
          <form onSubmit={handleAddSubmit}>
            <div className="grid-2" style={{ marginBottom: 12 }}>
              <label className="field">
                Medicine Name
                <input
                  type="text"
                  required
                  placeholder="Enter medicine name"
                  value={reminderForm.medicineName}
                  onChange={e => setReminderForm({ ...reminderForm, medicineName: e.target.value })}
                />
              </label>

              <label className="field">
                Strength / Unit
                <input
                  type="text"
                  placeholder="e.g., 5 mg, 500 mg"
                  value={reminderForm.strength}
                  onChange={e => setReminderForm({ ...reminderForm, strength: e.target.value })}
                />
              </label>
            </div>

            <div className="grid-2" style={{ marginBottom: 12 }}>
              <label className="field">
                Dose Amount
                <input
                  type="text"
                  placeholder="e.g., 1 tablet, 2 puffs"
                  value={reminderForm.dosage}
                  onChange={e => setReminderForm({ ...reminderForm, dosage: e.target.value })}
                />
              </label>

              <label className="field">
                Time of Day
                <select
                  value={reminderForm.slot}
                  required
                  onChange={e => setReminderForm({ ...reminderForm, slot: e.target.value })}
                >
                  <option value="">Select time of day</option>
                  <option value="Morning">Morning (Breakfast)</option>
                  <option value="Afternoon">Afternoon (Lunch)</option>
                  <option value="Evening">Evening (Dinner)</option>
                  <option value="Bedtime">Bedtime (Night)</option>
                </select>
              </label>
            </div>

            <div className="grid-2" style={{ marginBottom: 12 }}>
              <label className="field">
                Alarm Time
                <input
                  type="text"
                  placeholder="08:00 AM"
                  value={reminderForm.time}
                  onChange={e => setReminderForm({ ...reminderForm, time: e.target.value })}
                />
              </label>

              <label className="field">
                Food Instructions
                <select
                  value={reminderForm.food}
                  required
                  onChange={e => setReminderForm({ ...reminderForm, food: e.target.value })}
                >
                  <option value="">Select food timing</option>
                  <option value="After breakfast">After breakfast</option>
                  <option value="Before meals">Before meals</option>
                  <option value="With food">With food</option>
                  <option value="Any time">Any time</option>
                </select>
              </label>
            </div>

            <label className="field" style={{ marginBottom: 16 }}>
              Special Notes / Instructions
              <input
                type="text"
                placeholder="e.g., Take with a full glass of water, do not chew"
                value={reminderForm.instructions}
                onChange={e => setReminderForm({ ...reminderForm, instructions: e.target.value })}
              />
            </label>

            <div className="row end">
              <button type="button" className="btn" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save Reminder'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
