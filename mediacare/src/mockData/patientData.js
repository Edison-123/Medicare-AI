// Mock data for Patient Portal
export const patientProfile = {
  id: 101,
  name: 'John Doe',
  email: 'patient@medicare.ai',
  phone: '+1 555 0101',
  dob: '1984-05-14',
  age: 42,
  gender: 'Male',
  bloodGroup: 'O+',
  heightCm: 178,
  weightKg: 74,
  bmi: 23.4,
  address: '742 Evergreen Terrace, Springfield, IL 62704',
  emergencyContact: {
    name: 'Mary Doe',
    relation: 'Spouse',
    phone: '+1 555 0198'
  },
  insurance: {
    provider: 'BlueCross HealthShield PPO',
    policyNumber: 'BCS-88492019-X',
    groupNumber: 'GRP-99214',
    coverageStatus: 'Active',
    copayConsultation: '$20',
    validUntil: '2027-12-31'
  },
  healthCardNumber: 'MC-PAT-884910'
}

export const patientVitalsLastUpdated = '2026-09-28'

export const patientVitals = [
  { key: 'bp', label: 'Blood Pressure', value: '128/82', unit: 'mmHg', status: 'Optimal', change: 'Normal range', tone: 'green', lastUpdated: '2026-09-28', measuredAt: 'Clinic Visit' },
  { key: 'hr', label: 'Heart Rate', value: '74', unit: 'bpm', status: 'Resting', change: 'Stable', tone: 'blue', lastUpdated: '2026-09-28', measuredAt: 'Clinic Visit' },
  { key: 'spo2', label: 'Oxygen (SpO2)', value: '98', unit: '%', status: 'Healthy', change: 'Normal', tone: 'green', lastUpdated: '2026-09-28', measuredAt: 'Clinic Visit' },
  { key: 'glucose', label: 'Fasting Blood Sugar', value: '96', unit: 'mg/dL', status: 'Normal', change: '-4 from last test', tone: 'purple', lastUpdated: '2026-09-10', measuredAt: 'Lab Fasting Panel' },
]

export const vitalsHistory = [
  { date: '2026-09-28', bpSys: 128, bpDia: 82, hr: 74, spo2: 98, weight: 74.0 },
  { date: '2026-09-14', bpSys: 132, bpDia: 84, hr: 76, spo2: 98, weight: 74.2 },
  { date: '2026-08-30', bpSys: 134, bpDia: 86, hr: 78, spo2: 97, weight: 74.5 },
  { date: '2026-08-15', bpSys: 136, bpDia: 88, hr: 75, spo2: 98, weight: 74.8 },
  { date: '2026-07-30', bpSys: 138, bpDia: 89, hr: 80, spo2: 98, weight: 75.1 },
]

export const patientAppointments = [
  {
    id: 701,
    doctor: 'Dr. John Smith',
    specialty: 'Internal Medicine & Pulmonology',
    hospital: 'MediCare Central Hospital',
    date: '2026-10-12',
    time: '10:30 AM',
    type: 'In-person OPD',
    room: 'Room 304, Building A',
    status: 'Scheduled',
    reason: 'Monthly blood pressure follow-up and prescription review',
    doctorAvatar: 'JS'
  },
  {
    id: 702,
    doctor: 'Dr. Emily Chen',
    specialty: 'Dermatologist',
    hospital: 'MediCare Central Hospital',
    date: '2026-10-24',
    time: '02:00 PM',
    type: 'In-person OPD',
    room: 'Room 205, Dermatology Suite',
    status: 'Scheduled',
    reason: 'Routine seasonal skin checkup',
    doctorAvatar: 'EC'
  },
  {
    id: 700,
    doctor: 'Dr. John Smith',
    specialty: 'Internal Medicine & Pulmonology',
    hospital: 'MediCare Central Hospital',
    date: '2026-09-28',
    time: '10:00 AM',
    type: 'In-person OPD',
    room: 'Room 304, Building A',
    status: 'Completed',
    reason: 'Blood pressure evaluation & dosage adjustment',
    doctorAvatar: 'JS'
  },
  {
    id: 699,
    doctor: 'Dr. Marcus Vance',
    specialty: 'Otolaryngology (ENT)',
    hospital: 'St. Jude Community Health Center',
    date: '2026-07-15',
    time: '11:15 AM',
    type: 'In-person OPD',
    room: 'ENT Clinic 2',
    status: 'Completed',
    reason: 'Allergic sinus irritation evaluation',
    doctorAvatar: 'MV'
  }
]

