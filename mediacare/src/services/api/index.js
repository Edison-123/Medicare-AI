// Contract (Spring Boot):  POST /api/auth/login · GET /api/doctors/me/dashboard

// GET /api/patients?q=&status=&sort=&dir=&page=&size= · GET /api/patients/{id}

import * as mock from '../../mockData'

import { USE_MOCK, delay, http } from './client'

import { getToken } from '../auth/session'



export const authApi = {

  login: (email, password) => USE_MOCK

    ? new Promise((res, rej) => setTimeout(() => {

        const u = mock.users[email.toLowerCase()]

        u && password ? res({ user:u, token: fakeJwt(u) }) : rej(new Error('Invalid email or password'))

      }, 500))

    : http('/auth/login', { method:'POST', body:{ email, password } }),

}

export const doctorApi = {

  dashboard: () => USE_MOCK ? delay(mock.doctorDashboard) : http('/doctors/me/dashboard', { token:getToken() }),

  getPendingRefills: async () => {

    if (!USE_MOCK) return http('/doctors/me/refills', { token: getToken() })

    return delay(mock.pendingRefillRequests.filter(r => r.status === 'Pending'), 150)

  },

  respondRefill: async (refillId, action, reason = '') => {

    if (!USE_MOCK) return http(`/doctors/me/refills/${refillId}`, { method: 'POST', body: { action: action === 'visit_required' ? 'visit' : action, reason }, token: getToken() })

    const req = mock.pendingRefillRequests.find(r => r.id === Number(refillId))

    if (req) {

      req.status = action === 'approve' ? 'Approved' : 'Visit Required'

      if (action === 'approve') {

        const rx = mock.patientPrescriptions.find(p => p.id === req.prescriptionId)

        if (rx) rx.refillsLeft += 1

        mock.notificationsData.patient.unshift({

          id: `np-${Date.now()}`,

          title: 'Refill Request Approved',

          message: `Dr. John Smith approved your ${req.medicine} refill.`,

          time: 'Just now',

          unread: true,

          link: '/patient/prescriptions'

        })

      } else {

        mock.notificationsData.patient.unshift({

          id: `np-${Date.now()}`,

          title: 'Clinic Visit Needed for Refill',

          message: `Dr. Smith requested an in-person blood pressure evaluation before renewing ${req.medicine}.`,

          time: 'Just now',

          unread: true,

          link: '/patient/appointments'

        })

      }

    }

    return delay({ ok: true, status: req?.status }, 200)

  }

}

export const patientsApi = {

  list: async ({ q = '', status = 'All', sort = 'name', dir = 'asc', page = 1, size = 5 } = {}) => {

    if (!USE_MOCK) return http(`/patients?${new URLSearchParams({ q, status, sort, dir, page, size })}`, { token:getToken() })

    const rows = mock.patients.filter(p => (status === 'All' || p.status === status) &&

      p.name.toLowerCase().includes(q.toLowerCase()))

    rows.sort((a, b) => String(a[sort] ?? '').localeCompare(String(b[sort] ?? ''), undefined, { numeric:true }) * (dir === 'asc' ? 1 : -1))

    return delay({ total: rows.length, items: rows.slice((page - 1) * size, page * size) })

  },

  get: id => USE_MOCK

    ? delay(mock.patients.find(p => p.id === Number(id)) ?? null).then(p => {

        if (!p) throw new Error('Patient not found')

        const tc = mock.consultations.find(c =>

          c.patientId === p.id &&

          c.date === '2026-10-02' &&

          ['Scheduled', 'In Progress'].includes(c.status)

        )

        return {

          ...p,

          timeline: mock.patientTimeline,

          todayConsultationId: tc?.id ?? null

        }

      })

    : http(`/patients/${id}`, { token:getToken() }),

}

function fakeJwt(u) {

  // mock only: real tokens come from the backend

  return `mock.${btoa(JSON.stringify({

    sub:u.id,

    role:u.role,

    exp: Math.floor(Date.now()/1000) + 3600

  }))}.sig`

}



// GET /api/consultations?q=&tab=&page=&size= · GET/PUT /api/consultations/{id} · POST /api/consultations/{id}/complete

// GET/PUT /api/consultations/{id}/ai  (stores transcript + AI draft + review state)

