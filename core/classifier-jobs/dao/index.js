const { ClassifierJob, ClassifierJobStream, Classifier, Stream, Sequelize } = require('../../_models')
const { ForbiddenError, ValidationError, EmptyResultError } = require('../../../common/error-handling/errors')
const { getAccessibleObjectsIDs, hasPermission, PROJECT, CREATE } = require('../../roles/dao')
const { getSortFields } = require('../../_utils/db/sort')
const pagedQuery = require('../../_utils/db/paged-query')
const { toCamelObject } = require('../../_utils/formatters/string-cases')

const availableIncludes = [
  Classifier.include({ attributes: ['id', 'name'] }),
  // `through: { attributes: [] }` is required to delete `classifier_job_streams: { ClassifierJobId: id, StreamId: id }` from result
  Stream.include({ as: 'streams', attributes: ['id', 'name'], required: false, through: { attributes: [] } })
]

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

  data.results = data.results.map((job) => { return toCamelObject(job, 2) })

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
  const transaction = options.transaction
  return await ClassifierJob.create(job, { transaction })
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
  const job = await ClassifierJob.findOne({ where: { id }, attributes, include, transaction })
  if (!job) {
    throw new EmptyResultError()
  }
  return toCamelObject(job.toJSON(), 2)
}

/**
 * Update a classifier job
 * @param {integer} id
 * @param {ClassifierJob} job
 * @param {integer} job.status
 * @param {integer} job.minutesTotal
 * @param {*} options
 * @param {number} options.updatableBy Update only if job is updatable by the given user id
 */
async function update (id, newJob, options = {}) {
  const transaction = options.transaction
  return await ClassifierJob.update(newJob, { where: { id }, transaction })
}

module.exports = {
  query,
  create,
  createJobStreams,
  deleteJobStreams,
  get,
  update
}
