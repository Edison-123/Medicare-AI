export const users = {
  'doctor@medicare.ai':  { id:1, name:'Dr. John Smith', role:'ROLE_DOCTOR',  sub:'MBBS, MD' },
  'patient@medicare.ai': { id:2, name:'John Doe',       role:'ROLE_PATIENT', sub:'Patient' },
  'admin@medicare.ai':   { id:3, name:'Admin User',     role:'ROLE_ADMIN',   sub:'System Administrator' },
}
export const patients = [
  { id:101, name:'John Doe',      age:42, gender:'Male',   phone:'+1 555 0101', lastVisit:'2026-09-28', nextAppt:'2026-10-12', status:'Active',   allergies:['Penicillin'], conditions:['Hypertension'], meds:['Amlodipine 5mg'] },
  { id:102, name:'Sarah Wilson',  age:35, gender:'Female', phone:'+1 555 0102', lastVisit:'2026-10-01', nextAppt:'2026-10-15', status:'Active',   allergies:[], conditions:['Asthma'], meds:['Salbutamol inhaler'] },
  { id:103, name:'Michael Brown', age:58, gender:'Male',   phone:'+1 555 0103', lastVisit:'2026-09-20', nextAppt:null,         status:'Follow-up',allergies:['Sulfa drugs'], conditions:['Type 2 Diabetes'], meds:['Metformin 500mg'] },
  { id:104, name:'Emma Davis',    age:29, gender:'Female', phone:'+1 555 0104', lastVisit:'2026-08-30', nextAppt:'2026-10-20', status:'Active',   allergies:[], conditions:[], meds:[] },
  { id:105, name:'Liam Johnson',  age:66, gender:'Male',   phone:'+1 555 0105', lastVisit:'2026-07-11', nextAppt:null,         status:'Inactive', allergies:['Aspirin'], conditions:['COPD'], meds:['Tiotropium'] },
  { id:106, name:'Olivia Martin', age:47, gender:'Female', phone:'+1 555 0106', lastVisit:'2026-09-15', nextAppt:'2026-10-09', status:'Follow-up',allergies:[], conditions:['Migraine'], meds:['Sumatriptan'] },
  { id:107, name:'Noah Garcia',   age:8,  gender:'Male',   phone:'+1 555 0107', lastVisit:'2026-09-30', nextAppt:null,         status:'Active',   allergies:[], conditions:[], meds:[] },
]
export const doctorDashboard = {
  stats:[
    { key:'patients', label:"Today's Patients", value:32, delta:'12% from yesterday', tone:'blue' },
    { key:'rx', label:'Prescriptions Generated', value:18, delta:'8% from yesterday', tone:'green' },
    { key:'ai', label:'AI Transcriptions', value:8, delta:'15% from yesterday', tone:'purple' },
    { key:'follow', label:'Pending Follow-ups', value:5, link:'View all', tone:'orange' },
  ],
  appointments:[
    { patient:'John Doe', time:'10:00 AM', type:'OPD', status:'Completed' },
    { patient:'Sarah Wilson', time:'10:30 AM', type:'Consultation', status:'In Progress' },
    { patient:'Michael Brown', time:'11:00 AM', type:'Follow-up', status:'Upcoming' },
    { patient:'Emma Davis', time:'11:30 AM', type:'OPD', status:'Upcoming' },
  ],
  aiOverview:{ total:18, accuracy:96.4, parts:[
    { label:'OCR (Handwritten)', value:7 }, { label:'Speech-to-Text', value:6 }, { label:'Mixed input', value:5 } ] },
  recentRx:[
    { patient:'John Doe', when:'2 mins ago', status:'Saved' }, { patient:'Sarah Wilson', when:'25 mins ago', status:'Saved' },
    { patient:'Michael Brown', when:'1 hour ago', status:'Draft' }, { patient:'Emma Davis', when:'2 hours ago', status:'Saved' },
  ],
}
export const patientTimeline = [
  { date:'2026-09-28', title:'Consultation completed', body:'Hypertension review. BP 128/82.' },
  { date:'2026-09-28', title:'Prescription finalized', body:'Amlodipine 5mg, once daily, 30 days.' },
  { date:'2026-09-10', title:'Lab result available', body:'Lipid panel within reference range.' },
  { date:'2026-08-02', title:'Appointment', body:'Routine follow-up.' },
]