export const consultationsApi = {

  list: async ({ q = '', tab = 'today', page = 1, size = 6 } = {}) => {

    if (!USE_MOCK) return http(`/consultations?${new URLSearchParams({ q, tab, page, size })}`, { token:getToken() })

    const today = '2026-10-02'

    const inTab = c =>

      tab === 'today'

        ? c.date === today

        : tab === 'upcoming'

          ? c.date > today && c.status === 'Scheduled'

          : c.status === 'Completed' || c.status === 'Cancelled'

    const rows = mock.consultations.filter(c =>

      inTab(c) && c.patient.toLowerCase().includes(q.toLowerCase())

    )

    return delay({

      total: rows.length,

      items: rows.slice((page - 1) * size, page * size)

    })

  },

  get: async id => {

    if (!USE_MOCK) return http(`/consultations/${id}`, { token:getToken() })

    const c = mock.consultations.find(x => x.id === Number(id))

    if (!c) throw new Error('Consultation not found')

    const p = mock.patients.find(x => x.id === c.patientId)

    return delay({

      ...c,

      patientInfo:p,

      ai: mock.aiJobs[c.id] ?? null

    })

  },

  start: async id => {

    // Scheduled -> In Progress

    if (!USE_MOCK) return http(`/consultations/${id}/start`, { method:'POST', token:getToken() })

    const c = mock.consultations.find(x => x.id === Number(id))

    if (c?.status === 'Scheduled') c.status = 'In Progress'

    return delay({ ok:true }, 100)

  },

  save: async (id, { form, ai, status }) => {

    if (!USE_MOCK) return http(`/consultations/${id}`, {

      method:'PUT',

      body:{ form, ai, status },

      token:getToken()

    })

    const c = mock.consultations.find(x => x.id === Number(id))

    if (c.status === 'Completed') throw new Error('Completed consultations cannot be edited')

    if (

      status === 'Completed' &&

      ai?.draft &&

      ai.draft.review !== 'Reviewed'

    ) {

      throw new Error('Review the AI draft before completing this consultation')

    }

    c.form = form

    if (status) c.status = status

    mock.aiJobs[c.id] = ai

    return delay({ ok:true })

  },

}



// GET /api/prescriptions?q=&status=&from=&to=&page=&size= · GET /api/prescriptions/{id}

// POST /api/prescriptions · PUT /api/prescriptions/{id} · POST /api/prescriptions/{id}/{approve|finalize|cancel}

// The server must enforce: finalized = immutable; finalize only from Reviewed; only the owning doctor may change status; audit every transition.

export const FREQUENCIES = [

  'Once daily',

  'Twice daily',

  'Three times daily',

  'Four times daily',

  'At bedtime',

  'As needed'

]

export const ROUTES = [

  'Oral',

  'Inhaled',

  'Topical',

  'Injection',

  'Eye/Ear drops',

  'Other'

]

export const FOOD = [

  'Before food',

  'After food',

  'With food',

  'Any'

]

const validItems = r =>

  r.items.length > 0 &&

  r.items.every(i =>

    i.name.trim() &&

    i.dosage.trim() &&

    i.frequency &&

    i.duration.trim()

  )

export const prescriptionsApi = {

  list: async ({ q = '', status = 'All', from = '', to = '', page = 1, size = 6 } = {}) => {

    if (!USE_MOCK) return http(

      `/prescriptions?${new URLSearchParams({ q, status, from, to, page, size })}`,

      { token:getToken() }

    )

    const rows = mock.prescriptions

      .filter(r =>

        (status === 'All' || r.status === status) &&

        (!from || r.date >= from) &&

        (!to || r.date <= to) &&

        (r.patient + r.code).toLowerCase().includes(q.toLowerCase())

      )

      .sort((a, b) =>

        b.date.localeCompare(a.date) || b.id - a.id

      )

    return delay({

      total: rows.length,

      items: rows.slice((page - 1) * size, page * size)

    })

  },

  get: async id => {

    if (!USE_MOCK) return http(`/prescriptions/${id}`, { token:getToken() })

    const r = mock.prescriptions.find(x => x.id === Number(id))

    if (!r) throw new Error('Prescription not found')

    return delay(r)

  },

  save: async (id, rx) => {

    if (!USE_MOCK) {

      return http(

        id ? `/prescriptions/${id}` : '/prescriptions',

        {

          method: id ? 'PUT' : 'POST',

          body:rx,

          token:getToken()

        }

      )

    }

    const patient = mock.patients.find(

      p => p.id === Number(rx.patientId)

    )

    if (!patient) throw new Error('Choose a patient')

    let r = id && mock.prescriptions.find(

      x => x.id === Number(id)

    )

    if (r && ['Finalized', 'Cancelled'].includes(r.status)) {

      throw new Error('Finalized or cancelled prescriptions cannot be edited')

    }

    if (!r) {

      const n = mock.prescriptions.length + 1

      r = {

        id:n,

        code:`RX-${1000 + n}`,

        doctor:'Dr. John Smith',

        date:'2026-10-02'

      }

      mock.prescriptions.push(r)

    }

    Object.assign(r, {

      patientId:patient.id,

      patient:patient.name,

      diagnosis:rx.diagnosis,

      items:rx.items,

      notes:rx.notes,

      followUp:rx.followUp,

      aiAssisted:rx.aiAssisted,

      status:'Draft'

    })

    // Any edit returns the prescription to Draft so it must be approved again.

    return delay(r, 250)

  },

  transition: async (id, action) => {

    if (!USE_MOCK) {

      return http(`/prescriptions/${id}/${action}`, {

        method:'POST',

        token:getToken()

      })

    }

    const r = mock.prescriptions.find(

      x => x.id === Number(id)

    )

    if (r.status === 'Finalized' || r.status === 'Cancelled') {

      throw new Error(

        `This prescription is already ${r.status.toLowerCase()}`

      )

    }

    if (action === 'approve') {

      if (!r.diagnosis.trim() || !validItems(r)) {

        throw new Error(

          'Add a diagnosis and complete every medicine row first'

        )

      }

      r.status = 'Reviewed'

    }

    else if (action === 'finalize') {

      if (r.status !== 'Reviewed') {

        throw new Error(

          'Approve the prescription before finalizing'

        )

      }

      r.status = 'Finalized'

    }

    else if (action === 'cancel') {

      r.status = 'Cancelled'

    }

    return delay(r, 250)

  },

}