export const medicineReminders = [
  {
    id: 'rem-1',
    medicineName: 'Amlodipine',
    strength: '5 mg',
    dosage: '1 tablet',
    slot: 'Morning',
    time: '08:00 AM',
    food: 'After breakfast',
    instructions: 'Take with a full glass of water',
    taken: true,
    takenAt: '08:14 AM',
    remainingPills: 22,
    totalPills: 30,
    streakDays: 14
  },
  {
    id: 'rem-2',
    medicineName: 'Multivitamin Complex',
    strength: 'Daily Active',
    dosage: '1 capsule',
    slot: 'Afternoon',
    time: '01:00 PM',
    food: 'With lunch',
    instructions: 'Do not take on an empty stomach',
    taken: true,
    takenAt: '01:05 PM',
    remainingPills: 45,
    totalPills: 60,
    streakDays: 28
  },
  {
    id: 'rem-3',
    medicineName: 'Omega-3 Fish Oil',
    strength: '1000 mg',
    dosage: '1 softgel',
    slot: 'Evening',
    time: '08:00 PM',
    food: 'After dinner',
    instructions: 'Store in cool place',
    taken: false,
    takenAt: null,
    remainingPills: 18,
    totalPills: 30,
    streakDays: 12
  }
]

export const patientPrescriptions = [
  {
    id: 1,
    code: 'RX-1001',
    doctor: 'Dr. John Smith',
    specialty: 'Internal Medicine & Pulmonology',
    hospital: 'MediCare Central Hospital & AI Clinic',
    date: '2026-10-02',
    diagnosis: 'Essential hypertension, controlled',
    status: 'Finalized',
    validUntil: '2026-11-01',
    refillsLeft: 3,
    qrVerification: 'VERIFIED-SIG-849204-MCH-RX1001',
    items: [
      {
        name: 'Amlodipine',
        strength: '5 mg',
        dosage: '1 tablet',
        frequency: 'Once daily',
        duration: '30 days',
        route: 'Oral',
        food: 'Any',
        instructions: 'Take at the same time each day, preferably morning.'
      }
    ],
    notes: 'Maintain low-sodium diet and monitor morning resting blood pressure.',
    followUp: '2026-10-30'
  },
  {
    id: 982,
    code: 'RX-0891',
    doctor: 'Dr. John Smith',
    specialty: 'Internal Medicine',
    hospital: 'MediCare Central Hospital',
    date: '2026-06-14',
    diagnosis: 'Mild acute bronchitis',
    status: 'Completed',
    validUntil: '2026-06-24',
    refillsLeft: 0,
    qrVerification: 'VERIFIED-SIG-849204-MCH-RX0891',
    items: [
      {
        name: 'Azithromycin',
        strength: '500 mg',
        dosage: '1 tablet',
        frequency: 'Once daily',
        duration: '5 days',
        route: 'Oral',
        food: 'Before food',
        instructions: 'Take 1 hour before or 2 hours after meals.'
      },
      {
        name: 'Paracetamol',
        strength: '650 mg',
        dosage: '1 tablet',
        frequency: 'As needed',
        duration: '5 days',
        route: 'Oral',
        food: 'After food',
        instructions: 'For body ache or fever > 38°C. Max 3 tablets daily.'
      }
    ],
    notes: 'Hydrate well and rest. Discontinue once symptom-free.',
    followUp: '2026-06-25'
  },
  {
    id: 940,
    code: 'RX-0742',
    doctor: 'Dr. Marcus Vance',
    specialty: 'Otolaryngology (ENT)',
    hospital: 'St. Jude Community Health Center',
    date: '2026-03-10',
    diagnosis: 'Seasonal allergic rhinitis',
    status: 'Completed',
    validUntil: '2026-04-10',
    refillsLeft: 0,
    qrVerification: 'VERIFIED-SIG-391024-SJC-RX0742',
    items: [
      {
        name: 'Fluticasone Propionate',
        strength: '50 mcg/spray',
        dosage: '2 sprays per nostril',
        frequency: 'Once daily',
        duration: '30 days',
        route: 'Nasal',
        food: 'Any',
        instructions: 'Shake well before each use. Prime before first spray.'
      }
    ],
    notes: 'Rinse mouth and nose with warm water after usage.',
    followUp: ''
  }
]

