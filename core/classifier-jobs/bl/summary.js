const dao = require('../dao/summary')
const detectionsDao = require('../../detections/dao/index')
const classifierOutputsDao = require('../../classifiers/dao/outputs')
const { DetectionReview } = require('../../_models')
const { get } = require('./get')

async function updateSummary (id, options = {}) {
  const transaction = options.transaction
  const summary = await calcSummary(id, options)
  await dao.deleteJobSummary(id, { transaction })
  await dao.createJobSummary(summary, { transaction })
}

async function calcSummary (id, options = {}) {
  const job = await get(id, { ...options, fields: ['query_start', 'query_end', 'classifier_id', 'streams'] })

  const detections = await detectionsDao.query({
    streams: (job.streams || []).map(s => s.id),
    start: `${job.queryStart}T00:00:00.000Z`,
    end: `${job.queryEnd}T23:59:59.999Z`,
    minConfidence: 0,
    classifierJobs: [id]
  }, {
    user: options.user,
    fields: ['review_status', 'updated_at'],
    transaction: options.transaction
  })

  const classifierOuputs = (await classifierOutputsDao.query({
    classifiers: [job.classifierId]
  }, {
    fields: ['classification'],
    transaction: options.transaction
  })).results

  const classificationsSummary = classifierOuputs.reduce((acc, cur) => {
    acc[cur.classification.value] = {
      classifierJobId: parseInt(id),
      classificationId: cur.classification.id,
      total: 0,
      rejected: 0,
      uncertain: 0,
      confirmed: 0
    }
    return acc
  }, {})

  detections.forEach(d => {
    const status = DetectionReview.statusMapping[`${d.review_status}`]
    const value = d.classification.value
    if (classificationsSummary[value]) {
      classificationsSummary[value].total++
      if (classificationsSummary[value][status] !== undefined) {
        classificationsSummary[value][status]++
      }
    }
  })

  return Object.values(classificationsSummary)
}

async function getSummary (classifierJobId, filters = {}, options = {}) {
  await get(classifierJobId, options)
  const summaries = await dao.getJobSummaries(classifierJobId, filters, options)
  return summaries.reduce((acc, cur) => {
    acc.reviewStatus.total += cur.total
    acc.reviewStatus.confirmed += cur.confirmed
    acc.reviewStatus.rejected += cur.rejected
    acc.reviewStatus.uncertain += cur.uncertain
    acc.classificationsSummary.push({
      ...cur.classification.toJSON(),
      total: cur.total,
      confirmed: cur.confirmed,
      rejected: cur.rejected,
      uncertain: cur.uncertain
    })
    return acc
  }, {
    reviewStatus: {
      total: 0,
      confirmed: 0,
      rejected: 0,
      uncertain: 0
    },
    classificationsSummary: []
  })
}

module.exports = {
  updateSummary,
  getSummary
}