export const aiToolsApi = {

  getDrugList: async () => {

    if (!USE_MOCK) return http('/drugs', { token: getToken() })

    return delay(mock.drugDatabase, 100)

  },

  checkInteractions: async (selectedDrugs) => {

    if (!USE_MOCK) {

      return http('/ai/interactions', {

        method: 'POST',

        body: { drugs: selectedDrugs },

        token: getToken()

      })

    }

    const list = selectedDrugs.map(d => d.trim().toLowerCase())

    const results = mock.knownInteractions.filter(i => {

      const matchA = list.some(d =>

        d.includes(i.drugs[0].toLowerCase())

      )

      const matchB = list.some(d =>

        d.includes(i.drugs[1].toLowerCase())

      )

      return matchA && matchB

    })

    return delay({

      interactions: results,

      checkedCount: selectedDrugs.length

    }, 400)

  },

  summarizeClinicalText: async (text, style = 'soap') => {

    if (!USE_MOCK) {

      return http('/ai/summarize-notes', {

        method: 'POST',

        body: { text, style },

        token: getToken()

      })

    }

    return delay({

      style,

      summary: style === 'soap'

        ? `Subjective: Patient reports chronic symptom onset with gradual progression.
Objective: Physical examination unremarkable; vitals stable.
Assessment: Suspected clinical exacerbation under standard baseline.
Plan: Adjust pharmacotherapy, patient education, scheduled 2-week review.`

        : `Discharge Instructions:
1. Adhere strictly to the updated prescription regimen.
2. Hydrate well (2-3 L/day) and monitor symptom frequency.
3. Return immediately to the emergency department if breathlessness or high fever develops.
4. Scheduled clinic follow-up in 14 days.`,

      readabilityScore: 'Grade 8 (Patient-friendly)',

      timestamp: new Date().toLocaleTimeString()

    }, 700)

  },

  queryAssistant: async (query) => {

    if (!USE_MOCK) {

      return http('/ai/clinical-query', {

        method: 'POST',

        body: { query },

        token: getToken()

      })

    }

    const q = query.toLowerCase()

    let answer =

      'According to clinical guidelines, evaluate patient baseline, review renal/hepatic clearance, and consider first-line monotherapy before polypharmacy.'

    if (q.includes('asthma') || q.includes('inhaler')) {

      answer =

        'GINA 2024 Guidelines: Low-dose ICS-formoterol is the preferred reliever across all asthma severities. SABA-only treatment is no longer recommended due to increased exacerbation risk.'

    }

    else if (q.includes('hypertension') || q.includes('bp')) {

      answer =

        'AHA/ACC Guidelines: First-line agents include thiazide diuretics, CCBs (e.g. Amlodipine), and ACE inhibitors / ARBs. Target BP < 130/80 mmHg in most adult populations.'

    }

    else if (q.includes('diabetes') || q.includes('metformin')) {

      answer =

        'ADA Standards of Care: Metformin remains first-line pharmacotherapy for type 2 diabetes with lifestyle modifications. Monitor eGFR; contraindicated if eGFR < 30 mL/min/1.73m².'

    }

    return delay({

      query,

      answer,

      source: 'MediCare Clinical AI Knowledge Base (Mock)',

      timestamp: new Date().toLocaleTimeString()

    }, 600)

  }

}



export const reportsApi = {

  getReports: async (timeframe = '30d') => {

    if (!USE_MOCK) {

      return http(

        `/doctors/me/reports?timeframe=${timeframe}`,

        { token:getToken() }

      )

    }

    return delay(mock.reportsData, 300)

  }

}



