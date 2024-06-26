const dao = require('../dao/summary')
const detectionsDao = require('../../detections/dao/index')
const classifierOutputsDao = require('../../classifiers/dao/outputs')
const { DetectionReview } = require('../../_models')
const { get } = require('./get')

async function updateSummary (job, options = {}) {
  const transaction = options.transaction
  const summary = await calcSummary(job, options)
  await dao.deleteJobSummary(job.id, { transaction })
  await dao.createJobSummary(summary, { transaction })
}

async function calcSummary (job, options = {}) {
  const detections = (await detectionsDao.query({
    streams: (job.streams || []).map(s => s.id),
    start: `${job.queryStart}T00:00:00.000Z`,
    end: `${job.queryEnd}T23:59:59.999Z`,
    minConfidence: 0,
    classifierJobs: [job.id]
  }, {
    user: options.user,
    fields: ['review_status', 'updated_at'],
    transaction: options.transaction
  })).results

  const classifierOuputs = (await classifierOutputsDao.query({
    classifiers: [job.classifierId]
  }, {
    fields: ['classification'],
    transaction: options.transaction
  })).results

  const classificationsSummary = classifierOuputs.reduce((acc, cur) => {
    acc[cur.classification.value] = {
      classifierJobId: parseInt(job.id),
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
  const reducedSummaries = summaries.results.reduce((acc, cur) => {
    acc.classificationsSummary.push({
      ...cur.classification,
      total: cur.total,
      unreviewed: (cur.total - (cur.confirmed + cur.rejected + cur.uncertain)),
      confirmed: cur.confirmed,
      rejected: cur.rejected,
      uncertain: cur.uncertain
    })
    return acc
  }, {
    classificationsSummary: []
  })
  return { total: summaries.total, results: reducedSummaries }
}

async function getValidationStatus (classifierJobId, options = {}) {
  await get(classifierJobId, options)
  const summaries = await dao.getJobSummaries(classifierJobId, {}, options)
  const reducedSummaries = summaries.results.reduce((acc, cur) => {
    acc.reviewStatus.total += cur.total
    acc.reviewStatus.unreviewed += (cur.total - (cur.confirmed + cur.rejected + cur.uncertain))
    acc.reviewStatus.confirmed += cur.confirmed
    acc.reviewStatus.rejected += cur.rejected
    acc.reviewStatus.uncertain += cur.uncertain
    return acc
  }, {
    reviewStatus: {
      total: 0,
      unreviewed: 0,
      confirmed: 0,
      rejected: 0,
      uncertain: 0
    }
  })
  return reducedSummaries
}

module.exports = {
  updateSummary,
  getSummary,
  getValidationStatus
}
