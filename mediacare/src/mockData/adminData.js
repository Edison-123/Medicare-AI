// Mock data for Admin Panel
export const adminDashboardStats = {
  kpis: [
    { key: 'doctors', label: 'Registered Doctors', value: 48, delta: '+4 this month', tone: 'blue' },
    { key: 'patients', label: 'Active Patients', value: '1,420', delta: '+118 this month', tone: 'green' },
    { key: 'hospitals', label: 'Partner Hospitals', value: 6, delta: '100% active', tone: 'purple' },
    { key: 'prescriptions', label: 'Prescriptions Issued', value: '3,842', delta: '+14% vs last month', tone: 'orange' },
  ],
  systemHealth: {
    uptime: '99.98%',
    apiLatencyMs: 42,
    aiInferenceSec: 1.2,
    dbConnections: '18 / 100',
    storageUsedPercent: 34,
    status: 'Operational'
  },
  hospitalDistribution: [
    { name: 'MediCare Central Hospital', code: 'MCH-01', consults: 1840, share: 48, status: 'Normal Load' },
    { name: 'St. Jude Community Health', code: 'SJC-02', consults: 820, share: 21, status: 'Normal Load' },
    { name: 'Apex Heart & Lung Institute', code: 'AHL-03', consults: 560, share: 15, status: 'High Volume' },
    { name: 'Metro Children\'s Clinic', code: 'MCC-04', consults: 340, share: 9, status: 'Normal Load' },
    { name: 'Westside Urgent Care', code: 'WUC-05', consults: 282, share: 7, status: 'Optimal' },
  ],
  recentActivities: [
    { id: 1, type: 'security', level: 'WARN', title: 'Drug Interaction Flagged', desc: 'Prescription RX-1002 triggered high-risk NSAID + Anticoagulant warning.', time: '12 mins ago' },
    { id: 2, type: 'doctor', level: 'INFO', title: 'New Doctor Onboarding Request', desc: 'Dr. Rachel Patel (Cardiology) submitted license verification documents.', time: '38 mins ago' },
    { id: 3, type: 'system', level: 'INFO', title: 'Automated Snapshot Backup', desc: 'Encrypted daily backup to secure vault completed in 4.2 seconds.', time: '2 hours ago' },
    { id: 4, type: 'compliance', level: 'INFO', title: 'Prescription Hash Sealed', desc: 'Batch #892 prescriptions sealed to tamper-proof audit log.', time: '4 hours ago' },
    { id: 5, type: 'security', level: 'CRITICAL', title: 'Rate Limiter Tripped', desc: '5 failed login attempts from IP 192.168.1.105 temporarily blocked.', time: '6 hours ago' },
  ],
  pendingDoctorApprovals: [
    { id: 201, name: 'Dr. Rachel Patel', email: 'rachel.patel@medicare.ai', specialization: 'Interventional Cardiology', license: 'MED-REG-991204', hospital: 'Apex Heart & Lung Institute', submitted: '2026-10-02' },
    { id: 202, name: 'Dr. Samuel Green', email: 'samuel.green@medicare.ai', specialization: 'Neurology', license: 'MED-REG-773812', hospital: 'MediCare Central Hospital', submitted: '2026-10-01' },
  ]
}

