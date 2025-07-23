import { escape } from 'html-escaper'
import { tags } from './jobs.js'

export const renderJob = j => `
<article class="job">
  <h2>${escape(j.title)}</h2>
  <p>${escape(j.company)} — ${escape(j.location)}</p>
  <a class="btn" href="${escape(j.url)}" rel="noopener noreferrer">Apply</a>
</article>`

const listItem = content => `<li>${content}</li>`

const renderForm = (q, selectedTags = [], csrfToken) => `
  <form id="search" method="POST" action="${escape('/search')}">
    <label for="q"><input name="q" id="q" value="${escape(q)}" /> Search in title, location or company name</label>
    ${tags.map(tag =>
      `<label for="tag-${escape(tag)}"><input name="tag" id="tag-${escape(tag)}" type="checkbox"${selectedTags.includes(tag) ? ' checked' : ''} value="${escape(tag)}" /> ${escape(tag)}</label>`
    ).join('')}
    <input type="hidden" name="_csrf" value="${csrfToken}" />
    <button type="submit">Search</button>
  </form>
`

export const renderList = jobs => `
  <ol id="results">
    ${jobs.map(renderJob).map(listItem)}
  </ol>
  <p id="count">${jobs.length}</p>
`

export const renderPage = (content, q = '', selectedTags = [], csrfToken) => `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <title>Progressive Enhancement Demo</title>
      <link rel="stylesheet" href="${escape('/reset.css')}" />
      <link rel="stylesheet" href="${escape('/style.css')}" />
    </head>
    <body>
      ${renderForm(q, selectedTags, csrfToken)}
      ${content}
      <script src="${escape('/app.js')}"></script>
    </body>
  </html>
`
