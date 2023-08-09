const dao = require('../dao')
const streamsDao = require('../../streams/dao')
const { sequelize } = require('../../_models')
const { hasPermission, PROJECT, CREATE } = require('../../roles/dao')
const { ForbiddenError, EmptyResultError, ValidationError } = require('../../../common/error-handling/errors')
const { CANCELLED, DONE, ERROR, WAITING } = require('../classifier-job-status')
const { get } = require('./get')
const { updateSummary } = require('./results')

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

module.exports = {
  create,
  update
}