export const pendingRefillRequests = [
  {
    id: 1,
    prescriptionId: 1,
    prescriptionCode: 'RX-1001',
    patientId: 101,
    patientName: 'John Doe',
    medicine: 'Amlodipine 5 mg',
    dosage: '1 tablet once daily',
    lastVitals: 'BP 128/82 mmHg on Sep 28',
    requestedDate: '2026-10-02',
    status: 'Pending',
    notes: 'Remaining supply: 8 days. BP controlled at home. Requesting 30-day renewal.'
  }
]

export const patientMedicalRecords = {
  allergies: [
    {
      id: 'alg-1',
      allergen: 'Penicillin & Beta-Lactams',
      severity: 'Severe',
      reaction: 'Anaphylaxis & generalized urticaria',
      diagnosedYear: '2019',
      verifiedBy: 'Dr. John Smith'
    },
    {
      id: 'alg-2',
      allergen: 'Sulfa Antibiotics',
      severity: 'Moderate',
      reaction: 'Erythematous rash & pruritus',
      diagnosedYear: '2016',
      verifiedBy: 'Dr. Marcus Vance'
    }
  ],
  chronicConditions: [
    {
      id: 'cnd-1',
      condition: 'Essential Hypertension',
      icd10: 'I10',
      diagnosedDate: '2021-06-15',
      status: 'Controlled',
      doctor: 'Dr. John Smith',
      managementPlan: 'Amlodipine 5mg once daily + DASH dietary regimen.'
    },
    {
      id: 'cnd-2',
      condition: 'Mild Hypercholesterolemia',
      icd10: 'E78.0',
      diagnosedDate: '2023-01-10',
      status: 'Monitored (Diet-managed)',
      doctor: 'Dr. John Smith',
      managementPlan: 'Aerobic exercise 150 min/week and low saturated fat.'
    }
  ],
  vaccinations: [
    { id: 'vax-1', name: 'COVID-19 Bivalent Booster', date: '2024-11-10', provider: 'MediCare Central Clinic', batch: 'PFZ-BOOST-849' },
    { id: 'vax-2', name: 'Influenza (Annual Quadrivalent)', date: '2025-10-05', provider: 'Springfield Health Hub', batch: 'FLU-2025-Q4' },
    { id: 'vax-3', name: 'Tetanus, Diphtheria (Td Booster)', date: '2022-03-14', provider: 'City Health Dept', batch: 'TD-9912' },
    { id: 'vax-4', name: 'Hepatitis B (Complete 3-dose series)', date: '2018-08-20', provider: 'University Health', batch: 'HEP-B-SERIES' }
  ],
  surgeries: [
    { id: 'surg-1', procedure: 'Laparoscopic Appendectomy', date: '2016-09-18', hospital: 'Springfield Memorial', surgeon: 'Dr. R. Taylor, MD' }
  ],
  familyHistory: [
    { relation: 'Father', condition: 'Coronary Artery Disease, Hypertension', ageOnset: 54 },
    { relation: 'Mother', condition: 'Type 2 Diabetes Mellitus', ageOnset: 62 },
    { relation: 'Paternal Grandfather', condition: 'Ischemic Stroke', ageOnset: 71 }
  ],
  documents: [
    { id: 'doc-1', name: 'Cardiac_Echo_Report_2026.pdf', category: 'Cardiology', date: '2026-05-12', size: '2.4 MB', provider: 'MediCare Diagnostics' },
    { id: 'doc-2', name: 'Annual_Comprehensive_Lab_Panel_2025.pdf', category: 'Laboratory', date: '2025-12-18', size: '1.8 MB', provider: 'MediCare Central Labs' },
    { id: 'doc-3', name: 'Chest_XRay_Digital_Scan.pdf', category: 'Radiology', date: '2024-03-22', size: '4.1 MB', provider: 'Springfield Imaging Center' }
  ]
}

