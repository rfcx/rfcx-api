const { ClassifierJob, Sequelize } = require('../../_models')
const { ForbiddenError, ValidationError } = require('../../../common/error-handling/errors')
const { getAccessibleObjectsIDs, hasPermission, PROJECT, UPDATE } = require('../../roles/dao')
const { getSortFields } = require('../../_utils/db/sort')
const pagedQuery = require('../../_utils/db/paged-query')

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

  if (filters.projects) {
    where.projectId = {
      [Sequelize.Op.in]: options.projects
    }
  }

  if (filters.status) {
    where.status = options.status
  }

  if (filters.createdBy) {
    where.createdById = options.createdBy
  }

  if (options.permissableBy) {
    where.id = {
      [Sequelize.Op.in]: await getAccessibleObjectsIDs(options.permissableBy, PROJECT, 'R', true)
    }
  }

  const order = getSortFields(options.sort || '-created_at')

  const result = await pagedQuery(ClassifierJob, {
    where,
    order,
    limit: options.limit,
    offset: options.offset
  })

  return result
}

/**
 * Create a new classifier job
 * @param {ClassifierJob} job
 * @param {*} options
 */
async function create (job, options = {}) {
  if (job.projectId && options.creatableBy && !(await hasPermission(UPDATE, options.creatableBy, job.projectId, PROJECT))) {
    throw new ForbiddenError()
  }
  return ClassifierJob.create(job)
    .catch((e) => {
      console.error('error', e)
      throw new ValidationError('Cannot create classifier job with provided data.')
    })
}

module.exports = {
  query,
  create
}
