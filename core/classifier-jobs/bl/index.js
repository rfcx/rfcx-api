const dao = require('../dao')
const streamsDao = require('../../streams/dao')
const { sequelize } = require('../../_models')
const { hasPermission, PROJECT, CREATE } = require('../../roles/dao')
const { ForbiddenError, EmptyResultError, ValidationError } = require('../../../common/error-handling/errors')
const { CANCELLED, DONE, ERROR, WAITING, RUNNING, AWAITING_CANCELLATION } = require('../classifier-job-status')
const { get } = require('./get')
const messageQueue = require('../../../common/message-queue/sqs')
const { CLASSIFIER_JOB_FINISHED } = require('../../../common/message-queue/event-names')

const ALLOWED_TARGET_STATUSES = [CANCELLED, WAITING]
const ALLOWED_SOURCE_STATUSES = [CANCELLED, WAITING, ERROR]
const ALLOWED_FOR_CANCEL_SOURCE_STATUSES = [WAITING, RUNNING, AWAITING_CANCELLATION]

/**
 * Create a new classifier job
 * @param {ClassifierJob} data
 * @param {*} options Additional create options
 * @param {number|undefined} options.creatableBy Allow only if the given user id has permission to create on the project
 * @throws ForbiddenError when `creatableBy` user does not have create permission on the project
 * @throws ValidationError when the project does not exist
 */
async function create (data, options = {}) {
  return await sequelize.transaction(async (transaction) => {
    if (options.creatableBy && !(await hasPermission(CREATE, options.creatableBy, data.projectId, PROJECT, { transaction }))) {
      throw new ForbiddenError()
    }
    const namesOrIds = data.queryStreams ? data.queryStreams.split(',') : undefined
    const streamIds = (await streamsDao.query({ projects: [data.projectId], namesOrIds }, { fields: ['id'], transaction })).results.map(r => r.id)
    if (!streamIds.length) {
      throw new EmptyResultError('No streams found for the query')
    }
    if (namesOrIds && (streamIds.length < namesOrIds.length)) {
      throw new EmptyResultError('Some streams not found for the query')
    }
    options.transaction = transaction
    const job = await dao.create(data, options)
    await dao.createJobStreams(job.id, streamIds, { transaction })
    return job
  })
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
      isStatusAllowToUpdate(existingJob.status, newJob.status)
      if (newJob.status === CANCELLED && existingJob.status === RUNNING) {
        newJob.status = AWAITING_CANCELLATION
      }
    }

    // Set/clear completedAt
    if (newJob.status !== undefined) {
      newJob.completedAt = newJob.status === DONE ? new Date() : null
    }

    await dao.update(id, newJob, { transaction })

    if (newJob.status === DONE) {
      await notify(id)
    }
  })
}

function isStatusAllowToUpdate (existingStatus, targetStatus) {
  if (targetStatus === CANCELLED) {
    if (!ALLOWED_FOR_CANCEL_SOURCE_STATUSES.includes(existingStatus)) {
      throw new ValidationError(`Cannot cancel jobs in status ${targetStatus}`)
    }
    return
  }
  if (!ALLOWED_TARGET_STATUSES.includes(targetStatus)) {
    throw new ValidationError(`Cannot update status to ${targetStatus}`)
  }
  if (!ALLOWED_SOURCE_STATUSES.includes(existingStatus)) {
    throw new ValidationError(`Cannot update status of jobs in status ${targetStatus}`)
  }
}

function notify (id) {
  if (!messageQueue.isEnabled()) {
    return
  }
  const message = { jobId: id }
  return messageQueue.publish(CLASSIFIER_JOB_FINISHED, message).catch((e) => {
    console.error('Classifier job bl -> publish failed', e.message || e)
  })
}

/**
 * Get a list of classifier jobs matching the filters
 * @param {*} filters Classifier jobs attributes
 * @param {string[]} filters.projects Where belongs to one of the projects (array of project ids)
 * @param {number} filters.status Include only status in filters
 * @param {number} filters.createdBy Where created by the given user id
 * @param {*} options Query options
 * @param {string} options.sort Order the results by one or more columns
 * @param {number} options.limit Maximum results to include
 * @param {number} options.offset Number of results to skip
 * @param {number} options.readableBy Include only classifier jobs readable by the given user id
 */
async function list (filters = {}, options = {}) {
  const jobs = await dao.query(filters, options)
  if (filters.queryHours) {
    const hourRanges = filters.queryHours.split(',').map(hours => rangeToDaytimeHoursArray(hours))
    const filteredJobs = jobs.results.filter(job => {
      const jobQueryHours = job.queryHours.split(',').map(hours => rangeToDaytimeHoursArray(hours))
      return isHoursOverlapped(jobQueryHours, hourRanges)
    })
    jobs.results = filteredJobs
  }
  return jobs
}

function isHoursOverlapped (hours1, hours2) {
  const hours1Set = new Set(hours1.flat())
  const hours2Set = new Set(hours2.flat())
  return [...hours1Set].some(hour => hours2Set.has(hour))
}

function rangeToDaytimeHoursArray (range) {
  const rangeSplitted = range.match(/^(0?[0-9]|1[0-9]|2[0-3])(?:-(0?[0-9]|1[0-9]|2[0-3]))?$/)
  if (!rangeSplitted) {
    return []
  }
  const startRange = parseInt(rangeSplitted[1])
  const endRange = rangeSplitted[2] ? parseInt(rangeSplitted[2]) : undefined
  // return startRange if the range is single hour, eg. 23
  if (endRange === undefined) {
    return [startRange]
  }

  const hours = [startRange]
  let nextHour = startRange
  while (hours.at(-1) !== endRange) {
    nextHour += 1
    if (nextHour === 24) {
      nextHour = 0
    }
    hours.push(nextHour)
  }
  return hours
}

module.exports = {
  create,
  update,
  list
}