export const visitSummaries = [
  {
    id: 'vs-1',
    date: '2026-09-28',
    doctor: 'Dr. John Smith',
    specialty: 'Internal Medicine',
    hospital: 'MediCare Central Hospital',
    chiefComplaint: 'Quarterly hypertension and medication check',
    keyTakeaway: 'Blood pressure is well-regulated under your current dose of Amlodipine 5mg. Your cardiovascular and pulmonary checks were completely normal.',
    vitalsAtVisit: 'BP: 128/82 mmHg · Pulse: 74 bpm · Weight: 74.0 kg · SpO2: 98%',
    doctorNotes: 'Patient reports high adherence with no dizziness or peripheral edema. Fasting labs from Sep 10 reviewed — lipid and renal panels stable.',
    patientInstructions: [
      'Continue taking Amlodipine 5mg once daily every morning.',
      'Log your morning resting blood pressure at least twice a week.',
      'Maintain adequate hydration (2.5L water/day) and low-sodium meals.',
      'Next routine follow-up appointment scheduled for October 12, 2026.'
    ]
  },
  {
    id: 'vs-2',
    date: '2026-08-02',
    doctor: 'Dr. John Smith',
    specialty: 'Internal Medicine',
    hospital: 'MediCare Central Hospital',
    chiefComplaint: 'Mid-summer health review & prescription renewal',
    keyTakeaway: 'Physical exam unremarkable. Discussed cardiovascular prevention, seasonal exercise, and dietary fiber intake.',
    vitalsAtVisit: 'BP: 132/84 mmHg · Pulse: 76 bpm · Weight: 74.5 kg · SpO2: 98%',
    doctorNotes: 'BP slightly borderline. Advised reducing processed salt intake. Patient agreed to increase daily brisk walking.',
    patientInstructions: [
      'Amlodipine 5mg renewed for 60 days.',
      '30-minute brisk walk daily, 5 days per week.',
      'Scheduled comprehensive lipid and kidney panel for early September.'
    ]
  },
  {
    id: 'vs-3',
    date: '2026-05-18',
    doctor: 'Dr. John Smith',
    specialty: 'Pulmonology',
    hospital: 'MediCare Central Hospital',
    chiefComplaint: 'Post-exercise dry cough and mild seasonal tightness',
    keyTakeaway: 'Chest auscultation clear bilaterally with no wheezing or stridor. Peak expiratory flow rate normal (480 L/min). Preventive inhaler prescribed as needed.',
    vitalsAtVisit: 'BP: 124/80 mmHg · Pulse: 70 bpm · SpO2: 99% · Peak Flow: 480 L/m',
    doctorNotes: 'Mild reactive airway response post intense endurance exercise. Reassured patient; no structural lung disease.',
    patientInstructions: [
      'Use Albuterol HFA inhaler 2 puffs 15 minutes before vigorous cardio.',
      'Rinse mouth with water after inhaler use.',
      'Symptom journal maintained for 2 weeks.'
    ]
  },
  {
    id: 'vs-4',
    date: '2026-03-10',
    doctor: 'Dr. Marcus Vance',
    specialty: 'Otolaryngology',
    hospital: 'St. Jude Community Health Center',
    chiefComplaint: 'Nasal congestion and sneezing with tree pollen onset',
    keyTakeaway: 'Nasal mucosal inflammation consistent with allergic rhinitis. No secondary sinus infection detected.',
    vitalsAtVisit: 'BP: 126/80 mmHg · Pulse: 72 bpm · Temp: 98.4°F',
    doctorNotes: 'Prescribed Fluticasone nasal spray for 30 days. Advised allergen avoidance where practical.',
    patientInstructions: [
      'Use 2 sprays per nostril in the morning.',
      'Keep bedroom windows closed on high-pollen days.',
      'Symptoms resolved successfully after 3-week course.'
    ]
  }
]

