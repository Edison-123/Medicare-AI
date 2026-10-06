/**
 * Provider-agnostic AI contracts. UI code only talks to these two interfaces.
 *
 *  SpeechToTextService.transcribe(audioBlob, { consultationId }) -> { text, provider, confidence }
 *  LLMService.summarize({ transcript, notes })                   -> { fields:{...}, provider, confidence }
 *
 * Real implementations call Spring Boot (POST /api/ai/transcription, POST /api/ai/summary), which in turn
 * delegates to Whisper / Llama 3 / GPT-4. API keys never reach the browser.
 */
import { USE_MOCK, http } from '../api/client'
import { getToken } from '../auth/session'

const wait = ms => new Promise(r => setTimeout(r, ms))

const mockStt = {
  async transcribe() {
    await wait(1800)
    return { provider:'mock-whisper', confidence:0.94, text:
`Doctor: What brings you in today?
Patient: I've been waking up at night short of breath for about a week, with some wheezing.
Doctor: Any fever or cough?
Patient: A dry cough in the mornings, no fever. I've used my inhaler more than usual.
Doctor: Chest is clear on auscultation, mild expiratory wheeze. Let's adjust your inhaler plan and add a peak flow check.
Doctor: Come back in two weeks, sooner if it gets worse.` }
  },
}
const mockLlm = {
  async suggestPrescription() {
    await wait(1300)
    return { provider:'mock-llm', items:[{ name:'Salbutamol inhaler', strength:'100 mcg/dose', dosage:'2 puffs', frequency:'As needed', duration:'14 days',
      route:'Inhaled', food:'Any', instructions:'Use when wheezy. Maximum 8 puffs in 24 hours.' }] }
  },
  async summarize() {
    await wait(1500)
    return { provider:'mock-llm', confidence:0.9, fields:{
      chiefComplaint:'Night-time shortness of breath for about one week',
      symptoms:'Nocturnal dyspnoea, wheeze, dry morning cough. No fever. Increased reliever inhaler use.',
      diagnosis:'Suspected poorly controlled asthma',
      medications:'Review inhaler regimen (doctor to specify drug and dose)',
      investigations:'Peak flow measurement',
      plan:'Adjust inhaler plan; peak flow monitoring.',
      followUp:'Review in 2 weeks, earlier if symptoms worsen' } }
  },
}
const remoteStt = { async transcribe(blob, meta) {
  const fd = new FormData(); fd.append('file', blob); fd.append('consultationId', meta?.consultationId)
  const r = await fetch('/api/ai/transcription', { method:'POST', body:fd, headers:{ Authorization:`Bearer ${getToken()}` } })
  if (!r.ok) throw new Error('Transcription failed'); return r.json() } }
const remoteLlm = {
  suggestPrescription: body => http('/ai/prescription', { method:'POST', body, token:getToken() }), summarize: body => http('/ai/summary', { method:'POST', body, token:getToken() }) }

const mockOcr = { async recognize() {
  await wait(1200)
  return { provider:'mock-ocr', confidence:0.88, text:'Salbutamol inhaler 2 puffs PRN\nPeak flow chart - daily\nReview after 2 weeks' } } }
const remoteOcr = { async recognize(image, meta) { return http('/ai/ocr', { method:'POST', body:{ image, ...meta }, token:getToken() }) } }

export const ocr = USE_MOCK ? mockOcr : remoteOcr // OCRService.recognize(imageDataUrl) -> { text, provider, confidence }
export const speechToText = USE_MOCK ? mockStt : remoteStt
export const llm = USE_MOCK ? mockLlm : remoteLlm
export const AUDIO_RULES = { maxBytes: 25 * 1024 * 1024, types: ['audio/webm', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/ogg'] }
export function validateAudio(file) { // UX check only; the server must validate type and size again
  if (!AUDIO_RULES.types.includes(file.type)) return 'Unsupported audio format. Use WebM, MP3, WAV, M4A or OGG.'
  if (file.size > AUDIO_RULES.maxBytes) return 'Audio file is larger than 25 MB.'
  return null
}
