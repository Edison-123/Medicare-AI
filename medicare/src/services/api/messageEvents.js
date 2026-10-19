export function subscribeToMessageEvents(url, onUpdate, EventSourceType, eventName = 'message-updated') {
  const stream = new EventSourceType(url, { withCredentials: true })
  stream.addEventListener('open', onUpdate)
  stream.addEventListener(eventName, onUpdate)
  return () => stream.close()
}