const emptyForm = () => ({ chiefComplaint:'', symptoms:'', vitals:{ bp:'', hr:'', temp:'', spo2:'' }, exam:'', diagnosis:'', notes:'', plan:'', followUp:'' })
export const consultations = [
  { id:501, patientId:102, patient:'Sarah Wilson',  date:'2026-10-02', time:'10:30 AM', type:'Consultation', status:'In Progress',
    form:{ ...emptyForm(), chiefComplaint:'Shortness of breath at night' } },
  { id:502, patientId:103, patient:'Michael Brown', date:'2026-10-02', time:'11:00 AM', type:'Follow-up', status:'Scheduled', form:emptyForm() },
  { id:503, patientId:104, patient:'Emma Davis',    date:'2026-10-02', time:'11:30 AM', type:'OPD', status:'Scheduled', form:emptyForm() },
  { id:500, patientId:101, patient:'John Doe',      date:'2026-10-02', time:'10:00 AM', type:'OPD', status:'Completed',
    form:{ chiefComplaint:'Routine blood pressure review', symptoms:'No headache or dizziness', vitals:{ bp:'128/82', hr:'74', temp:'36.8', spo2:'98' },
      exam:'Heart sounds normal. Chest clear.', diagnosis:'Essential hypertension, controlled', notes:'Adherent to medication.', plan:'Continue Amlodipine 5mg once daily.', followUp:'Review in 4 weeks' } },
  { id:504, patientId:106, patient:'Olivia Martin', date:'2026-10-09', time:'09:30 AM', type:'Follow-up', status:'Scheduled', form:emptyForm() },
  { id:505, patientId:101, patient:'John Doe',      date:'2026-10-12', time:'10:30 AM', type:'OPD', status:'Scheduled', form:emptyForm() },
  { id:499, patientId:107, patient:'Noah Garcia',   date:'2026-09-30', time:'04:00 PM', type:'OPD', status:'Completed', form:{ ...emptyForm(), chiefComplaint:'Fever for 2 days', diagnosis:'Viral fever' } },
  { id:498, patientId:105, patient:'Liam Johnson',  date:'2026-09-29', time:'02:00 PM', type:'Consultation', status:'Cancelled', form:emptyForm() },
]
export const aiJobs = {} // consultationId -> { transcript, draft } (in-memory mock persistence)

const item = (name, strength, dosage, frequency, duration, food, instructions = '', route = 'Oral') => ({ name, strength, dosage, frequency, duration, route, food, instructions })
export const prescriptions = [
  { id:1, code:'RX-1001', patientId:101, patient:'John Doe', doctor:'Dr. John Smith', date:'2026-10-02', diagnosis:'Essential hypertension, controlled', status:'Finalized', aiAssisted:false,
    items:[item('Amlodipine', '5 mg', '1 tablet', 'Once daily', '30 days', 'Any', 'Take at the same time each day')], notes:'', followUp:'2026-10-30' },
  { id:2, code:'RX-1002', patientId:102, patient:'Sarah Wilson', doctor:'Dr. John Smith', date:'2026-10-02', diagnosis:'Suspected poorly controlled asthma', status:'Reviewed', aiAssisted:true,
    items:[{ ...item('Salbutamol inhaler', '100 mcg/dose', '2 puffs', 'As needed', '14 days', 'Any', 'Maximum 8 puffs in 24 hours', 'Inhaled'), ai:true }], notes:'Peak flow chart daily.', followUp:'2026-10-16' },
  { id:3, code:'RX-1003', patientId:103, patient:'Michael Brown', doctor:'Dr. John Smith', date:'2026-10-02', diagnosis:'Type 2 diabetes, follow-up', status:'Draft', aiAssisted:false,
    items:[item('Metformin', '500 mg', '1 tablet', 'Twice daily', '30 days', 'After food')], notes:'', followUp:'' },
  { id:4, code:'RX-0998', patientId:107, patient:'Noah Garcia', doctor:'Dr. John Smith', date:'2026-09-30', diagnosis:'Viral fever', status:'Finalized', aiAssisted:false,
    items:[item('Paracetamol', '250 mg/5 ml', '5 ml', 'Three times daily', '3 days', 'After food', 'Only if temperature above 38°C', 'Oral')], notes:'', followUp:'' },
  { id:5, code:'RX-0990', patientId:105, patient:'Liam Johnson', doctor:'Dr. John Smith', date:'2026-09-20', diagnosis:'COPD review', status:'Cancelled', aiAssisted:false,
    items:[item('Tiotropium', '18 mcg', '1 capsule', 'Once daily', '30 days', 'Any', '', 'Inhaled')], notes:'Entered for wrong patient.', followUp:'' },
]

