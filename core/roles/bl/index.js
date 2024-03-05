const dao = require('../dao')
const usersService = require('../../../common/users')
const { sequelize } = require('../../_models')
const { ForbiddenError } = require('../../../common/error-handling/errors')

/**
 * put role
 * @param {Params} params
 * @param {string} params.email
 * @param {string} params.role
 * @param {string} userId
 * @param {string} isSuper
 * @param {string} itemId projectId, streamId
 * @param {string} itemName PROJECT, STREAM
 * @throws ValidationError when trying to set Owner role
 */
async function put (params, userId, isSuper, itemId, itemName) {
  return sequelize.transaction(async (transaction) => {
    const targetUser = await usersService.getUserByEmail(params.email, false, { transaction })
    const role = await dao.getByName(params.role, { transaction })

    if (!isSuper) {
      const requestUserRole = await dao.getUserRoleForItem(itemId, userId, itemName, { transaction })
      if (requestUserRole.role === 'Admin' && role.id === dao.OWNER) {
        throw new ForbiddenError('Admin are not allow to add Owner role')
      }
    }

    await dao.addRole(targetUser.id, role.id, itemId, itemName, { transaction })
    return await dao.getUserRoleForItem(itemId, targetUser.id, itemName, { transaction })
  })
}

/**
 * put role
 * @param {Params} params
 * @param {string} params.email
 * @param {string} userId
 * @param {string} isSuper
 * @param {string} itemId projectId, streamId
 * @param {string} itemName PROJECT, STREAM
 * @throws ValidationError when trying to set Owner role
 */
async function remove (params, userId, isSuper, itemId, itemName) {
  return sequelize.transaction(async (transaction) => {
    const targetUser = await usersService.getUserByEmail(params.email, false, { transaction })

    if (!isSuper) {
      const requestUserRole = await dao.getUserRoleForItem(itemId, userId, itemName, { transaction })
      const targetUserRole = await dao.getUserRoleForItem(itemId, targetUser.id, itemName, { transaction })
      if (requestUserRole.role === 'Admin' && targetUserRole.role === 'Owner') {
        throw new ForbiddenError('Admin are not allow to remove Owner role')
      }
    }

    await dao.removeRole(targetUser.id, itemId, itemName, { transaction })
  })
}

module.exports = {
  put,
  remove
}
