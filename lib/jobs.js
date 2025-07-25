import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataPath = join(__dirname, '../data/jobs.sample.json')
const { jobs: rawJobs } = JSON.parse(readFileSync(dataPath, 'utf8'))

export const REQUIRED = ['id', 'title', 'company', 'location', 'url', 'tags']

export const addLcFields = job => ({
  ...job,
  titleLC: job.title.toLowerCase(),
  companyLC: job.company.toLowerCase(),
  locationLC: job.location.toLowerCase()
})

export const jobIsValid = job => {
  try {
    const u = new URL(job.url)
    if (!/^https?:$/.test(u.protocol)) {
      console.warn(`Bad URL in job ${job.id}`)
      return false
    }
  } catch (e) {
    console.error(`Bad URL in job ${job.id}`, e)
    return false
  }
  const missingKeys = []
  const malformedKeys = []
  for (const k of REQUIRED) {
    if (!(k in job)) {
      missingKeys.push(k)
    } else {
      const isStringField = k !== 'tags'
      const ok = isStringField
        ? typeof job[k] === 'string'
        : Array.isArray(job.tags) && job.tags.every(t => typeof t === 'string')
      if (!ok) malformedKeys.push(k)
    }
  }
  if (missingKeys.length) {
    console.warn(`Missing key(s) ${missingKeys.join(', ')} in job ${job.id}`)
    return false
  }

  if (malformedKeys.length) {
    console.warn(`Malformed key(s) ${malformedKeys.join(', ')} in job ${job.id}`)
    return false
  }

  return true
}

export const jobs = rawJobs.filter(jobIsValid).map(addLcFields)

export const tags = [...new Set(jobs.flatMap(j => j.tags))].sort()

export const filterJobs = (text = '', selectedTags = []) => {
  const textLC = (text ?? '').toLowerCase()
  return jobs
    .filter(j => !text ||
      j.titleLC.includes(textLC) ||
      j.companyLC.includes(textLC) ||
      j.locationLC.includes(textLC)
    )
    .filter(j => selectedTags.length === 0 || selectedTags.some(tag => j.tags.includes(tag)))
}