export const messagesApi = {

  listThreads: async () => {

    if (!USE_MOCK) {

      return http('/messages/threads', { token:getToken() })

    }

    return delay(mock.messagesThreads, 200)

  },

  sendMessage: async (patientId, text) => {

    if (!USE_MOCK) {

      return http(`/messages/${patientId}`, {

        method: 'POST',

        body: { text },

        token: getToken()

      })

    }

    const thread = mock.messagesThreads.find(

      t => t.patientId === Number(patientId)

    )

    const newMsg = {

      id: Date.now(),

      sender: 'doctor',

      text,

      time: 'Just now'

    }

    if (thread) {

      thread.messages.push(newMsg)

      thread.lastActivity = 'Just now'

    }

    return delay(newMsg, 200)

  },

  markAsRead: async (patientId) => {

    if (!USE_MOCK) {

      return http(`/messages/${patientId}/read`, {

        method: 'POST',

        token: getToken()

      })

    }

    const thread = mock.messagesThreads.find(

      t => t.patientId === Number(patientId)

    )

    if (thread) thread.unreadCount = 0

    return delay({ ok: true }, 100)

  }

}



export const settingsApi = {

  getSettings: async () => {

    if (!USE_MOCK) {

      return http('/doctors/me/settings', { token: getToken() })

    }

    return delay(mock.doctorSettings, 200)

  },

  updateSettings: async (settings) => {

    if (!USE_MOCK) {

      return http('/doctors/me/settings', {

        method: 'PUT',

        body: settings,

        token: getToken()

      })

    }

    Object.assign(mock.doctorSettings, settings)

    return delay(mock.doctorSettings, 350)

  }

}



// ----------------------------------------------------

// PATIENT API SERVICE

// ----------------------------------------------------