export const adminDoctors = [
  { id: 1, name: 'Dr. John Smith', email: 'doctor@medicare.ai', specialization: 'Internal Medicine & Pulmonology', hospital: 'MediCare Central Hospital', license: 'MED-REG-849204', experienceYears: 14, consultsCount: 382, rating: 4.9, status: 'Active', joinedDate: '2023-01-15' },
  { id: 2, name: 'Dr. Sarah Jenkins', email: 'sarah.jenkins@medicare.ai', specialization: 'Pediatrics & Adolescent Care', hospital: 'Metro Children\'s Clinic', license: 'MED-REG-659301', experienceYears: 11, consultsCount: 420, rating: 4.8, status: 'Active', joinedDate: '2023-04-10' },
  { id: 3, name: 'Dr. Marcus Vance', email: 'marcus.vance@medicare.ai', specialization: 'Otolaryngology (ENT)', hospital: 'St. Jude Community Health', license: 'MED-REG-391024', experienceYears: 16, consultsCount: 295, rating: 4.7, status: 'Active', joinedDate: '2023-06-01' },
  { id: 4, name: 'Dr. Emily Chen', email: 'emily.chen@medicare.ai', specialization: 'Dermatology', hospital: 'MediCare Central Hospital', license: 'MED-REG-552190', experienceYears: 9, consultsCount: 310, rating: 4.9, status: 'Active', joinedDate: '2023-09-18' },
  { id: 5, name: 'Dr. David Miller', email: 'david.miller@medicare.ai', specialization: 'Orthopedic Surgery', hospital: 'Westside Urgent Care', license: 'MED-REG-448209', experienceYears: 20, consultsCount: 260, rating: 4.8, status: 'Active', joinedDate: '2023-11-05' },
  { id: 6, name: 'Dr. Linda Watson', email: 'linda.watson@medicare.ai', specialization: 'General Practice', hospital: 'St. Jude Community Health', license: 'MED-REG-221980', experienceYears: 7, consultsCount: 190, rating: 4.6, status: 'Active', joinedDate: '2024-02-12' },
  { id: 7, name: 'Dr. Rachel Patel', email: 'rachel.patel@medicare.ai', specialization: 'Interventional Cardiology', hospital: 'Apex Heart & Lung Institute', license: 'MED-REG-991204', experienceYears: 12, consultsCount: 0, rating: 0.0, status: 'Pending Approval', joinedDate: '2026-10-02' },
  { id: 8, name: 'Dr. Samuel Green', email: 'samuel.green@medicare.ai', specialization: 'Neurology', hospital: 'MediCare Central Hospital', license: 'MED-REG-773812', experienceYears: 15, consultsCount: 0, rating: 0.0, status: 'Pending Approval', joinedDate: '2026-10-01' },
  { id: 9, name: 'Dr. Alan Harper', email: 'alan.harper@medicare.ai', specialization: 'Psychiatry', hospital: 'Westside Urgent Care', license: 'MED-REG-109283', experienceYears: 8, consultsCount: 145, rating: 4.5, status: 'Suspended', joinedDate: '2024-05-20' },
]

export const adminPatients = [
  { id: 101, name: 'John Doe', age: 42, gender: 'Male', phone: '+1 555 0101', hospital: 'MediCare Central Hospital', primaryDoctor: 'Dr. John Smith', conditions: ['Hypertension'], riskCategory: 'Low', status: 'Active', registeredDate: '2024-01-10' },
  { id: 102, name: 'Sarah Wilson', age: 35, gender: 'Female', phone: '+1 555 0102', hospital: 'MediCare Central Hospital', primaryDoctor: 'Dr. John Smith', conditions: ['Asthma'], riskCategory: 'Moderate', status: 'Active', registeredDate: '2024-02-18' },
  { id: 103, name: 'Michael Brown', age: 58, gender: 'Male', phone: '+1 555 0103', hospital: 'MediCare Central Hospital', primaryDoctor: 'Dr. John Smith', conditions: ['Type 2 Diabetes'], riskCategory: 'Moderate', status: 'Active', registeredDate: '2024-03-05' },
  { id: 104, name: 'Emma Davis', age: 29, gender: 'Female', phone: '+1 555 0104', hospital: 'Metro Children\'s Clinic', primaryDoctor: 'Dr. Sarah Jenkins', conditions: [], riskCategory: 'Low', status: 'Active', registeredDate: '2024-04-12' },
  { id: 105, name: 'Liam Johnson', age: 66, gender: 'Male', phone: '+1 555 0105', hospital: 'Apex Heart & Lung Institute', primaryDoctor: 'Dr. John Smith', conditions: ['COPD'], riskCategory: 'High', status: 'Active', registeredDate: '2024-05-09' },
  { id: 106, name: 'Olivia Martin', age: 47, gender: 'Female', phone: '+1 555 0106', hospital: 'St. Jude Community Health', primaryDoctor: 'Dr. Marcus Vance', conditions: ['Migraine'], riskCategory: 'Low', status: 'Active', registeredDate: '2024-06-21' },
  { id: 107, name: 'Noah Garcia', age: 8, gender: 'Male', phone: '+1 555 0107', hospital: 'Metro Children\'s Clinic', primaryDoctor: 'Dr. Sarah Jenkins', conditions: [], riskCategory: 'Low', status: 'Active', registeredDate: '2024-07-14' },
  { id: 108, name: 'Sophia Martinez', age: 72, gender: 'Female', phone: '+1 555 0108', hospital: 'Apex Heart & Lung Institute', primaryDoctor: 'Dr. David Miller', conditions: ['Osteoarthritis', 'Arrhythmia'], riskCategory: 'High', status: 'Flagged', registeredDate: '2024-08-30' },
]