export const patientLabTests = [
  {
    id: 'lab-1',
    testName: 'Comprehensive Metabolic & Lipid Panel',
    category: 'Biochemistry',
    date: '2026-09-10',
    orderingDoctor: 'Dr. John Smith',
    facility: 'MediCare Central Laboratory',
    status: 'Normal',
    analytes: [
      { name: 'Total Cholesterol', value: 182, unit: 'mg/dL', min: 125, max: 200, status: 'Normal' },
      { name: 'HDL Cholesterol', value: 48, unit: 'mg/dL', min: 40, max: 80, status: 'Normal' },
      { name: 'LDL Cholesterol', value: 108, unit: 'mg/dL', min: 0, max: 100, status: 'Borderline' },
      { name: 'Triglycerides', value: 122, unit: 'mg/dL', min: 0, max: 150, status: 'Normal' },
      { name: 'Fasting Blood Sugar', value: 94, unit: 'mg/dL', min: 70, max: 99, status: 'Normal' },
      { name: 'HbA1c', value: 5.4, unit: '%', min: 4.0, max: 5.6, status: 'Normal' },
      { name: 'Serum Creatinine', value: 0.94, unit: 'mg/dL', min: 0.70, max: 1.30, status: 'Normal' },
      { name: 'eGFR', value: 96, unit: 'mL/min/1.73m²', min: 60, max: 120, status: 'Normal' }
    ],
    doctorComment: 'Excellent glycemic and renal stability. LDL is minimally elevated (108); manageable via healthy diet.'
  },
  {
    id: 'lab-2',
    testName: 'Complete Blood Count (CBC) with Differential',
    category: 'Hematology',
    date: '2026-09-10',
    orderingDoctor: 'Dr. John Smith',
    facility: 'MediCare Central Laboratory',
    status: 'Normal',
    analytes: [
      { name: 'Hemoglobin', value: 15.2, unit: 'g/dL', min: 13.8, max: 17.2, status: 'Normal' },
      { name: 'RBC Count', value: 5.1, unit: 'M/uL', min: 4.5, max: 5.9, status: 'Normal' },
      { name: 'WBC Count', value: 6.8, unit: 'K/uL', min: 4.5, max: 11.0, status: 'Normal' },
      { name: 'Platelets', value: 245, unit: 'K/uL', min: 150, max: 450, status: 'Normal' },
      { name: 'Hematocrit', value: 45.4, unit: '%', min: 40.7, max: 50.3, status: 'Normal' }
    ],
    doctorComment: 'Hematocrit and red cell indices fully within expected reference ranges.'
  },
  {
    id: 'lab-3',
    testName: 'Thyroid Function Panel (TSH & Free T4)',
    category: 'Endocrinology',
    date: '2025-11-20',
    orderingDoctor: 'Dr. John Smith',
    facility: 'MediCare Central Laboratory',
    status: 'Normal',
    analytes: [
      { name: 'TSH', value: 2.14, unit: 'uIU/mL', min: 0.40, max: 4.20, status: 'Normal' },
      { name: 'Free T4', value: 1.28, unit: 'ng/dL', min: 0.80, max: 1.80, status: 'Normal' }
    ],
    doctorComment: 'Euthyroid profile confirmed. No signs of thyroid dysfunction.'
  }
]

export const notificationsData = {
  doctor: [
    { id: 'nd-1', title: 'Prescription Refill Requested', message: 'John Doe requested renewal for Amlodipine 5mg.', time: '10 mins ago', unread: true, link: '/doctor/dashboard' },
    { id: 'nd-2', title: 'New Patient Message', message: 'Sarah Wilson sent a message regarding her inhaler dosage.', time: '35 mins ago', unread: true, link: '/doctor/messages' },
    { id: 'nd-3', title: 'Upcoming Consultation', message: 'Michael Brown scheduled in OPD Clinic 3 at 11:00 AM.', time: '1 hour ago', unread: false, link: '/doctor/consultations' },
  ],
  patient: [
    { id: 'np-1', title: 'Prescription Ready', message: 'Dr. John Smith finalized your prescription RX-1001.', time: '2 hours ago', unread: true, link: '/patient/prescriptions' },
    { id: 'np-2', title: 'Upcoming Clinic Appointment', message: 'In-person clinic review on Oct 12 at 10:30 AM with Dr. Smith.', time: '1 day ago', unread: true, link: '/patient/appointments' },
    { id: 'np-3', title: 'Lab Test Result Ready', message: 'Comprehensive Metabolic Panel results verified by Central Labs.', time: '3 days ago', unread: false, link: '/patient/lab-tests' },
  ],
  admin: [
    { id: 'na-1', title: 'Security Alert: IP Rate Limited', message: '5 failed login attempts blocked on IP 192.168.1.105.', time: '15 mins ago', unread: true, link: '/admin/system-logs' },
    { id: 'na-2', title: 'Physician Onboarding Application', message: 'Dr. Rachel Patel submitted credentials for license verification.', time: '1 hour ago', unread: true, link: '/admin/doctors' },
    { id: 'na-3', title: 'Nightly Backup Completed', message: 'Differential database snapshot successfully sealed.', time: '6 hours ago', unread: false, link: '/admin/system-logs' },
  ]
}
