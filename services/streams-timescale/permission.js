const models = require('../../modelsTimescale')
const EmptyResultError = require('../../utils/converter/empty-result-error')
const ValidationError = require('../../utils/converter/validation-error')
const ForbiddenError = require('../../utils/converter/forbidden-error')
const streamsService = require('./index')

/**
 * Returns true if the user has permission on the stream
 * @param {number} userId
 * @param {string} streamOrId stream id or stream model item
 * @param {string} type
 */
async function hasPermission(userId, streamOrId, type) {
  const stream = await (typeof streamOrId === 'string' ? streamsService.getById(streamOrId) : Promise.resolve(streamOrId))
  if (!stream) {
    return false
  }
  if (stream.created_by_id === userId) {
    return true
  }
  if (stream.is_public) {
    return type === 'R'
  }
  const permission = await get(stream.id, userId)
  if (permission) {
    if (type === 'W') {
      return permission.type === 'W'
    }
    return true
  }
  return false
}

function get(stream_id, user_id, type) {
  return models.StreamPermission.findOne({
    where: {
      stream_id,
      user_id,
      ...type && { type }
    }
  })
}

/**
 * Creates stream-permission model item with selected params; Removes all previously created permissions for specified stream and user
 * @param {*} stream_id
 * @param {*} user_id
 * @param {*} type "R" (read) or "W" (write)
 */
async function add(stream_id, user_id, type) {
  return models.sequelize.transaction(async (transaction) => {
    await models.StreamPermission.destroy({ where: { stream_id, user_id }, transaction })
    const permission = await models.StreamPermission.create({ stream_id, user_id, type }, transaction)
    return permission
  })
}

/**
 * Removes stream-permission for specified stream and user
 * @param {*} stream_id
 * @param {*} user_id
 */
function remove(stream_id, user_id) {
  return models.StreamPermission.destroy({ where: { stream_id, user_id } })
}

module.exports = {
  hasPermission,
  add,
  remove,
}
