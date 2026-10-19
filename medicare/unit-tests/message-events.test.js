import assert from 'node:assert/strict'
import test from 'node:test'
import { subscribeToMessageEvents } from '../src/services/api/messageEvents.js'

test('message stream refreshes on connect and message updates, then closes cleanly', () => {
  class FakeEventSource {
    static instance

    constructor(url, options) {
      this.url = url
      this.options = options
      this.listeners = new Map()
      this.closed = false
      FakeEventSource.instance = this
    }

    addEventListener(name, listener) {
      this.listeners.set(name, listener)
    }

    dispatch(name) {
      this.listeners.get(name)?.()
    }

    close() {
      this.closed = true
    }
  }

  let refreshes = 0
  const stop = subscribeToMessageEvents('/api/messages/events', () => refreshes++, FakeEventSource)
  const stream = FakeEventSource.instance

  assert.equal(stream.url, '/api/messages/events')
  assert.equal(stream.options.withCredentials, true)
  stream.dispatch('open')
  stream.dispatch('message-updated')
  assert.equal(refreshes, 2)

  stop()
  assert.equal(stream.closed, true)
})

test('notification stream listens for notification updates', () => {
  class FakeEventSource {
    static instance
    constructor() { this.listeners = new Map(); FakeEventSource.instance = this }
    addEventListener(name, listener) { this.listeners.set(name, listener) }
    dispatch(name) { this.listeners.get(name)?.() }
    close() {}
  }
  let refreshes = 0

  subscribeToMessageEvents('/api/messages/events', () => refreshes++, FakeEventSource, 'notification-updated')
  FakeEventSource.instance.dispatch('notification-updated')

  assert.equal(refreshes, 1)
})