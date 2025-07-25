import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  jobs,
  tags,
  filterJobs,
  addLcFields,
  REQUIRED,
  jobIsValid
} from '../lib/jobs.js'

test('jobs array length', () => {
  assert.equal(jobs.length, 10)
})

test('jobs contain lowercase helper fields', () => {
  for (const j of jobs) {
    assert.equal(j.titleLC, j.title.toLowerCase())
    assert.equal(j.companyLC, j.company.toLowerCase())
    assert.equal(j.locationLC, j.location.toLowerCase())
  }
})

test('addLcFields augments a job correctly', () => {
  const sample = { title: 'X', company: 'Y', location: 'Z' }
  const result = addLcFields(sample)
  assert.equal(result.titleLC, 'x')
  assert.equal(result.companyLC, 'y')
  assert.equal(result.locationLC, 'z')
})

test('REQUIRED field list is as expected', () => {
  assert.deepEqual(REQUIRED, ['id', 'title', 'company', 'location', 'url', 'tags'])
})

test('tags are unique and sorted', () => {
  const sorted = [...tags].sort()
  assert.deepEqual(tags, sorted)
  const set = new Set(tags)
  assert.equal(set.size, tags.length)
})

test('filterJobs returns all jobs without filters', () => {
  assert.equal(filterJobs().length, jobs.length)
})

test('filterJobs matches text case-insensitively', () => {
  const results = filterJobs('austin')
  assert.equal(results.length, 1)
  assert.equal(results[0].location, 'Austin, TX')
})

test('filterJobs filters by tag', () => {
  const results = filterJobs('', ['Remote'])
  assert.ok(results.length > 0)
  for (const r of results) assert.ok(r.tags.includes('Remote'))
})

test('filterJobs applies both text and tag filters', () => {
  const results = filterJobs('engineer', ['Full-Time'])
  assert.deepEqual(results.map(r => r.title), [
    'Senior Front-End Engineer',
    'DevOps Engineer',
    'Backend Engineer - Go'
  ])
})

test('jobIsValid accepts a well-formed job', () => {
  const job = {
    id: '1',
    title: 'Engineer',
    company: 'ACME',
    location: 'Remote',
    url: 'https://example.com',
    tags: ['Remote']
  }
  assert.equal(jobIsValid(job), true)
})

test('jobIsValid rejects missing fields', () => {
  const job = {
    id: '1',
    title: 'Engineer',
    company: 'ACME',
    location: 'Remote',
    tags: ['Remote']
  }
  assert.equal(jobIsValid(job), false)
})

test('jobIsValid rejects malformed values', () => {
  const job = {
    id: '1',
    title: 'Engineer',
    company: 'ACME',
    location: 'Remote',
    url: 'https://example.com',
    tags: 'Remote'
  }
  assert.equal(jobIsValid(job), false)
})

test('jobIsValid rejects unsupported protocols', () => {
  const job = {
    id: '1',
    title: 'Engineer',
    company: 'ACME',
    location: 'Remote',
    url: 'ftp://example.com',
    tags: ['Remote']
  }
  assert.equal(jobIsValid(job), false)
})

test('jobs array is built using jobIsValid', () => {
  const __dirnameLocal = dirname(fileURLToPath(import.meta.url))
  const dataPath = join(__dirnameLocal, '../data/jobs.sample.json')
  const { jobs: raw } = JSON.parse(readFileSync(dataPath, 'utf8'))
  const expected = raw.filter(jobIsValid).map(addLcFields)
  assert.deepEqual(jobs, expected)
})
