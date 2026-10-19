import assert from 'node:assert/strict'
import test from 'node:test'
import { autoStartRecordingIfEnabled } from '../src/pages/doctor/recordingPreferences.js'

test('auto-start preference starts recording for scheduled consultations', () => {
  let starts = 0

  const started = autoStartRecordingIfEnabled('Scheduled', true, () => starts++)

  assert.equal(started, true)
  assert.equal(starts, 1)
})

test('auto-start preference leaves recording manual when disabled', () => {
  let starts = 0

  const started = autoStartRecordingIfEnabled('Scheduled', false, () => starts++)

  assert.equal(started, false)
  assert.equal(starts, 0)
})

test('auto-start preference does not start for an in-progress consultation', () => {
  let starts = 0

  const started = autoStartRecordingIfEnabled('In Progress', true, () => starts++)

  assert.equal(started, false)
  assert.equal(starts, 0)
})