export const patientApi = {

  getDoctors: async () => {

    if (!USE_MOCK) {
      return http('/patient/doctors', { token: getToken() })
    }

    return delay([
      { id: 1, name: 'Dr. John Smith', specialty: 'Internal Medicine & Pulmonology', hospital: 'MediCare Central Hospital', rating: 4.9 },
      { id: 2, name: 'Dr. Emily Chen', specialty: 'Dermatology', hospital: 'MediCare Central Hospital', rating: 4.8 }
    ], 150)

  },

  getDashboard: async () => {

    if (!USE_MOCK) {

      return http('/patient/dashboard', { token: getToken() })

    }

    return delay({

      profile: mock.patientProfile,

      vitals: mock.patientVitals,

      vitalsLastUpdated: mock.patientVitalsLastUpdated || '2026-09-28',

      vitalsHistory: mock.vitalsHistory,

      appointments: mock.patientAppointments,

      reminders: mock.medicineReminders,

      activePrescriptions: mock.patientPrescriptions.filter(

        p => p.status === 'Finalized'

      ),

      recentVisit: mock.visitSummaries[0]

    }, 200)

  },

  getPrescriptions: async ({ status = 'All', q = '' } = {}) => {

    if (!USE_MOCK) {

      return http(

        `/patient/prescriptions?status=${status}&q=${q}`,

        { token: getToken() }

      )

    }

    let rows = [...mock.patientPrescriptions]

    if (status !== 'All') {

      rows = rows.filter(r => r.status === status)

    }

    if (q) {

      rows = rows.filter(r =>

        (r.code + r.doctor + r.diagnosis)

          .toLowerCase()

          .includes(q.toLowerCase())

      )

    }

    return delay(rows, 200)

  },

  requestRefill: async (prescriptionId, notes = '') => {

    if (!USE_MOCK) {

      return http(`/patient/prescriptions/${prescriptionId}/refill`, {

        method: 'POST',

        body: { notes },

        token: getToken()

      })

    }

    const rx = mock.patientPrescriptions.find(

      p => p.id === Number(prescriptionId)

    )

    const newReq = {

      id: Date.now(),

      prescriptionId: Number(prescriptionId),

      prescriptionCode: rx?.code || 'RX-1001',

      patientId: 101,

      patientName: 'John Doe',

      medicine: rx?.items[0]?.name

        ? `${rx.items[0].name} ${rx.items[0].strength}`

        : 'Medication Refill',

      dosage: rx?.items[0]?.dosage || '1 tablet daily',

      lastVitals: 'BP 128/82 on Sep 28',

      requestedDate: new Date().toISOString().split('T')[0],

      status: 'Pending',

      notes: notes || 'Supply running low; requesting 30-day renewal.'

    }

    mock.pendingRefillRequests.unshift(newReq)

    mock.notificationsData.doctor.unshift({

      id: `nd-${Date.now()}`,

      title: 'New Refill Request: John Doe',

      message: `Refill requested for ${newReq.medicine}.`,

      time: 'Just now',

      unread: true,

      link: '/doctor/dashboard'

    })

    return delay({

      ok: true,

      message: 'Refill request submitted directly to Dr. John Smith.'

    }, 300)

  },

  // ----------------------------------------------------
  // VITALS
  // ----------------------------------------------------

  logVital: async ({

    bpSys,

    bpDia,

    hr,

    spo2,

    glucose,

    weightKg

  }) => {

    // REAL API MODE
    // All vital values are sent to the Spring Boot backend.
    // The backend is responsible for persisting them to MySQL.

    if (!USE_MOCK) {

      return http('/patient/vitals/log', {

        method: 'POST',

        body: {

          bpSys,

          bpDia,

          hr,

          spo2,

          glucose,

          weightKg

        },

        token: getToken()

      })

    }

    // --------------------------------------------------
    // MOCK MODE ONLY
    // --------------------------------------------------

    // Blood pressure
    if (bpSys && bpDia) {

      const bp = mock.patientVitals.find(

        v => v.key === 'bp'

      )

      if (bp) {

        bp.value = `${bpSys}/${bpDia}`

        bp.lastUpdated = 'Today (Home log)'

        bp.status =

          (Number(bpSys) >= 140 || Number(bpDia) >= 90)

            ? 'Stage 2 Elevated'

            : (Number(bpSys) >= 130 || Number(bpDia) >= 80)

              ? 'Stage 1'

              : 'Optimal'

        bp.tone =

          (Number(bpSys) >= 140 || Number(bpDia) >= 90)

            ? 'orange'

            : 'green'

      }

    }

    // Glucose
    if (glucose) {

      const g = mock.patientVitals.find(

        v => v.key === 'glucose'

      )

      if (g) {

        g.value = `${glucose}`

        g.lastUpdated = 'Today (Home log)'

        g.status = Number(glucose) > 130

          ? 'Elevated'

          : 'Normal'

        g.tone = Number(glucose) > 130

          ? 'orange'

          : 'purple'

      }

    }

    // Heart rate
    if (hr) {

      const h = mock.patientVitals.find(

        v => v.key === 'hr'

      )

      if (h) {

        h.value = `${hr}`

        h.lastUpdated = 'Today (Home log)'

        h.status =

          (Number(hr) <= 40 || Number(hr) >= 150)

            ? 'Critical'

            : 'Normal'

        h.tone =

          (Number(hr) <= 40 || Number(hr) >= 150)

            ? 'red'

            : 'green'

      }

    }

    // SpO2
    if (spo2) {

      const oxygen = mock.patientVitals.find(

        v => v.key === 'spo2' || v.key === 'oxygen'

      )

      if (oxygen) {

        oxygen.value = `${spo2}`

        oxygen.lastUpdated = 'Today (Home log)'

        oxygen.status = Number(spo2) < 92

          ? 'Low'

          : 'Normal'

        oxygen.tone = Number(spo2) < 92

          ? 'red'

          : 'blue'

      }

    }

    // Weight
    if (weightKg) {

      const weight = mock.patientVitals.find(

        v => v.key === 'weight'

      )

      if (weight) {

        weight.value = `${weightKg}`

        weight.lastUpdated = 'Today (Home log)'

      }

    }

    // --------------------------------------------------
    // CRITICAL VITAL CHECK
    // --------------------------------------------------

    const isCritical =

      (bpSys && (

        Number(bpSys) >= 180 ||

        Number(bpDia) >= 110

      )) ||

      (hr && (

        Number(hr) <= 40 ||

        Number(hr) >= 150

      )) ||

      (spo2 && Number(spo2) < 92) ||

      (glucose && Number(glucose) >= 250)

    if (isCritical) {

      mock.notificationsData.doctor.unshift({

        id: `nd-${Date.now()}`,

        title: 'Critical Vital Flagged: John Doe',

        message:

          `High vital logged by patient: ` +

          `BP ${bpSys || 'N/A'}/${bpDia || 'N/A'}, ` +

          `HR ${hr || 'N/A'}, ` +

          `SpO2 ${spo2 || 'N/A'}%, ` +

          `Glucose ${glucose || 'N/A'}. ` +

          `Clinical review recommended.`,

        time: 'Just now',

        unread: true,

        link: '/doctor/patients/101'

      })

    }

    return delay({

      ok: true,

      isCritical,

      message: isCritical

        ? 'High reading detected! Please sit quietly for 10 minutes and repeat the measurement. If you feel dizzy, breathless, or have chest tightness, seek immediate medical attention.'

        : 'Health reading logged and verified successfully.'

    }, 250)

  },

  getMedicalRecords: async () => {

    if (!USE_MOCK) {

      return http('/patient/medical-records', {

        token: getToken()

      })

    }

    return delay(mock.patientMedicalRecords, 200)

  },

  addAllergy: async (allergy) => {

    if (!USE_MOCK) {

      return http('/patient/allergies', {

        method: 'POST',

        body: allergy,

        token: getToken()

      })

    }

    const newA = {

      id: `alg-${Date.now()}`,

      ...allergy,

      verifiedBy: 'Patient Reported'

    }

    mock.patientMedicalRecords.allergies.push(newA)

    return delay(newA, 250)

  },

  addCondition: async (condition) => {

    if (!USE_MOCK) {

      return http('/patient/conditions', {

        method: 'POST',

        body: condition,

        token: getToken()

      })

    }

    const newC = {

      id: `cnd-${Date.now()}`,

      ...condition,

      doctor: 'Dr. John Smith'

    }

    mock.patientMedicalRecords.chronicConditions.push(newC)

    return delay(newC, 250)

  },

  uploadDocument: async (doc) => {

    if (!USE_MOCK) {

      return http('/patient/documents', {

        method: 'POST',

        body: doc,

        token: getToken()

      })

    }

    const newDoc = {

      id: `doc-${Date.now()}`,

      date: new Date().toISOString().split('T')[0],

      ...doc

    }

    mock.patientMedicalRecords.documents.unshift(newDoc)

    return delay(newDoc, 300)

  },

  getVisitSummaries: async () => {

    if (!USE_MOCK) {

      return http('/patient/visit-summaries', {

        token: getToken()

      })

    }

    return delay(mock.visitSummaries, 200)

  },

  getLabTests: async () => {

    if (!USE_MOCK) {

      return http('/patient/lab-tests', {

        token: getToken()

      })

    }

    return delay(mock.patientLabTests, 200)

  },

  bookLabTest: async (booking) => {

    if (!USE_MOCK) {

      return http('/patient/lab-tests/book', {

        method: 'POST',

        body: booking,

        token: getToken()

      })

    }

    const newLab = {

      id: `lab-${Date.now()}`,

      testName: booking.testName,

      category: booking.category || 'Diagnostics',

      date: booking.date,

      orderingDoctor: 'Self-scheduled',

      facility: booking.facility || 'MediCare Central Laboratory',

      status: 'Scheduled',

      analytes: [],

      doctorComment: 'Awaiting specimen collection on scheduled date.'

    }

    mock.patientLabTests.unshift(newLab)

    return delay(newLab, 300)

  },

  getAppointments: async () => {

    if (!USE_MOCK) {

      return http('/patient/appointments', {

        token: getToken()

      })

    }

    return delay(mock.patientAppointments, 200)

  },

  bookAppointment: async (appt) => {

    if (!USE_MOCK) {

      return http('/patient/appointments', {

        method: 'POST',

        body: appt,

        token: getToken()

      })

    }

    const newAppt = {

      id: Date.now(),

      status: 'Scheduled',

      doctorAvatar: appt.doctor

        .split(' ')

        .map(w => w[0])

        .join('')

        .slice(0, 2),

      ...appt

    }

    mock.patientAppointments.unshift(newAppt)

    return delay(newAppt, 300)

  },

  cancelAppointment: async (apptId) => {

    if (!USE_MOCK) {

      return http(`/patient/appointments/${apptId}/cancel`, {

        method: 'POST',

        token: getToken()

      })

    }

    const appt = mock.patientAppointments.find(

      a => a.id === Number(apptId)

    )

    if (appt) appt.status = 'Cancelled'

    return delay({ ok: true }, 200)

  },

  getReminders: async () => {

    if (!USE_MOCK) {

      return http('/patient/reminders', {

        token: getToken()

      })

    }

    return delay(mock.medicineReminders, 150)

  },

  toggleReminder: async (id) => {

    if (!USE_MOCK) {

      return http(`/patient/reminders/${id}/toggle`, {

        method: 'POST',

        token: getToken()

      })

    }

    const rem = mock.medicineReminders.find(

      r => r.id === id

    )

    if (rem) {

      rem.taken = !rem.taken

      rem.takenAt = rem.taken

        ? new Date().toLocaleTimeString([], {

            hour: '2-digit',

            minute: '2-digit'

          })

        : null

      if (rem.taken) rem.streakDays += 1

    }

    return delay(rem, 150)

  },

  addReminder: async (rem) => {

    if (!USE_MOCK) {

      return http('/patient/reminders', {

        method: 'POST',

        body: rem,

        token: getToken()

      })

    }

    const newRem = {

      id: `rem-${Date.now()}`,

      taken: false,

      takenAt: null,

      streakDays: 0,

      totalPills: 30,

      remainingPills: 30,

      ...rem

    }

    mock.medicineReminders.push(newRem)

    return delay(newRem, 250)

  },

  getMessages: async () => {

    if (!USE_MOCK) {

      return http('/patient/messages', {

        token: getToken()

      })

    }

    const thread = mock.messagesThreads.find(

      t => t.patientId === 101

    ) || {

      patientId: 101,

      patientName: 'John Doe',

      messages: []

    }

    return delay(thread, 200)

  },

  sendMessage: async (text) => {

    if (!USE_MOCK) {

      return http('/patient/messages', {

        method: 'POST',

        body: { text },

        token: getToken()

      })

    }

    let thread = mock.messagesThreads.find(

      t => t.patientId === 101

    )

    if (!thread) {

      thread = {

        patientId: 101,

        patientName: 'John Doe',

        unreadCount: 0,

        lastActivity: 'Just now',

        messages: []

      }

      mock.messagesThreads.unshift(thread)

    }

    const newMsg = {

      id: Date.now(),

      sender: 'patient',

      text,

      time: new Date().toLocaleTimeString([], {

        hour: '2-digit',

        minute: '2-digit'

      })

    }

    thread.messages.push(newMsg)

    thread.lastActivity = 'Just now'

    return delay(newMsg, 200)

  },

  getProfile: async () => {

    if (!USE_MOCK) {

      return http('/patient/profile', {

        token: getToken()

      })

    }

    return delay(mock.patientProfile, 200)

  },

  updateProfile: async (data) => {

    if (!USE_MOCK) {

      return http('/patient/profile', {

        method: 'PUT',

        body: data,

        token: getToken()

      })

    }

    Object.assign(mock.patientProfile, data)

    return delay(mock.patientProfile, 300)

  }

}



