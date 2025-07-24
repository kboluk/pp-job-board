import express from 'express'
import cookieParser from 'cookie-parser'
import { rateLimit } from 'express-rate-limit'
import helmet from 'helmet'
import { csrfSync } from 'csrf-sync'
import { normalizeTag } from './lib/util.js'
import { renderPage, renderList } from './lib/render.js'
import { jobs, filterJobs } from './lib/jobs.js'
import { createSession, getSession, updateFilter, attachStream } from './lib/sessions.js'

const isProd = process.env.NODE_ENV === 'production'

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

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  standardHeaders: 'draft-8', // use combined `RateLimit` header
  legacyHeaders: true // add legacy headers for compatibility
})

const app = express()
app.use(cookieParser())
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      'default-src': ["'self'"],
      'connect-src': ["'self'"],
      'script-src': ["'self'"],
      'object-src': ["'none'"],
      'base-uri': ["'none'"],
      'form-action': ["'self'"]
    }
  }
}))
app.use(limiter)
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(express.static('public', { fallthrough: true }))

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
    res.cookie('sid', sid, { httpOnly: true, sameSite: 'strict', secure: isProd })
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
  const selectedTags = normalizeTag(tag)

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
