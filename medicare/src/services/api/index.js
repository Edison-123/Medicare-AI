// Contract (Spring Boot):  POST /api/auth/login · GET /api/doctors/me/dashboard

// GET /api/patients?q=&status=&sort=&dir=&page=&size= · GET /api/patients/{id}


import { API_BASE_URL, http } from './client'
import { subscribeToMessageEvents } from './messageEvents'

import { getToken } from '../auth/session'

export const subscribeToMessageUpdates = onUpdate => subscribeToMessageEvents(
  `${API_BASE_URL}/messages/events`, onUpdate, EventSource)
export const subscribeToNotificationUpdates = onUpdate => subscribeToMessageEvents(
  `${API_BASE_URL}/messages/events`, onUpdate, EventSource, 'notification-updated')



export const authApi = {

  login: (email, password) => http('/auth/login', { method:'POST', body:{ email, password } }),
  updateProfilePicture: profilePicture => http('/auth/profile-picture', {
    method:'PUT', body:{ profilePicture }
  }),
  changePassword: (currentPassword, newPassword) => http('/auth/password', {
    method:'POST', body:{ currentPassword, newPassword }
  }),
  me: () => http('/auth/me'),
  logout: () => http('/auth/logout', { method: 'POST' }),

}

export const doctorApi = {

  dashboard: () => http('/doctors/me/dashboard', { token:getToken() }),

  getPendingRefills: async () => {

    return http('/doctors/me/refills', { token: getToken() })},

  respondRefill: async (refillId, action, reason = '') => {

    return http(`/doctors/me/refills/${refillId}`, { method: 'POST', body: { action: action === 'visit_required' ? 'visit' : action, reason }, token: getToken() })}

}

export const patientsApi = {

  list: async ({ q = '', status = 'All', sort = 'name', dir = 'asc', page = 1, size = 5 } = {}) => {

    return http(`/patients?${new URLSearchParams({ q, status, sort, dir, page, size })}`, { token:getToken() })},

  get: id => http(`/patients/${id}`, { token:getToken() }),

}




// GET /api/consultations?q=&tab=&page=&size= · GET/PUT /api/consultations/{id} · POST /api/consultations/{id}/complete

// GET/PUT /api/consultations/{id}/ai  (stores transcript + AI draft + review state)

export const consultationsApi = {

  list: async ({ q = '', tab = 'today', page = 1, size = 6 } = {}) => {

    return http(`/consultations?${new URLSearchParams({ q, tab, page, size })}`, { token:getToken() })},

  get: async id => {

    return http(`/consultations/${id}`, { token:getToken() })},

  start: async id => {

    // Scheduled -> In Progress

    return http(`/consultations/${id}/start`, { method:'POST', token:getToken() })},

  save: async (id, { form, ai, status }) => {

    return http(`/consultations/${id}`, {

      method:'PUT',

      body:{ form, ai, status },

      token:getToken()

    })},

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

    return http(

      `/prescriptions?${new URLSearchParams({ q, status, from, to, page, size })}`,

      { token:getToken() }

    )},

  get: async id => {

    return http(`/prescriptions/${id}`, { token:getToken() })},

  createFromConsultation: async (consultationId, details) => {
    return http(`/prescriptions/from-consultation/${consultationId}/draft`, {
      method:'POST',
      body:details,
      token:getToken()
    })},

  save: async (id, rx) => {

    

      return http(

        id ? `/prescriptions/${id}` : '/prescriptions',

        {

          method: id ? 'PUT' : 'POST',

          body:rx,

          token:getToken()

        }

      )

    },

  transition: async (id, action) => {

    

      return http(`/prescriptions/${id}/${action}`, {

        method:'POST',

        token:getToken()

      })

    },

}



export const aiToolsApi = {

  getDrugList: async () => {

    return http('/drugs', { token: getToken() })},

  checkInteractions: async (selectedDrugs) => {

    

      return http('/ai/interactions', {

        method: 'POST',

        body: { drugs: selectedDrugs },

        token: getToken()

      })

    },

  summarizeClinicalText: async (text, style = 'soap') => {

    

      return http('/ai/summarize-notes', {

        method: 'POST',

        body: { text, style },

        token: getToken()

      })

    },

  queryAssistant: async (query) => {

    

      return http('/ai/clinical-query', {

        method: 'POST',

        body: { query },

        token: getToken()

      })

    }

}



