const { ClassifierJobs } = require('../../../_models')
const { ForbiddenError, ValidationError } = require('../../../../common/error-handling/errors')
const { hasPermission, PROJECT, UPDATE } = require('../../../roles/dao')

/**
 * Create a stream
 * @param {ClassifierJobs} job
 * @param {*} options
 */
async function create (job, options = {}) {
  if (job.projectId && options.creatableBy && !(await hasPermission(UPDATE, options.creatableBy, job.projectId, PROJECT))) {
    throw new ForbiddenError()
  }
  return ClassifierJobs.create(job)
    .catch((e) => {
      console.error('error', e)
      throw new ValidationError('Cannot create classifier job with provided data.')
    })
}

module.exports = {
  create
}
