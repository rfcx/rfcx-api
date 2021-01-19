const { StreamAsset, User } = require('../../modelsTimescale')
const ForbiddenError = require('../../utils/converter/forbidden-error')
const { hasPermission } = require('../roles')

/**
 * Create a stream asset
 * @param {*} asset
 * @param {string} asset.streamId
 * @param {string} asset.type
 * @param {string} asset.url
 * @param {number} asset.createdById
 * @param {*} options
 * @param {number} options.creatableBy Create only if given user id has permission to create in the stream
 * @returns {*}
 */
async function create (asset, options = {}) {
  if (options.creatableBy && !(await hasPermission('C', options.creatableBy, asset.streamId, 'Stream'))) {
    throw new ForbiddenError()
  }

  return StreamAsset.create(asset)
}

/**
 * Get a list of stream assets
 * @param {*} filters
 * @param {string} filters.streamId
 * @param {string} filters.type
 * @param {*} options
 * @param {number} options.readableBy Include only assets in streams readable by the given user id
 * @param {string[]} options.fields Attributes and relations to include in results
* @returns {*}
 */
async function query (filters, options = {}) {
  if (options.readableBy && !(await hasPermission('R', options.readableBy, filters.streamId, 'Stream'))) {
    throw new ForbiddenError()
  }

  const where = {}
  if (filters.streamId) {
    where.streamId = filters.streamId
  }
  if (filters.type) {
    where.type = filters.type
  }

  const attributes = options.fields && options.fields.length > 0 ? StreamAsset.attributes.full.filter(a => options.fields.includes(a)) : StreamAsset.attributes.lite
  const availableIncludes = [User.include('created_by')]
  const include = options.fields && options.fields.length > 0 ? availableIncludes.filter(i => options.fields.includes(i.as)) : []

  const query = { where, attributes, include, order: [['created_at', 'DESC']] }
  return StreamAsset.findAll(query)
}

module.exports = {
  create,
  query
}