export const adminHospitals = [
  {
    id: 1,
    name: 'MediCare Central Hospital & Research Center',
    code: 'MCH-01',
    type: 'Tertiary Care Hospital',
    city: 'Springfield, IL',
    address: '100 Medical Parkway, Springfield, IL 62701',
    director: 'Dr. Arthur Sterling, MD, FACS',
    departmentsCount: 14,
    doctorsCount: 24,
    bedsTotal: 650,
    bedsOccupied: 492,
    status: 'Active',
    apiStatus: 'Online (28ms)',
    complianceCert: 'JCAHO Gold Seal (Valid 2028)'
  },
  {
    id: 2,
    name: 'St. Jude Community Health Center',
    code: 'SJC-02',
    type: 'Community Health Hospital',
    city: 'Peoria, IL',
    address: '450 Mercy Drive, Peoria, IL 61602',
    director: 'Dr. Katherine Bell, MD',
    departmentsCount: 8,
    doctorsCount: 8,
    bedsTotal: 220,
    bedsOccupied: 160,
    status: 'Active',
    apiStatus: 'Online (35ms)',
    complianceCert: 'NABH Accredited'
  },
  {
    id: 3,
    name: 'Apex Heart & Lung Institute',
    code: 'AHL-03',
    type: 'Specialty Cardiac Center',
    city: 'Chicago, IL',
    address: '880 Michigan Avenue, Chicago, IL 60611',
    director: 'Dr. Vikram Sen, MD, FACC',
    departmentsCount: 5,
    doctorsCount: 6,
    bedsTotal: 180,
    bedsOccupied: 145,
    status: 'Active',
    apiStatus: 'Online (41ms)',
    complianceCert: 'Accreditation Canada Diamond'
  },
  {
    id: 4,
    name: 'Metro Children\'s Specialty Clinic',
    code: 'MCC-04',
    type: 'Pediatric Specialty Clinic',
    city: 'Springfield, IL',
    address: '220 Sunshine Boulevard, Springfield, IL 62703',
    director: 'Dr. Sarah Jenkins, MD, FAAP',
    departmentsCount: 4,
    doctorsCount: 4,
    bedsTotal: 95,
    bedsOccupied: 58,
    status: 'Active',
    apiStatus: 'Online (32ms)',
    complianceCert: 'State Pediatric Excellence'
  },
  {
    id: 5,
    name: 'Westside Urgent Care & Diagnostics',
    code: 'WUC-05',
    type: 'Urgent Care & Outpatient',
    city: 'Decatur, IL',
    address: '15 Gateway Circle, Decatur, IL 62521',
    director: 'Dr. David Miller, MD',
    departmentsCount: 6,
    doctorsCount: 4,
    bedsTotal: 50,
    bedsOccupied: 22,
    status: 'Active',
    apiStatus: 'Online (48ms)',
    complianceCert: 'UCAOA Certified'
  },
  {
    id: 6,
    name: 'North Shore Family Practice',
    code: 'NSF-06',
    type: 'Primary Care Outpost',
    city: 'Evanston, IL',
    address: '710 Central Street, Evanston, IL 60201',
    director: 'Dr. Linda Watson, MD',
    departmentsCount: 3,
    doctorsCount: 2,
    bedsTotal: 25,
    bedsOccupied: 8,
    status: 'Active',
    apiStatus: 'Online (52ms)',
    complianceCert: 'NCQA Level 3 PCMH'
  }
]

export const adminPrescriptionsAudit = [
  { id: 1, code: 'RX-1001', doctor: 'Dr. John Smith', patient: 'John Doe', hospital: 'MediCare Central Hospital', date: '2026-10-02 10:14', diagnosis: 'Essential hypertension', medsCount: 1, aiAssisted: false, safetyFlag: 'Verified Safe', status: 'Finalized', auditHash: 'sha256-8a9f...c412' },
  { id: 2, code: 'RX-1002', doctor: 'Dr. John Smith', patient: 'Sarah Wilson', hospital: 'MediCare Central Hospital', date: '2026-10-02 10:48', diagnosis: 'Suspected poorly controlled asthma', medsCount: 1, aiAssisted: true, safetyFlag: 'AI Drug Interaction Warning', status: 'Reviewed', auditHash: 'sha256-4b21...7e89' },
  { id: 3, code: 'RX-1003', doctor: 'Dr. John Smith', patient: 'Michael Brown', hospital: 'MediCare Central Hospital', date: '2026-10-02 11:22', diagnosis: 'Type 2 diabetes, follow-up', medsCount: 1, aiAssisted: false, safetyFlag: 'Verified Safe', status: 'Draft', auditHash: 'sha256-9e32...10fa' },
  { id: 4, code: 'RX-0998', doctor: 'Dr. Sarah Jenkins', patient: 'Noah Garcia', hospital: 'Metro Children\'s Clinic', date: '2026-09-30 16:30', diagnosis: 'Viral fever', medsCount: 1, aiAssisted: false, safetyFlag: 'Verified Safe', status: 'Finalized', auditHash: 'sha256-11ac...55df' },
  { id: 5, code: 'RX-0990', doctor: 'Dr. John Smith', patient: 'Liam Johnson', hospital: 'Apex Heart & Lung Institute', date: '2026-09-20 14:15', diagnosis: 'COPD review', medsCount: 1, aiAssisted: false, safetyFlag: 'Cancelled by Doctor', status: 'Cancelled', auditHash: 'sha256-09ab...8821' },
  { id: 6, code: 'RX-0985', doctor: 'Dr. Emily Chen', patient: 'Olivia Martin', hospital: 'MediCare Central Hospital', date: '2026-09-18 09:40', diagnosis: 'Chronic tension headache', medsCount: 2, aiAssisted: true, safetyFlag: 'Verified Safe', status: 'Finalized', auditHash: 'sha256-78ff...34aa' },
  { id: 7, code: 'RX-0972', doctor: 'Dr. David Miller', patient: 'Sophia Martinez', hospital: 'Westside Urgent Care', date: '2026-09-12 15:10', diagnosis: 'Acute knee osteoarthritis flare', medsCount: 2, aiAssisted: true, safetyFlag: 'Age & Renal Dose Alert', status: 'Finalized', auditHash: 'sha256-32bb...99cd' },
]

