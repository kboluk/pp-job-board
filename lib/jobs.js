export const jobs = [
  {
    title: 'bla',
    company: 'blala',
    location: 'remote',
    url: 'google.com',
    tags: ['remote', 'dev']
  }
]

export const tags = ['remote', 'dev']

export const filterJobs = (text, selectedTags) => {
  return jobs
    .filter(j => text
      ? j.title.toLowerCase().includes(text.toLowerCase()) ||
        j.company.toLowerCase().includes(text.toLowerCase()) ||
        j.location.toLowerCase().includes(text.toLowerCase())
      : true)
    .filter(j => selectedTags.length ? selectedTags.some(tag => j.tags.includes(tag)) : true)
}
