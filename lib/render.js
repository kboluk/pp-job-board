import { escape } from 'html-escaper'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tags } from './jobs.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const chotaPath = join(__dirname, '../node_modules/chota/dist/chota.min.css')
const chotaDist = readFileSync(chotaPath)
const sri = 'sha384-' + createHash('sha384').update(chotaDist).digest('base64')

export const renderJob = j => `
<article class="card">
  <h2>${escape(j.title)}</h2>
  <p>${escape(j.company)} — ${escape(j.location)}</p>
  <a class="button primary" href="${escape(j.url)}" rel="noopener noreferrer">Apply</a>
</article>`

const listItem = content => `<li class="col-12 col-6-md col-4-lg">${content}</li>`

const renderForm = (q, selectedTags = [], csrfToken) => `
  <form id="search" method="POST" action="${escape('/search')}">
    <fieldset>
      <legend>Search Jobs</legend>
      <label><input name="q" type="search" value="${escape(q)}" /> Search in title, location or company name</label>
    </fieldset>
    <fieldset>
      <legend id="tag-group">Filter with Tags</legend>
      <ul class="tag-list" role="group" aria-labelledby="tag-group">
        ${tags.map((tag, idx) => {
          const tagId = `tag-${idx}`
          const escapedTag = escape(tag)
          return `
          <li>
            <label
              for="${tagId}">
              <input
                name="tag"
                id="${tagId}"
                type="checkbox"${selectedTags.includes(tag) ? ' checked' : ''}
                value="${escapedTag}" />
              ${escapedTag}
            </label>
          </li>`
        }
        ).join('')}
      </ul>
    </fieldset>
    <button class="button primary" type="submit">Search</button>
    <input type="hidden" name="_csrf" value="${csrfToken}" />
  </form>
`

export const renderList = jobs => `
  <ol class="row is-paddingless">
    ${jobs.map(renderJob).map(listItem).join('')}
  </ol>
  <p id="count" aria-live="polite">${jobs.length} job${jobs.length === 1 ? '' : 's'}</p>
`

export const renderPage = (content, q = '', selectedTags = [], csrfToken) => `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <title>Progressive Enhancement Demo</title>
      <link rel="stylesheet" href="https://unpkg.com/chota@0.9.2/dist/chota.min.css" integrity="${sri}" crossorigin="anonymous">
      <link rel="stylesheet" href="/style.css">
    </head>
    <body>
      <div class="container">
      <article>
          <header>
            <h1>Progressively Enhanced Job Board</h1>
          </header>
          <div>
            <p>This demo will showcase how to implement progressively enhanced features driven by server-side logic. The users will have access to baseline features whether they have javascript enabled or not. Those that allow javascript to run will have access to additional QOL features.</p>
          </div>
      </article>    
      ${renderForm(q, selectedTags, csrfToken)}
      <hr />
      <section id="results">
      ${content}
      </section>
      </div>
      <script src="${escape('/app.js')}"></script>
    </body>
  </html>
`
