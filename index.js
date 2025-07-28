import express from 'express'
import cookieParser from 'cookie-parser'
import { csrfSync } from 'csrf-sync'
import { renderPage, renderList } from './lib/render.js'
import { jobs, filterJobs } from './lib/jobs.js'
import { createSession, getSession, updateFilter, attachStream } from './lib/sessions.js'

const {
  generateToken,
  csrfSynchronisedProtection
} = csrfSync({
  getTokenFromState: (req) => {
    return getSession(req.cookies.sid)?.csrfToken
  },
  getTokenFromRequest: (req) => {
    if (req.is('application/x-www-form-urlencoded')) {
      return req.body._csrf
    }
    return req.headers['x-csrf-token']
  },
  storeTokenInState: (req, token) => {
    const sid = req.cookies.sid || req.sid
    const session = getSession(sid)
    if (session) {
      session.csrfToken = token
    }
  }
})

const app = express()
app.set('trust proxy', true)
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// ———————————————————————————————
// 1.  Home page – issues a session cookie if absent
// ———————————————————————————————
app.get('/', (req, res) => {
  let sid = req.cookies.sid
  if (!sid || !getSession(sid)) {
    sid = createSession()
    req.sid = sid
    // force creating the csrf token on session init so it doesn't try to read from state
    generateToken(req, true)
    res.cookie('sid', sid, { httpOnly: true, sameSite: 'strict', secure: true })
  }

  const html = renderPage(renderList(jobs), undefined, undefined, getSession(sid).csrfToken) // initial page
  res.type('html').send(html)
})

// ———————————————————————————————
// 2.  Search endpoint
//     • JS disabled  → returns HTML (normal <form> behaviour)
//     • JS enabled   → body: {q, tag}, responds 204, SSE will push results
// ———————————————————————————————
app.all('/search', csrfSynchronisedProtection, (req, res) => {
  const sid = req.cookies.sid
  if (!sid || !getSession(sid)) return res.status(400).send('Bad session')

  const { q = '', tag } = req.body
  let selectedTags = tag || []
  if (tag && typeof tag === 'string') selectedTags = [tag]

  // ----- JS‑enhanced path
  if (req.is('json')) {
    updateFilter(sid, { q, selectedTags })
    return res.status(204).end() // no payload
  }

  // ----- Non‑JS form path
  const subset = filterJobs(q, selectedTags)
  const html = renderPage(renderList(subset), q, selectedTags, getSession(sid).csrfToken)
  res.type('html').send(html)
})

// ———————————————————————————————
// 3.  SSE endpoint – streams results whenever filter changes
// ———————————————————————————————
app.get('/events', (req, res) => {
  const sid = req.cookies.sid
  const sess = getSession(sid)
  if (!sess) return res.status(400).end()

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  })
  res.flushHeaders()

  attachStream(sid, res) // ↙ keep reference in session

  // immediately push current filter’s result set
  pushResults()

  function pushResults () {
    const { q = '', selectedTags = [] } = sess.filter
    const subset = filterJobs(q, selectedTags)
    const payload = {
      html: renderList(subset),
      count: subset.length
    }
    res.write('event: results\n')
    res.write(`data: ${JSON.stringify(payload)}\n\n`)
  }

  sess.bus.on('update', pushResults)
  res.on('close', () => sess.bus.off('update', pushResults))
})

app.use((err, req, _, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    console.warn('CSRF validation failed', { sid: req.cookies.sid, ip: req.ip })
  }
  next(err)
})

app.listen(process.env.PORT ?? 3000)
