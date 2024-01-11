const dao = require('../dao')
const usersService = require('../../../common/users')
const { ForbiddenError, ValidationError } = require('../../../common/error-handling/errors')

/**
 * put role
 * @param {Params} params
 * @param {string} params.email
 * @param {string} params.role
 * @param {string} itemId projectId, streamId
 * @param {string} itemName PROJECT, STREAM
 * @throws ValidationError when trying to set Owner role
 */
async function put (params, itemId, itemName) {
  const user = await usersService.getUserByEmail(params.email)
  const role = await dao.getByName(params.role)

  if (role.name === dao.OWNER_VALUE) {
    throw new ValidationError('Owner role is not allowed')
  }
  await dao.addRole(user.id, role.id, itemId, itemName)
  return await dao.getUserRoleForItem(itemId, user.id, itemName)
}

module.exports = {
  put
}
