export function autoStartRecordingIfEnabled(status, enabled, startRecording) {
  if (status !== 'Scheduled' || enabled !== true) return false
  void startRecording()
  return true
}