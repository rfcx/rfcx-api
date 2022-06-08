const { ClassifierJob, Sequelize } = require('../../_models')
const { ForbiddenError, ValidationError } = require('../../../common/error-handling/errors')
const { getAccessibleObjectsIDs, hasPermission, PROJECT, CREATE } = require('../../roles/dao')
const { getSortFields } = require('../../_utils/db/sort')
const pagedQuery = require('../../_utils/db/paged-query')

const availableIncludes = [
  ClassifierJob.include({ attributes: ClassifierJob.attributes.full })
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
 * @param {number} options.permissableBy Include only streams permissable by the given user id
 */
async function query (filters, options = {}) {
  const where = {}

  if (options.permissableBy) {
    const projectIds = await getAccessibleObjectsIDs(options.permissableBy, PROJECT, filters.projects)
    where.projectId = {
      [Sequelize.Op.in]: projectIds
    }
  } else if (filters.projects) {
    where.projectId = {
      [Sequelize.Op.in]: filters.projects
    }
  }

  if (filters.status) {
    where.status = filters.status
  }

  if (filters.createdBy) {
    where.createdById = filters.createdBy
  }

  const classifierAttributes = options.fields && options.fields.length > 0 ? ClassifierJob.attributes.full.filter(a => options.fields.includes(a)) : ClassifierJob.attributes.full
  const attributes = { ...classifierAttributes, exclude: ['created_by_id', 'project_id'] }
  const include = options.fields && options.fields.length > 0 ? availableIncludes.filter(i => options.fields.includes(i.as)) : []
  const order = getSortFields(options.sort || '-created_at')

  const result = await pagedQuery(ClassifierJob, {
    where,
    attributes,
    include,
    order,
    limit: options.limit,
    offset: options.offset
  })

  return result
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
      throw new ValidationError('Cannot create classifier job with provided data.')
    })
}

module.exports = {
  query,
  create
}
