import test from 'node:test'
import assert from 'node:assert/strict'
import { renderJob, renderList, renderPage } from '../lib/render.js'
import { tags } from '../lib/jobs.js'


test('renderJob escapes HTML', () => {
  const job = {
    title: '<b>Dev</b>',
    company: 'ACME & Co',
    location: 'NY <NY>',
    url: 'https://example.com'
  }
  const html = renderJob(job)
  assert.ok(html.includes('&lt;b&gt;Dev&lt;/b&gt;'))
  assert.ok(html.includes('ACME &amp; Co'))
  assert.ok(html.includes('NY &lt;NY&gt;'))
  assert.ok(html.includes('href="https://example.com"'))
})


test('renderList renders all jobs and count', () => {
  const jobs = [
    { title: 'A', company: 'B', location: 'C', url: 'https://a.com' },
    { title: 'D', company: 'E', location: 'F', url: 'https://d.com' }
  ]
  const html = renderList(jobs)
  assert.ok(html.trim().startsWith('<ol'))
  assert.ok(html.includes(renderJob(jobs[0])))
  assert.ok(html.includes(renderJob(jobs[1])))
  assert.ok(html.includes('2 jobs'))
})


test('renderPage includes content, query, csrf token and checked tag', () => {
  const content = '<p>body</p>'
  const q = 'search text'
  const selected = [tags[0]]
  const token = '123'
  const html = renderPage(content, q, selected, token)
  assert.ok(html.includes(content))
  assert.ok(html.includes(`value=\"${q}\"`))
  assert.ok(html.includes(`value=\"${token}\"`))
  assert.ok(html.includes('type="checkbox" checked'))
})
