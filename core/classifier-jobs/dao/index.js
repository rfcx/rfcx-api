const { sequelize, ClassifierJob, ClassifierJobStream, Classifier, Stream, Sequelize } = require('../../_models')
const { ForbiddenError, ValidationError, EmptyResultError } = require('../../../common/error-handling/errors')
const { getAccessibleObjectsIDs, hasPermission, PROJECT, CREATE } = require('../../roles/dao')
const { getSortFields } = require('../../_utils/db/sort')
const pagedQuery = require('../../_utils/db/paged-query')
const { CANCELLED, DONE, ERROR, WAITING } = require('../classifier-job-status')
const { toCamelObject } = require('../../_utils/formatters/string-cases')

const availableIncludes = [
  Classifier.include({ attributes: ['id', 'name'] }),
  Stream.include({ as: 'streams', attributes: ['id', 'name'], required: false })
]

const ALLOWED_TARGET_STATUSES = [CANCELLED, WAITING]
const ALLOWED_SOURCE_STATUSES = [CANCELLED, WAITING, ERROR]

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
async function query (filters, options = {}) {
  const accessibleProjects = options.readableBy ? await getAccessibleObjectsIDs(options.readableBy, PROJECT, filters.projects) : null
  const filterProjects = Array.isArray(filters.projects) ? filters.projects : null
  const projectIds = accessibleProjects && filterProjects
    ? accessibleProjects.filter(p => filters.projects.includes(p))
    : accessibleProjects ?? filterProjects

  // Early return if projectIds set, but empty (no accessible projects)
  if (projectIds && projectIds.length === 0) { return { total: 0, results: [] } }

  const where = {
    ...projectIds && { projectId: { [Sequelize.Op.in]: projectIds } },
    ...filters.status !== undefined && { status: filters.status },
    ...filters.createdBy !== undefined && { createdById: filters.createdBy }
  }

  const attributes = options.fields && options.fields.length > 0 ? ClassifierJob.attributes.full.filter(a => options.fields.includes(a)) : ClassifierJob.attributes.lite
  const include = options.fields && options.fields.length > 0 ? availableIncludes.filter(i => options.fields.includes(i.as)) : availableIncludes
  const order = getSortFields(options.sort || '-created_at')

  const data = await pagedQuery(ClassifierJob, {
    where,
    attributes,
    include,
    order,
    limit: options.limit,
    offset: options.offset
  })

  data.results = data.results.map((job) => {
    if (job.streams) {
      job.streams = job.streams.map(s => {
        delete s.classifier_job_streams
        return s
      })
    }
    return toCamelObject(job, 2)
  })

  return data
}

/**
 * Create a new classifier job
 * @param {ClassifierJob} job
 * @param {*} options Additional create options
 * @param {number|undefined} options.creatableBy Allow only if the given user id has permission to create on the project
 * @throws ForbiddenError when `creatableBy` user does not have create permission on the project
 * @throws ValidationError when the project does not exist
 */
async function create (job, options = {}) {
  if (options.creatableBy && !(await hasPermission(CREATE, options.creatableBy, job.projectId, PROJECT).catch(() => { throw new ValidationError('project does not exist') }))) {
    throw new ForbiddenError()
  }
  return await ClassifierJob.create(job)
    .catch((e) => {
      console.error('error', e)
      throw new ValidationError('Cannot create classifier job with provided data')
    })
}

async function createJobStreams (classifierJobId, streamIds, options = {}) {
  const transaction = options.transaction
  return await ClassifierJobStream.bulkCreate(streamIds.map(streamId => ({
    classifierJobId, streamId
  })), { transaction })
}

async function deleteJobStreams (classifierJobId, streamIds, options = {}) {
  const transaction = options.transaction
  const where = { classifierJobId }
  if (streamIds && streamIds.length) {
    where.streamId = {
      [Sequelize.Op.in]: streamIds
    }
  }
  return await ClassifierJobStream.destroy({ where }, { transaction })
}

/**
 * Search for classifier job with given id
 * @param {integer} id Classifier job id
 * @param {*} options
 * @param {string[]} options.attributes Custom attributes
 * @param {transaction} options.transaction Sql transaction
 * @throws EmptyResultError when job not found
 */
async function get (id, options = {}) {
  const attributes = options.fields && options.fields.length > 0 ? ClassifierJob.attributes.full.filter(a => options.fields.includes(a)) : ClassifierJob.attributes.lite
  const include = options.fields && options.fields.length > 0 ? availableIncludes.filter(i => options.fields.includes(i.as)) : availableIncludes
  const transaction = options.transaction || null
  let job = await ClassifierJob.findOne({ where: { id }, attributes, include, transaction })
  if (!job) {
    throw new EmptyResultError()
  }
  job = job.toJSON()
  if (job.streams) {
    job.streams = job.streams.map(s => {
      delete s.classifier_job_streams
      return s
    })
  }
  return toCamelObject(job, 2)
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

    await ClassifierJob.update(newJob, { where: { id }, transaction })
  })
}

module.exports = {
  query,
  create,
  createJobStreams,
  deleteJobStreams,
  get,
  update
}
