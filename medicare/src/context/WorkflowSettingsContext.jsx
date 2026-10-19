import { createContext } from 'react'

export const DEFAULT_WORKFLOW_SETTINGS = Object.freeze({
  patientAppointmentBookingEnabled: true,
  patientMessagingEnabled: true
})

export const WorkflowSettingsContext = createContext(DEFAULT_WORKFLOW_SETTINGS)