export const adminSystemLogs = [
  { id: 'LOG-9941', timestamp: '2026-10-02 11:42:18', level: 'INFO', component: 'RxEngine', user: 'Dr. John Smith', ip: '10.240.1.18', message: 'Prescription RX-1001 cryptographically sealed and finalized.' },
  { id: 'LOG-9940', timestamp: '2026-10-02 11:35:04', level: 'WARN', component: 'AiSafetyFilter', user: 'Dr. John Smith', ip: '10.240.1.18', message: 'Potential interaction flagged between Warfarin and Aspirin during AI drafting.' },
  { id: 'LOG-9939', timestamp: '2026-10-02 11:20:50', level: 'INFO', component: 'AuthService', user: 'patient@medicare.ai', ip: '172.56.21.90', message: 'Patient John Doe authenticated successfully via SSO session token.' },
  { id: 'LOG-9938', timestamp: '2026-10-02 11:05:12', level: 'INFO', component: 'TranscriptionService', user: 'Dr. John Smith', ip: '10.240.1.18', message: 'Whisper-Large audio chunk processed in 1,280ms (Accuracy: 96.4%).' },
  { id: 'LOG-9937', timestamp: '2026-10-02 10:48:33', level: 'CRITICAL', component: 'RateLimiter', user: 'anonymous', ip: '192.168.1.105', message: 'Exceeded maximum failed login attempts (5). IP temporarily banned for 15 minutes.' },
  { id: 'LOG-9936', timestamp: '2026-10-02 10:15:22', level: 'INFO', component: 'DbCluster', user: 'system', ip: '127.0.0.1', message: 'Read-replica synchronization latency within threshold (4ms).' },
  { id: 'LOG-9935', timestamp: '2026-10-02 09:30:00', level: 'INFO', component: 'BackupEngine', user: 'cron', ip: '127.0.0.1', message: 'Daily differential snapshot completed (Size: 4.8 GB, SHA-256 verified).' },
  { id: 'LOG-9934', timestamp: '2026-10-02 08:45:11', level: 'WARN', component: 'LabConnector', user: 'system', ip: '10.240.4.12', message: 'HL7 feed from Central Pathology experienced 3 retries before 200 OK.' },
  { id: 'LOG-9933', timestamp: '2026-10-01 23:59:58', level: 'INFO', component: 'AuditLogger', user: 'system', ip: '127.0.0.1', message: 'Midnight HIPAA compliance checksum validated. All records intact.' },
  { id: 'LOG-9932', timestamp: '2026-10-01 20:12:44', level: 'INFO', component: 'AuthService', user: 'admin@medicare.ai', ip: '10.240.1.2', message: 'Administrator signed in to management control plane.' },
]

export const adminSettingsData = {
  general: {
    platformName: 'MediCare AI Enterprise Health Platform',
    maintenanceMode: false,
    environment: 'Production (v2.4.0-stable)',
    dataRetentionYears: 7,
    supportEmail: 'admin-support@medicare.ai'
  },
  aiEngine: {
    primaryModel: 'whisper-large-v3-med',
    ocrEngine: 'medicare-vision-ocr-pro',
    confidenceThresholdPercent: 92,
    enforceAllergyCheck: true,
    enforceInteractionCheck: true,
    requireDoctorSignature: true
  },
  security: {
    sessionTimeoutMinutes: 30,
    maxFailedLogins: 5,
    lockoutDurationMinutes: 15,
    enforce2FA: true,
    ipAllowlistEnabled: false
  },
  integrations: {
    hl7FhirEndpoint: 'https://fhir.medicare.ai/r4',
    apiKeySecretMasked: 'mc_live_89f92*******************01a',
    webhookStatus: 'Healthy (Last ping: 2 mins ago)'
  }
}
