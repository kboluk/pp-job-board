import { escape } from 'html-escaper'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { tags } from './jobs.js'

const chotaDist = readFileSync('node_modules/chota/dist/chota.min.css')
const sri = 'sha384-' + createHash('sha384').update(chotaDist).digest('base64')

export const renderJob = j => `
<article class="card">
  <h2>${escape(j.title)}</h2>
  <p>${escape(j.company)} — ${escape(j.location)}</p>
  <a class="button primary" href="${escape(j.url)}" rel="noopener noreferrer">Apply</a>
</article>`

const listItem = content => `<li class="col-12 sm-6 lg-4">${content}</li>`

const renderForm = (q, selectedTags = [], csrfToken) => `
  <form id="search" method="POST" action="${escape('/search')}">
      <div class="row">
        <div class="col-4">
          <fieldset>
            <legend>Search Jobs</legend>
                <label><input name="q" type="search" value="${escape(q)}" /> Search in title, location or company name</label>
          </fieldset>
        </div>
        <div class="col-4">
          <fieldset>
            <legend id="tag-group">Filter with Tags</legend>
                <ul class="is-paddingless" role="group" aria-labelledby="tag-group">
                  ${tags.map(tag =>
                    `<li>
                      <label
                        for="tag-${escape(tag).replace(/\\W+/g, '-')}">
                        <input
                          name="tag"
                          id="tag-${escape(tag).replace(/\\W+/g, '-')}"
                          type="checkbox"${selectedTags.includes(tag) ? ' checked' : ''}
                          value="${escape(tag)}" />
                        ${escape(tag)}
                      </label>
                    </li>`
                  ).join('')}
                </ul>
          </fieldset>
        </div>
        <div class="col-4 is-vertical-align">
          <button class="button primary" type="submit">Search</button>
        </div>
      </div>
    
    <input type="hidden" name="_csrf" value="${csrfToken}" />
    
  </form>
`

export const renderList = jobs => `
  <ol id="results" class="row is-paddingless">
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
      <style>
        ol, ul {
          list-style-type: none;
        }
      </style>
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
      ${content}
      </div>
      <script src="${escape('/app.js')}"></script>
    </body>
  </html>
`
