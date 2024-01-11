const dao = require('../dao')
const usersService = require('../../../common/users')
const { sequelize } = require('../../_models')
const { ValidationError, ForbiddenError } = require('../../../common/error-handling/errors')

/**
 * put role
 * @param {Params} params
 * @param {string} params.email
 * @param {string} params.role
 * @param {string} userId
 * @param {string} itemId projectId, streamId
 * @param {string} itemName PROJECT, STREAM
 * @throws ValidationError when trying to set Owner role
 */
async function put (params, userId, itemId, itemName) {
  return sequelize.transaction(async (transaction) => {
    const targetUser = await usersService.getUserByEmail(params.email, false, { transaction })
    const role = await dao.getByName(params.role, { transaction })
  
    if (userId === targetUser.id) {
      throw new ForbiddenError('You are not allowed to change your role')
    }
    if (role.id === dao.OWNER) {
      throw new ValidationError('You are not able to change Owner role')
    }
    await dao.addRole(targetUser.id, role.id, itemId, itemName, { transaction })
    return await dao.getUserRoleForItem(itemId, targetUser.id, itemName, { transaction })
  })
}

module.exports = {
  put
}
