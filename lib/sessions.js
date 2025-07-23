import { EventEmitter } from 'node:events'
import { randomUUID } from 'node:crypto'

const sessions = new Map()

setInterval(() => {
  const clear = []
  const cutOff = Date.now()
  sessions.forEach((val, key) => {
    if (val.lastSeen < cutOff) clear.push(key)
  })
  clear.forEach(key => {
    const session = sessions.get(key)
    try {
      if (session.stream) {
        session.stream.end()
      }
    } catch (e) {
      console.error(e)
    }
    sessions.delete(key)
  })
}, 15 * 60 * 1000)

export function createSession () {
  const id = randomUUID()
  sessions.set(id, { filter: {}, bus: new EventEmitter(), csrfToken: null, stream: null, lastSeen: Date.now() + 1000 * 60 * 60 })
  return id
}

export function getSession (id) {
  const session = sessions.get(id)
  if (!session) return
  session.lastSeen = Date.now() + 1000 * 60 * 60
  return session
}

export function updateFilter (id, newFilter) {
  const s = sessions.get(id)
  if (!s) return
  s.filter = newFilter
  s.bus.emit('update') // notify connected SSE stream
}

export function attachStream (id, res) { // res is the Express response for SSE
  const s = sessions.get(id)
  if (!s) return
  s.stream = res
  const interval = setInterval(() => {
    if (s.stream) {
      try {
        s.stream.write('event: ping\n')
        s.stream.write('data: ping\n\n')
        s.lastSeen = Date.now() + 1000 * 60 * 60
      } catch (e) {
        console.error(e)
      }
    }
  }, 15000)
  res.on('close', () => {
    clearInterval(interval)
    s.stream = null
  })
}