export const messagesThreads = [
  {
    patientId: 102,
    patientName: 'Sarah Wilson',
    unreadCount: 2,
    lastActivity: '10:45 AM',
    messages: [
      { id: 1, sender: 'patient', text: 'Good morning Dr. Smith, I felt much better after taking the reliever inhaler you prescribed.', time: '10:15 AM' },
      { id: 2, sender: 'doctor', text: 'Good to hear, Sarah. Keep tracking your peak flow morning and night on your chart.', time: '10:30 AM' },
      { id: 3, sender: 'patient', text: 'Will do! Should I continue the same dose if I have morning cough?', time: '10:42 AM' },
      { id: 4, sender: 'patient', text: 'Also, can I take paracetamol if I get a headache?', time: '10:45 AM' },
    ]
  },
  {
    patientId: 101,
    patientName: 'John Doe',
    unreadCount: 1,
    lastActivity: 'Yesterday',
    messages: [
      { id: 10, sender: 'doctor', text: 'Hello John, your blood pressure reading was within the target range (128/82). Keep up the daily walk.', time: 'Sep 28, 04:30 PM' },
      { id: 11, sender: 'patient', text: 'Thank you doctor! Do I need to recheck BP before our next appointment?', time: 'Yesterday, 06:15 PM' },
    ]
  },
  {
    patientId: 103,
    patientName: 'Michael Brown',
    unreadCount: 0,
    lastActivity: 'Sep 26',
    messages: [
      { id: 20, sender: 'patient', text: 'Doctor, my fasting blood sugar was 118 mg/dL this morning.', time: 'Sep 26, 08:30 AM' },
      { id: 21, sender: 'doctor', text: 'That is improved Michael. Continue Metformin 500mg after meals.', time: 'Sep 26, 09:10 AM' },
    ]
  },
  {
    patientId: 104,
    patientName: 'Emma Davis',
    unreadCount: 0,
    lastActivity: 'Sep 22',
    messages: [
      { id: 30, sender: 'patient', text: 'Hi Doctor, confirming our appointment next month.', time: 'Sep 22, 11:20 AM' },
      { id: 31, sender: 'doctor', text: 'Confirmed Emma. Please bring your latest blood test reports.', time: 'Sep 22, 11:45 AM' },
    ]
  }
]

export const reportsData = {
  summary: {
    totalPatients: 148,
    consultationsCompleted: 112,
    prescriptionsIssued: 94,
    aiAdoptionRate: 78.5,
    avgConsultTimeMinutes: 11.4,
    allergyAlertsAvoided: 16
  },
  monthlyTrends: [
    { month: 'May', consultations: 68, prescriptions: 54, aiDrafts: 38 },
    { month: 'Jun', consultations: 82, prescriptions: 70, aiDrafts: 58 },
    { month: 'Jul', consultations: 95, prescriptions: 81, aiDrafts: 72 },
    { month: 'Aug', consultations: 104, prescriptions: 89, aiDrafts: 84 },
    { month: 'Sep', consultations: 122, prescriptions: 105, aiDrafts: 98 },
    { month: 'Oct', consultations: 112, prescriptions: 94, aiDrafts: 88 }
  ],
  topConditions: [
    { label: 'Hypertension', count: 38, percentage: 34 },
    { label: 'Bronchial Asthma / COPD', count: 26, percentage: 23 },
    { label: 'Type 2 Diabetes', count: 22, percentage: 20 },
    { label: 'Viral Infection / Fever', count: 15, percentage: 13 },
    { label: 'Migraine / Tension Headache', count: 11, percentage: 10 }
  ],
  prescribedDrugClasses: [
    { category: 'Antihypertensives (CCB / ACEi)', share: 31 },
    { category: 'Respiratory / Inhalers (SABA / ICS)', share: 24 },
    { category: 'Antidiabetic Agents (Metformin)', share: 19 },
    { category: 'Analgesics / Antipyretics', share: 16 },
    { category: 'Antibiotics & Antimicrobials', share: 10 }
  ],
  aiQualityMetrics: {
    transcriptionAccuracy: 96.4,
    ocrAccuracy: 92.1,
    doctorDraftAcceptanceRate: 88.6,
    avgProcessingSeconds: 3.2
  }
}

