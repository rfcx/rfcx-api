const models = require('../../modelsTimescale')
const EmptyResultError = require('../../utils/converter/empty-result-error')
const streamsService = require('./index')
const usersFusedService = require('../users/fused')

const permissionBaseInclude = [
  {
    model: models.Stream,
    as: 'stream',
    attributes: models.Stream.attributes.lite
  },
  {
    model: models.User,
    as: 'user',
    attributes: models.User.attributes.lite
  },
  {
    model: models.Organization,
    as: 'organization',
    attributes: models.Organization.attributes.lite
  }
]

/**
 * Returns true if the user has permission on the stream
 * @param {number} userOrId
 * @param {string} streamOrId stream id or stream model item
 * @param {string} type
 */
async function hasPermission (userOrId, streamOrId, type) {
  const stream = await (typeof streamOrId === 'string' ? streamsService.getById(streamOrId) : Promise.resolve(streamOrId))
  const userIsPrimitive = ['string', 'number'].includes(typeof userOrId)
  const userId = userIsPrimitive ? userOrId : userOrId.owner_id
  if (!stream) {
    return false
  }
  if (stream.created_by_id === userId) {
    return true
  }
  if (stream.is_public && type === 'R') {
    return true
  }
  const user = await (userIsPrimitive ? usersFusedService.getByParams({ id: userId }) : Promise.resolve(userOrId))
  if (user.is_super) {
    return true
  }
  const permission = (await query({ stream_id: stream.id, user_id: userId }))[0]
  if (permission) {
    if (type === 'W') {
      return permission.type === 'W'
    }
    return true
  }
  return false
}

/**
 * Returns permissions list for user per stream
 * @param {number} userId
 * @param {string} streamOrId stream id or stream model item
 */
async function getPermissionsForStream (userId, streamOrId) {
  const stream = await (typeof streamOrId === 'string' ? streamsService.getById(streamOrId) : Promise.resolve(streamOrId))
  if (!stream) {
    throw new EmptyResultError('Stream with given id not found.')
  }
  if (stream.created_by_id === userId) {
    return ['O', 'W', 'R']
  }
  const permissionsModels = await query({
    stream_id: stream.id,
    user_id: userId
  })
  const permissions = permissionsModels.map(x => x.type)
  if (stream.is_public && !permissions.includes('R')) {
    permissions.push('R')
  }
  return permissions
}

/**
 * Returns list of permissions
 * @param {*} attrs permission attributes
 * @param {*} opts additional function params
 */
async function query (attrs, opts = {}) {
  return models.StreamPermission.findAll({
    where: {
      stream_id: attrs.stream_id,
      ...attrs.user_id && { user_id: attrs.user_id },
      ...attrs.type && { type: attrs.type }
    },
    attributes: models.StreamPermission.attributes.full,
    include: opts.joinRelations ? permissionBaseInclude : []
  })
}

/**
 * Creates stream-permission model item with selected params; Removes all previously created permissions for specified stream and user
 * @param {*} stream_id
 * @param {*} user_id
 * @param {*} type "R" (read) or "W" (write)
 */
async function add (stream_id, user_id, type) { // eslint-disable-line camelcase
  return models.sequelize.transaction(async (transaction) => {
    await models.StreamPermission.destroy({ where: { stream_id, user_id }, transaction })
    const permission = await models.StreamPermission.create({ stream_id, user_id, type }, { transaction })
    return permission
  })
}

/**
 * Removes stream-permission for specified stream and user
 * @param {*} stream_id
 * @param {*} user_id
 */
function remove (stream_id, user_id) { // eslint-disable-line camelcase
  return models.StreamPermission.destroy({ where: { stream_id, user_id } })
}

/**
 * Get a list of IDs for streams marked as public
 */
async function getPublicStreamIds () {
  return (await streamsService.query({
    is_public: true
  })).streams.map(d => d.id)
}

/**
 * Get a list of IDs for streams which are accessible to the user
 * @param {string} createdBy Limit to streams created by `me` (my streams) or `collaborators` (shared with me)
 */
async function getAccessibleStreamIds (userId, createdBy = undefined) {
  // Only my streams or my collaborators
  if (createdBy !== undefined) {
    return (await streamsService.query({
      current_user_id: userId,
      created_by: createdBy
    })).streams.map(d => d.id)
  }

  // Get my streams and my collaborators
  const s1 = await streamsService.query({
    current_user_id: userId
  })
  const s2 = await streamsService.query({
    current_user_id: userId,
    created_by: 'collaborators'
  })
  const streamIds = [...new Set([
    ...s1.streams.map(d => d.id),
    ...s2.streams.map(d => d.id)
  ])]
  return streamIds
}

function format (permission) {
  const { type, created_at, updated_at } = permission // eslint-disable-line camelcase
  return {
    stream: permission.stream || null,
    user: permission.user || null,
    organization: permission.organization || null,
    type,
    created_at,
    updated_at
  }
}

function formatMultiple (permissions) {
  return permissions.map(format)
}

module.exports = {
  hasPermission,
  getPermissionsForStream,
  query,
  add,
  remove,
  getPublicStreamIds,
  getAccessibleStreamIds,
  format,
  formatMultiple
}
