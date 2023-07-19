const { get } = require('./index')
const detectionsDao = require('../../detections/dao/index')
const classifierOutputsDao = require('../../classifiers/dao/outputs')
const { DetectionReview } = require('../../_models')

async function getResults (id, options = {}) {
  const job = await get(id, { ...options, fields: ['query_start', 'query_end', 'classifier_id'] })

  const detections = await detectionsDao.query({
    // TODO: replace it with job.queryStreams once we change queryStreams from names to ids
    projects: [job.projectId],
    start: `${job.queryStart}T00:00:00.000Z`,
    end: `${job.queryEnd}T23:59:59.999Z`,
    classifierJobs: [id]
  }, {
    user: options.user,
    fields: ['review_status', 'updated_at']
  })
  const reviewStatus = {
    total: detections.length,
    rejected: 0,
    uncertain: 0,
    confirmed: 0
  }
  let classificationsSummary
  if (options.fields.includes('classifications_summary')) {
    const classifierOuputs = (await classifierOutputsDao.query({ classifiers: [job.classifierId] }, { fields: ['classification'] })).results
    classificationsSummary = classifierOuputs.reduce((acc, cur) => {
      acc[cur.classification.value] = {
        value: cur.classification.value,
        title: cur.classification.title,
        image: cur.classification.image,
        total: 0
      }
      return acc
    }, {})
  }
  detections.forEach(d => {
    const mappedStatus = DetectionReview.statusMapping[`${d.review_status}`]
    if (reviewStatus[mappedStatus] !== undefined) {
      reviewStatus[mappedStatus]++
    }
    if (options.fields.includes('classifications_summary')) {
      if (classificationsSummary[d.classification.value] && d.review_status === 1) {
        classificationsSummary[d.classification.value].total++
      }
    }
  })

  const result = { reviewStatus }
  if (options.fields.includes('classifications_summary')) {
    result.classificationsSummary = Object.values(classificationsSummary)
  }

  return result
}

module.exports = {
  getResults
}