// ----------------------------------------------------

// ADMIN API SERVICE

// ----------------------------------------------------

export const adminApi = {

  registerPatient: async (patient) => {

    return http('/admin/patients', {

      method: 'POST',

      body: patient,

      token: getToken()

    })

  },

  getDashboard: async () => {

    if (!USE_MOCK) {

      return http('/admin/dashboard', {

        token: getToken()

      })

    }

    return delay(mock.adminDashboardStats, 200)

  },

  getDoctors: async ({

    q = '',

    department = 'All',

    status = 'All'

  } = {}) => {

    if (!USE_MOCK) {

      return http(

        `/admin/doctors?q=${q}&dept=${department}&status=${status}`,

        { token: getToken() }

      )

    }

    let list = [...mock.adminDoctors]

    if (status !== 'All') {

      list = list.filter(d => d.status === status)

    }

    if (department !== 'All') {

      list = list.filter(d =>

        d.specialization

          .toLowerCase()

          .includes(department.toLowerCase())

      )

    }

    if (q) {

      list = list.filter(d =>

        (

          d.name +

          d.license +

          d.email +

          d.hospital

        )

          .toLowerCase()

          .includes(q.toLowerCase())

      )

    }

    return delay(list, 200)

  },

  addDoctor: async (docData) => {

    if (!USE_MOCK) {

      return http('/admin/doctors', {

        method: 'POST',

        body: docData,

        token: getToken()

      })

    }

    const newDoc = {

      id: mock.adminDoctors.length + 1,

      status: 'Active',

      consultsCount: 0,

      rating: 5.0,

      joinedDate: new Date().toISOString().split('T')[0],

      ...docData

    }

    mock.adminDoctors.unshift(newDoc)

    return delay(newDoc, 300)

  },

  updateDoctorStatus: async (id, status) => {

    if (!USE_MOCK) {

      return http(`/admin/doctors/${id}/status`, {

        method: 'PUT',

        body: { status },

        token: getToken()

      })

    }

    const doc = mock.adminDoctors.find(

      d => d.id === Number(id)

    )

    if (doc) doc.status = status

    // Also remove from pending approvals if approving.

    const idx = mock.adminDashboardStats.pendingDoctorApprovals.findIndex(

      p => p.id === Number(id)

    )

    if (idx !== -1) {

      mock.adminDashboardStats.pendingDoctorApprovals.splice(idx, 1)

    }

    return delay(doc, 200)

  },

  getPatients: async ({

    q = '',

    hospital = 'All',

    riskCategory = 'All'

  } = {}) => {

    if (!USE_MOCK) {

      return http(

        `/admin/patients?q=${q}&hospital=${hospital}&risk=${riskCategory}`,

        { token: getToken() }

      )

    }

    let list = [...mock.adminPatients]

    if (hospital !== 'All') {

      list = list.filter(p => p.hospital === hospital)

    }

    if (riskCategory !== 'All') {

      list = list.filter(p => p.riskCategory === riskCategory)

    }

    if (q) {

      list = list.filter(p =>

        (p.name + p.phone + String(p.id))

          .toLowerCase()

          .includes(q.toLowerCase())

      )

    }

    return delay(list, 200)

  },

  updatePatientStatus: async (id, status) => {

    if (!USE_MOCK) {

      return http(`/admin/patients/${id}/status`, {

        method: 'PUT',

        body: { status },

        token: getToken()

      })

    }

    const p = mock.adminPatients.find(

      x => x.id === Number(id)

    )

    if (p) p.status = status

    return delay(p, 200)

  },

  getHospitals: async ({

    q = '',

    status = 'All'

  } = {}) => {

    if (!USE_MOCK) {

      return http(

        `/admin/hospitals?q=${q}&status=${status}`,

        { token: getToken() }

      )

    }

    let list = [...mock.adminHospitals]

    if (status !== 'All') {

      list = list.filter(h => h.status === status)

    }

    if (q) {

      list = list.filter(h =>

        (h.name + h.code + h.city)

          .toLowerCase()

          .includes(q.toLowerCase())

      )

    }

    return delay(list, 200)

  },

  addHospital: async (hospData) => {

    if (!USE_MOCK) {

      return http('/admin/hospitals', {

        method: 'POST',

        body: hospData,

        token: getToken()

      })

    }

    const newH = {

      id: mock.adminHospitals.length + 1,

      status: 'Active',

      apiStatus: 'Online (25ms)',

      complianceCert: 'NABH / State Verified',

      bedsOccupied: 0,

      ...hospData

    }

    mock.adminHospitals.unshift(newH)

    return delay(newH, 300)

  },

  getPrescriptionsAudit: async ({

    q = '',

    flag = 'All',

    status = 'All'

  } = {}) => {

    if (!USE_MOCK) {

      return http(

        `/admin/prescriptions-audit?q=${q}&flag=${flag}&status=${status}`,

        { token: getToken() }

      )

    }

    let list = [...mock.adminPrescriptionsAudit]

    if (status !== 'All') {

      list = list.filter(p => p.status === status)

    }

    if (flag !== 'All') {

      list = list.filter(p => p.safetyFlag === flag)

    }

    if (q) {

      list = list.filter(p =>

        (

          p.code +

          p.doctor +

          p.patient +

          p.hospital

        )

          .toLowerCase()

          .includes(q.toLowerCase())

      )

    }

    return delay(list, 200)

  },

  getReports: async () => {

    if (!USE_MOCK) {

      return http('/admin/reports', {

        token: getToken()

      })

    }

    return delay({

      ...mock.reportsData,

      hospitalDistribution:

        mock.adminDashboardStats.hospitalDistribution,

      kpis:

        mock.adminDashboardStats.kpis,

      systemHealth:

        mock.adminDashboardStats.systemHealth

    }, 250)

  },

  getSystemLogs: async ({

    level = 'All',

    component = 'All',

    q = ''

  } = {}) => {

    if (!USE_MOCK) {

      return http(

        `/admin/system-logs?level=${level}&comp=${component}&q=${q}`,

        { token: getToken() }

      )

    }

    let list = [...mock.adminSystemLogs]

    if (level !== 'All') {

      list = list.filter(l => l.level === level)

    }

    if (component !== 'All') {

      list = list.filter(l => l.component === component)

    }

    if (q) {

      list = list.filter(l =>

        (

          l.message +

          l.user +

          l.ip +

          l.id

        )

          .toLowerCase()

          .includes(q.toLowerCase())

      )

    }

    return delay(list, 150)

  },

  clearLogs: async () => {

    if (!USE_MOCK) {

      return http('/admin/system-logs/clear', {

        method: 'POST',

        token: getToken()

      })

    }

    mock.adminSystemLogs.length = 0

    return delay({ ok: true }, 150)

  },

  getSettings: async () => {

    if (!USE_MOCK) {

      return http('/admin/settings', {

        token: getToken()

      })

    }

    return delay(mock.adminSettingsData, 200)

  },

  updateSettings: async (settings) => {

    if (!USE_MOCK) {

      return http('/admin/settings', {

        method: 'PUT',

        body: settings,

        token: getToken()

      })

    }

    Object.assign(mock.adminSettingsData, settings)

    return delay(mock.adminSettingsData, 300)

  }

}



// ----------------------------------------------------

// SYSTEM / NOTIFICATIONS SERVICE

// ----------------------------------------------------

export const systemApi = {

  getNotifications: async (roleKind = 'patient') => {

    if (!USE_MOCK) {

      return http(

        `/notifications?role=${roleKind}`,

        { token: getToken() }

      )

    }

    const list = mock.notificationsData[roleKind] || []

    return delay(list, 100)

  },

  markAllAsRead: async (roleKind = 'patient') => {

    if (!USE_MOCK) {

      return http(

        `/notifications/mark-read?role=${roleKind}`,

        {

          method: 'POST',

          token: getToken()

        }

      )

    }

    const list = mock.notificationsData[roleKind] || []

    list.forEach(n => {

      n.unread = false

    })

    return delay({ ok: true }, 100)

  }

}