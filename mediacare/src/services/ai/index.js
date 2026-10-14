/**
 * Provider-agnostic AI contracts. UI code only talks to these interfaces.
 *
 *  SpeechToTextService.transcribe(audioBlob, { consultationId }) -> { text, provider, confidence }
 *  OCRService.recognize(imageDataUrl) -> { text, provider, confidence }
 *  LLMService.summarize({ transcript, notes }) -> { fields:{...}, provider, confidence }
 *
 * The frontend keeps AI calls browser-side where possible to avoid depending on the removed backend endpoints.
 */
import { http, multipart } from '../api/client'
import { getToken } from '../auth/session'

const normalizeClinicalText = text => {
  if (!text || typeof text !== 'string') return ''

  const replacements = [
    [/\bspo2\b/gi, 'SpO2'],
    [/\bbp\b/gi, 'BP'],
    [/\bhr\b/gi, 'HR'],
    [/\btemp\b/gi, 'Temp'],
    [/\bmeds\b/gi, 'medications'],
    [/\bmed\b/gi, 'med'],
    [/\bqday\b/gi, 'daily'],
    [/\bqd\b/gi, 'daily'],
    [/\bqid\b/gi, 'four times daily'],
    [/\bbid\b/gi, 'twice daily'],
    [/\btds\b/gi, 'three times daily'],
    [/\bprn\b/gi, 'PRN'],
    [/\bpo\b/gi, 'PO'],
    [/\biv\b/gi, 'IV'],
    [/\bim\b/gi, 'IM'],
    [/\bmg\b/gi, 'mg'],
    [/\bml\b/gi, 'mL'],
    [/\bmcg\b/gi, 'mcg'],
    [/\bpt\b/gi, 'pt'],
    [/\btx\b/gi, 'treatment'],
    [/\s{2,}/g, ' '],
    [/\n{3,}/g, '\n\n'],
    [/\s+([.,;:!?])/g, '$1'],
    [/([a-z])\s*\n\s*([a-z])/gi, '$1 $2']
  ]

  let cleaned = text
  for (const [pattern, replacement] of replacements) {
    cleaned = cleaned.replace(pattern, replacement)
  }

  return cleaned.trim()
}

const remoteStt = { transcribe: (blob, meta = {}) => multipart('/ai/transcription', {
  file: blob,
  fields: { consultationId: meta.consultationId },
  token: getToken()
}) }
const remoteLlm = {
  suggestPrescription: body => http('/ai/prescription', { method:'POST', body, token:getToken() }), summarize: body => http('/ai/summary', { method:'POST', body, token:getToken() }) }

const remoteOcr = {
  async recognize(image, meta = {}) {
    if (typeof image !== 'string' || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(image)) {
      throw new Error('The writing pad did not produce a valid handwriting image. Please write again and retry.')
    }
    return http('/ai/ocr', { method: 'POST', body: { image, ...meta }, token: getToken() })
  }
}

export const ocr = remoteOcr // OCRService.recognize(imageDataUrl) -> { text, provider, confidence }
export const normalizeHandwrittenText = normalizeClinicalText
export const speechToText = remoteStt
export const llm = remoteLlm
export const AUDIO_RULES = { maxBytes: 25 * 1024 * 1024, types: ['audio/webm', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/ogg'] }
export function validateAudio(file) { // UX check only; the server must validate type and size again
  if (!AUDIO_RULES.types.includes(file.type)) return 'Unsupported audio format. Use WebM, MP3, WAV, M4A or OGG.'
  if (file.size > AUDIO_RULES.maxBytes) return 'Audio file is larger than 25 MB.'
  return null
}
