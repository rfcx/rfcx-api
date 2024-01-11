const dao = require('../dao')
const usersService = require('../../../common/users')
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
  const targetUser = await usersService.getUserByEmail(params.email)
  const role = await dao.getByName(params.role)

  if (userId === targetUser.id) {
    throw new ForbiddenError('Cannot change yourself a role')
  }
  if (role.name === dao.OWNER_VALUE) {
    throw new ValidationError('Owner role is not allowed')
  }
  await dao.addRole(targetUser.id, role.id, itemId, itemName)
  return await dao.getUserRoleForItem(itemId, targetUser.id, itemName)
}

module.exports = {
  put
}
