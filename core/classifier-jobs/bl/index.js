const dao = require('../dao')
const streamsDao = require('../../streams/dao')
const { sequelize } = require('../../_models')
const { hasPermission, PROJECT, READ, CREATE } = require('../../roles/dao')
const { ForbiddenError, EmptyResultError } = require('../../../common/error-handling/errors')

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

module.exports = {
  create,
  get
}
