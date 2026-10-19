import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { RequireRole, HomeRedirect } from './routes/guards'
import { DoctorLayout, PatientLayout, AdminLayout } from './components/layout/AppLayout'
import Login from './pages/auth/Login'
import { Forbidden, NotFound, ModuleStub } from './pages/shared/Misc'
import AccountPage from './pages/shared/AccountPage'
import DoctorDashboard from './pages/doctor/Dashboard'
import Patients from './pages/doctor/Patients'
import PatientDetail from './pages/doctor/PatientDetail'
import Prescriptions from './pages/doctor/Prescriptions'
import PrescriptionEditor from './pages/doctor/PrescriptionEditor'
import Consultations from './pages/doctor/Consultations'
import ConsultationDetail from './pages/doctor/ConsultationDetail'
import DoctorReports from './pages/doctor/Reports'
import DoctorMessages from './pages/doctor/Messages'
import DoctorSettings from './pages/doctor/Settings'

// Patient Portal Pages
import PatientDashboard from './pages/patient/Dashboard'
import PatientPrescriptions from './pages/patient/Prescriptions'
import PatientMedicalRecords from './pages/patient/MedicalRecords'
import PatientVisitSummaries from './pages/patient/VisitSummaries'
import PatientLabTests from './pages/patient/LabTests'
import PatientAppointments from './pages/patient/Appointments'
import PatientMedicineReminders from './pages/patient/MedicineReminders'
import PatientMessages from './pages/patient/Messages'
import PatientProfile from './pages/patient/Profile'
import PatientSettings from './pages/patient/Settings'

// Admin Portal Pages
import AdminDashboard from './pages/admin/Dashboard'
import AdminDoctors from './pages/admin/Doctors'
import AdminPatients from './pages/admin/Patients'
import AdminHospitals from './pages/admin/Hospitals'
import AdminPrescriptions from './pages/admin/Prescriptions'
import AdminReports from './pages/admin/Reports'
import AdminSystemLogs from './pages/admin/SystemLogs'
import AdminSettings from './pages/admin/Settings'
import OcrTraining from './pages/tools/OcrTraining'

export default function App() {
  return <BrowserRouter><AuthProvider><ToastProvider><Routes>
    <Route path="/" element={<HomeRedirect />} />
    <Route path="/login" element={<Login />} />
    <Route path="/ocr-training" element={<OcrTraining />} />
    <Route path="/forbidden" element={<Forbidden />} />
    <Route element={<RequireRole role="ROLE_DOCTOR" />}><Route path="/doctor" element={<DoctorLayout />}>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<DoctorDashboard />} />
      <Route path="patients" element={<Patients />} /><Route path="patients/:patientId" element={<PatientDetail />} />
      <Route path="consultations" element={<Consultations />} /><Route path="consultations/:consultationId" element={<ConsultationDetail />} />
      <Route path="prescriptions" element={<Prescriptions />} /><Route path="prescriptions/new" element={<PrescriptionEditor />} /><Route path="prescriptions/:prescriptionId" element={<PrescriptionEditor />} />
      <Route path="ai-tools" element={<Navigate to="/doctor/prescriptions/new" replace />} />
      <Route path="reports" element={<DoctorReports />} />
      <Route path="messages" element={<DoctorMessages />} />
      <Route path="profile" element={<AccountPage />} />
      <Route path="settings" element={<DoctorSettings />} />
    </Route></Route>
    <Route element={<RequireRole role="ROLE_PATIENT" />}><Route path="/patient" element={<PatientLayout />}>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<PatientDashboard />} />
      <Route path="prescriptions" element={<PatientPrescriptions />} />
      <Route path="medical-records" element={<PatientMedicalRecords />} />
      <Route path="visit-summaries" element={<PatientVisitSummaries />} />
      <Route path="lab-tests" element={<PatientLabTests />} />
      <Route path="appointments" element={<PatientAppointments />} />
      <Route path="medicine-reminders" element={<PatientMedicineReminders />} />
      <Route path="messages" element={<PatientMessages />} />
      <Route path="profile" element={<PatientProfile />} />
      <Route path="account" element={<Navigate to="/patient/profile" replace />} />
      <Route path="settings" element={<PatientSettings />} />
    </Route></Route>
    <Route element={<RequireRole role="ROLE_ADMIN" />}><Route path="/admin" element={<AdminLayout />}>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<AdminDashboard />} />
      <Route path="doctors" element={<AdminDoctors />} />
      <Route path="patients" element={<AdminPatients />} />
      <Route path="hospitals" element={<AdminHospitals />} />
      <Route path="prescriptions" element={<AdminPrescriptions />} />
      <Route path="reports" element={<AdminReports />} />
      <Route path="system-logs" element={<AdminSystemLogs />} />
      <Route path="settings" element={<AdminSettings />} />
      <Route path="profile" element={<AccountPage />} />
    </Route></Route>
    <Route path="*" element={<NotFound />} />
  </Routes></ToastProvider></AuthProvider></BrowserRouter>
}
