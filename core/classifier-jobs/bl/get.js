const dao = require('../dao')
const { hasPermission, PROJECT, READ } = require('../../roles/dao')
const { ForbiddenError } = require('../../../common/error-handling/errors')

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

module.exports = {
  get
}