export const reportsApi = {

  getReports: async (timeframe = '30d') => {

    

      return http(

        `/doctors/me/reports?timeframe=${timeframe}`,

        { token:getToken() }

      )

    }

}



export const messagesApi = {

  listThreads: async () => {

    

      return http('/messages/threads', { token:getToken() })

    },

  sendMessage: async (patientId, text) => {

    

      return http(`/messages/${patientId}`, {

        method: 'POST',

        body: { text },

        token: getToken()

      })

    },

  markAsRead: async (patientId) => {

    

      return http(`/messages/${patientId}/read`, {

        method: 'POST',

        token: getToken()

      })

    }

}



export const settingsApi = {

  getSettings: async () => {

    

      return http('/doctors/me/settings', { token: getToken() })

    },

  updateSettings: async (settings) => {

    

      return http('/doctors/me/settings', {

        method: 'PUT',

        body: settings,

        token: getToken()

      })

    }

}



// ----------------------------------------------------

// PATIENT API SERVICE

// ----------------------------------------------------

export const patientApi = {

  getDoctors: async () => {

    
      return http('/patient/doctors', { token: getToken() })
    },

  getDashboard: async () => {

    

      return http('/patient/dashboard', { token: getToken() })

    },

  getPrescriptions: async ({ status = 'All', q = '' } = {}) => {

    

      return http(

        `/patient/prescriptions?${new URLSearchParams({ status, q })}`,

        { token: getToken() }

      )

    },

  requestRefill: async (prescriptionId, notes = '') => {

    

      return http(`/patient/prescriptions/${prescriptionId}/refill`, {

        method: 'POST',

        body: { notes },

        token: getToken()

      })

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

    },

  getMedicalRecords: async () => {

    

      return http('/patient/medical-records', {

        token: getToken()

      })

    },

  addAllergy: async (allergy) => {

    

      return http('/patient/allergies', {

        method: 'POST',

        body: allergy,

        token: getToken()

      })

    },

  addCondition: async (condition) => {

    

      return http('/patient/conditions', {

        method: 'POST',

        body: condition,

        token: getToken()

      })

    },

  uploadDocument: async (doc) => {

    

      return http('/patient/documents', {

        method: 'POST',

        body: doc,

        token: getToken()

      })

    },

  getVisitSummaries: async () => {

    

      return http('/patient/visit-summaries', {

        token: getToken()

      })

    },

  getLabTests: async () => {

    

      return http('/patient/lab-tests', {

        token: getToken()

      })

    },

  bookLabTest: async (booking) => {

    

      return http('/patient/lab-tests/book', {

        method: 'POST',

        body: booking,

        token: getToken()

      })

    },

  getAppointments: async () => {

    

      return http('/patient/appointments', {

        token: getToken()

      })

    },

  bookAppointment: async (appt) => {

    

      return http('/patient/appointments', {

        method: 'POST',

        body: appt,

        token: getToken()

      })

    },

  cancelAppointment: async (apptId) => {

    

      return http(`/patient/appointments/${apptId}/cancel`, {

        method: 'POST',

        token: getToken()

      })

    },

  getReminders: async () => {

    

      return http('/patient/reminders', {

        token: getToken()

      })

    },

  toggleReminder: async (id) => {

    

      return http(`/patient/reminders/${id}/toggle`, {

        method: 'POST',

        token: getToken()

      })

    },

  deleteReminder: async (id) => {
    return http(`/patient/reminders/${id}`, {
      method: 'DELETE',
      token: getToken()
    })
  },

  addReminder: async (rem) => {

    

      return http('/patient/reminders', {

        method: 'POST',

        body: rem,

        token: getToken()

      })

    },

  getMessages: async () => {

    

      return http('/patient/messages', {

        token: getToken()

      })

    },

  markMessagesRead: async () => http('/patient/messages/read', {
    method: 'POST', token: getToken()
  }),

  sendMessage: async (text) => {

    

      return http('/patient/messages', {

        method: 'POST',

        body: { text },

        token: getToken()

      })

    },

  getProfile: async () => {

    

      return http('/patient/profile', {

        token: getToken()

      })

    },

  updateProfile: async (data) => {

    

      return http('/patient/profile', {

        method: 'PUT',

        body: data,

        token: getToken()

      })

    },

  getSettings: async () => http('/patient/settings', { token: getToken() }),

  updateSettings: async (settings) => http('/patient/settings', {
    method: 'PUT',
    body: settings,
    token: getToken()
  })

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

    

      return http('/admin/dashboard', {

        token: getToken()

      })

    },

  getDoctors: async ({

    q = '',

    department = 'All',

    status = 'All'

  } = {}) => {

    

      return http(

        `/admin/doctors?${new URLSearchParams({ q, department, status })}`,

        { token: getToken() }

      )

    },

  addDoctor: async (docData) => {

    

      return http('/admin/doctors', {

        method: 'POST',

        body: docData,

        token: getToken()

      })

    },

  updateDoctor: async (id, doctor) => {

    return http(`/admin/doctors/${id}`, {

      method: 'PUT',

      body: doctor,

      token: getToken()

    })

  },

  updateDoctorStatus: async (id, status) => {

    

      return http(`/admin/doctors/${id}/status`, {

        method: 'PUT',

        body: { status },

        token: getToken()

      })

    },

  getPatients: async ({

    q = '',

    hospital = 'All',

    riskCategory = 'All'

  } = {}) => {

    

      return http(

        `/admin/patients?${new URLSearchParams({ q, hospital, riskCategory })}`,

        { token: getToken() }

      )

    },

  updatePatient: async (id, patient) => {

    return http(`/admin/patients/${id}`, {

      method: 'PUT',

      body: patient,

      token: getToken()

    })

  },

  updatePatientStatus: async (id, status) => {

    

      return http(`/admin/patients/${id}/status`, {

        method: 'PUT',

        body: { status },

        token: getToken()

      })

    },

  getHospitals: async ({

    q = '',

    status = 'All'

  } = {}) => {

    
      const params = new URLSearchParams({ q, status })

      return http(

        `/admin/hospitals?${params}`,

        { token: getToken() }

      )

    },

  addHospital: async (hospData) => {

    

      return http('/admin/hospitals', {

        method: 'POST',

        body: hospData,

        token: getToken()

      })

    },

  updateHospital: async (id, hospData) => {
    return http(`/admin/hospitals/${id}`, {
      method: 'PUT',
      body: hospData,
      token: getToken()
    })
  },

  deleteHospital: async (id) => {
    return http(`/admin/hospitals/${id}`, {
      method: 'DELETE',
      token: getToken()
    })
  },

  getPrescriptionsAudit: async ({

    q = '',

    flag = 'All',

    status = 'All'

  } = {}) => {

    

      return http(

        `/admin/prescriptions-audit?${new URLSearchParams({ q, flag, status })}`,

        { token: getToken() }

      )

    },

  getReports: async (timeframe = '30d') => {

    

      return http(`/admin/reports?${new URLSearchParams({ timeframe })}`, {

        token: getToken()

      })

    },

  getSystemLogs: async ({

    level = 'All',

    component = 'All',

    q = ''

  } = {}) => {

    

      return http(

        `/admin/system-logs?${new URLSearchParams({ level, component, q })}`,

        { token: getToken() }

      )

    },

  clearLogs: async () => {

    

      return http('/admin/system-logs/clear', {

        method: 'POST',

        token: getToken()

      })

    },

  getSettings: async () => {

    

      return http('/admin/settings', {

        token: getToken()

      })

    },

  updateSettings: async (settings) => {

    

      return http('/admin/settings', {

        method: 'PUT',

        body: settings,

        token: getToken()

      })

    }

}



// ----------------------------------------------------

// SYSTEM / NOTIFICATIONS SERVICE

// ----------------------------------------------------

export const ocrTrainingApi = {
  saveSample: sample => http('/ocr-training/samples', {
    method: 'POST',
    body: sample,
    token: getToken()
  })
}

export const systemApi = {

  getWorkflowSettings: async () => http('/system/workflow-settings', { token: getToken() }),

  getNotifications: async (roleKind = 'patient') => {

    

      return http(

        `/notifications?role=${roleKind}`,

        { token: getToken() }

      )

    },

  markAllAsRead: async (roleKind = 'patient') => {

    

      return http(

        `/notifications/mark-read?role=${roleKind}`,

        {

          method: 'POST',

          token: getToken()

        }

      )

    },

  clearNotifications: async (roleKind = 'patient') => {
    return http(
      `/notifications?role=${roleKind}`,
      {
        method: 'DELETE',
        token: getToken()
      }
    )
  }

}