const dao = require('../dao')
const streamsDao = require('../../streams/dao')
const { sequelize } = require('../../_models')
const { hasPermission, PROJECT, READ, CREATE } = require('../../roles/dao')
const { ForbiddenError, EmptyResultError, ValidationError } = require('../../../common/error-handling/errors')
const { CANCELLED, DONE, ERROR, WAITING } = require('../classifier-job-status')
const detectionsDao = require('../../detections/dao/index')
const classifierOutputsDao = require('../../classifiers/dao/outputs')
const { DetectionReview } = require('../../_models')

const ALLOWED_TARGET_STATUSES = [CANCELLED, WAITING]
const ALLOWED_SOURCE_STATUSES = [CANCELLED, WAITING, ERROR]

/**
 * Create a new classifier job
 * @param {ClassifierJob} data
 * @param {*} options Additional create options
 * @param {number|undefined} options.creatableBy Allow only if the given user id has permission to create on the project
 * @throws ForbiddenError when `creatableBy` user does not have create permission on the project
 * @throws ValidationError when the project does not exist
 */
async function create (data, options = {}) {
  if (options.creatableBy && !(await hasPermission(CREATE, options.creatableBy, data.projectId, PROJECT))) {
    throw new ForbiddenError()
  }
  const names = data.queryStreams ? data.queryStreams.split(',') : undefined
  const streamIds = (await streamsDao.query({ projects: [data.projectId], names }, { fields: ['id'] })).results.map(r => r.id)
  if (!streamIds.length) {
    throw new EmptyResultError('No streams found for the query')
  }
  if (names && (streamIds.length < names.length)) {
    throw new EmptyResultError('Some streams not found for the query')
  }
  return await sequelize.transaction(async (transaction) => {
    options.transaction = transaction
    const job = await dao.create(data, options)
    await dao.createJobStreams(job.id, streamIds, { transaction })
    return job
  })
}

/**
 * Search for classifier job with given id
 * @param {integer} id Classifier job id
 * @param {*} options
 * @param {string[]} options.fields Custom attributes
 * @param {transaction} options.transaction Sql transaction
 * @param {string} options.readableBy User id who wants to get data
 * @throws EmptyResultError when job not found
 * @throws ForbiddenError when user does not have permissions
 */
async function get (id, options = {}) {
  if (options.fields && options.fields.length) {
    options.fields = [...new Set([...options.fields, 'project_id'])]
  }
  const job = await dao.get(id, options)

  if (options.readableBy && !(await hasPermission(READ, options.readableBy, job.projectId, PROJECT))) {
    throw new ForbiddenError()
  }

  return job
}

/**
 * Update a classifier job
 * @param {integer} id
 * @param {ClassifierJob} job
 * @param {integer} job.status
 * @param {integer} job.minutesTotal
 * @param {*} options
 * @param {number} options.updatableBy Update only if job is updatable by the given user id
 * @throws EmptyResultError when job not found
 * @throws ForbiddenError when `updatableBy` user does not have update permission on the job
 */
async function update (id, newJob, options = {}) {
  return sequelize.transaction(async transaction => {
    // Check the job is updatable
    const existingJob = await get(id, { transaction })
    if (options.updatableBy && existingJob.createdById !== options.updatableBy) {
      throw new ForbiddenError()
    }
    // If is not super user or system user
    if (options.updatableBy && newJob.status !== undefined) {
      if (!ALLOWED_TARGET_STATUSES.includes(newJob.status)) {
        throw new ValidationError(`Cannot update status to ${newJob.status}`)
      }
      if (!ALLOWED_SOURCE_STATUSES.includes(existingJob.status)) {
        throw new ValidationError(`Cannot update status of jobs in status ${newJob.status}`)
      }
    }

    // Set/clear completedAt
    if (newJob.status !== undefined) {
      newJob.completedAt = newJob.status === DONE ? new Date() : null
    }

    await dao.update(id, newJob, { transaction })

    if (newJob.status === DONE) {
      await updateSummary(id, { transaction })
    }
  })
}

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

async function getSummary (id, filters = {}, options = {}) {
  await get(id, options)
  const summaries = await dao.getJobSummaries(id, filters, options)
  return summaries.reduce((acc, cur) => {
    acc.reviewStatus.total += cur.total
    acc.reviewStatus.confirmed += cur.confirmed
    acc.reviewStatus.rejected += cur.rejected
    acc.reviewStatus.uncertain += cur.uncertain
    acc.classificationsSummary.push({
      ...cur.classification.toJSON(),
      total: cur.total
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
  create,
  get,
  update,
  getSummary
}