export const doctorSettings = {
  profile: {
    fullName: 'Dr. John Smith',
    specialization: 'Internal Medicine & Pulmonology',
    qualifications: 'MBBS, MD (Medicine), FCCP',
    licenseNumber: 'MED-REG-849204',
    hospitalAffiliation: 'MediCare Central Hospital & AI Clinic',
    department: 'Outpatient Department (OPD 3)',
    phone: '+1 555 0199',
    email: 'doctor@medicare.ai',
    experienceYears: 14,
    consultationFee: 75
  },
  preferences: {
    defaultFollowUpDays: 14,
    autoStartRecording: true,
    strictAllergyChecks: true,
    suggestGenericEquivalents: true,
    aiModelEngine: 'whisper-large-v3-med',
    autoExportPDF: false,
    defaultRxNotes: 'Take medications strictly as instructed. Drink adequate fluids and report any rash or adverse reactions.'
  },
  notifications: {
    emailAlerts: true,
    patientMessagePush: true,
    criticalLabAlerts: true,
    weeklyReportDigest: true
  }
}

export const drugDatabase = [
  'Amlodipine', 'Aspirin', 'Atorvastatin', 'Azithromycin', 'Ciprofloxacin',
  'Ibuprofen', 'Lisinopril', 'Metformin', 'Omeprazole', 'Paracetamol',
  'Salbutamol', 'Simvastatin', 'Spironolactone', 'Tiotropium', 'Warfarin'
]

export const knownInteractions = [
  {
    drugs: ['Warfarin', 'Aspirin'],
    severity: 'High',
    effect: 'Severe bleeding risk',
    description: 'Concurrent anticoagulant and antiplatelet therapy synergistically increases major gastrointestinal and systemic hemorrhage risk.',
    recommendation: 'Avoid combination unless specifically indicated (e.g., mechanical heart valve). Monitor INR frequently.'
  },
  {
    drugs: ['Warfarin', 'Ibuprofen'],
    severity: 'High',
    effect: 'Increased bleeding & gastric ulceration',
    description: 'NSAIDs displace warfarin from protein binding sites and impair platelet function, causing heightened bleeding hazards.',
    recommendation: 'Use Paracetamol as an alternative analgesic for patients on Warfarin.'
  },
  {
    drugs: ['Lisinopril', 'Spironolactone'],
    severity: 'Moderate',
    effect: 'Risk of Hyperkalemia',
    description: 'Concomitant ACE inhibitor and potassium-sparing diuretic administration may precipitate dangerous elevations in serum potassium.',
    recommendation: 'Monitor serum potassium and renal function within 1-2 weeks of initiation.'
  },
  {
    drugs: ['Simvastatin', 'Amlodipine'],
    severity: 'Moderate',
    effect: 'Increased myopathy / rhabdomyolysis risk',
    description: 'Amlodipine inhibits CYP3A4, raising simvastatin plasma concentrations.',
    recommendation: 'Do not exceed Simvastatin 20 mg daily when prescribed concurrently with Amlodipine.'
  },
  {
    drugs: ['Metformin', 'Ciprofloxacin'],
    severity: 'Low',
    effect: 'Potential glycemic fluctuations',
    description: 'Quinolone antibiotics may alter blood glucose levels in diabetic patients taking oral hypoglycemics.',
    recommendation: 'Advise patient to monitor blood sugar levels more frequently.'
  }
]

export * from './patientData'
export * from './adminData'
