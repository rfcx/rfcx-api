const models = require('../../modelsTimescale')
const organizationsService = require('../organizations')
const projectsService = require('../projects')
const streamsService = require('../streams')
const usersFusedService = require('../users/fused')
const EmptyResultError = require('../../utils/converter/empty-result-error')

const roleBaseInclude = [
  {
    model: models.Role,
    as: 'role',
    attributes: models.Role.attributes.lite,
    include: [
      {
        model: models.RolePermission,
        as: 'permissions',
        attributes: models.RolePermission.attributes.lite
      }
    ]
  }
]
const hierarchy = {
  Organization: {
    columnId: 'organization_id',
    parent: null,
    service: organizationsService,
    roleModel: models.UserOrganizationRole
  },
  Project: {
    columnId: 'project_id',
    parent: 'Organization',
    service: projectsService,
    roleModel: models.UserProjectRole
  },
  Stream: {
    columnId: 'stream_id',
    parent: 'Project',
    service: streamsService,
    roleModel: models.UserStreamRole
  }
}
const itemModelNames = Object.keys(hierarchy)

/**
 * Returns true if the user has permission for the subject
 * @param {string} type
 * @param {number} userId
 * @param {string} itemOrId item id or item model item
 * @param {string} itemModelName model class name
 */
async function hasPermission (type, userId, itemOrId, itemModelName) {
  const permissions = await getPermissions(userId, itemOrId, itemModelName)
  return permissions.includes(type)
}

/**
 * Returns true if the user has permission for the subject
 * @param {number} userOrId
 * @param {string} itemOrId item id or item model item
 * @param {string} itemModelName model class name
 */
async function getPermissions (userOrId, itemOrId, itemModelName) {
  const isId = typeof itemOrId === 'string'
  const userIsPrimitive = ['string', 'number'].includes(typeof userOrId)
  const userId = userIsPrimitive ? userOrId : userOrId.owner_id
  if (isId && !itemModelName) {
    throw new Error('RolesService: getPermissions: missing required parameter "itemModelName"')
  }
  if (!itemModelNames.includes(itemModelName)) {
    throw new Error(`RolesService: invalid value for "itemModelName" parameter: "${itemModelName}"`)
  }
  let item = await (isId ? hierarchy[itemModelName].service.getById(itemOrId) : Promise.resolve(itemOrId))
  if (!item) {
    throw new EmptyResultError(`${itemModelName} with given id doesn't exist.`)
  }
  const user = await (userIsPrimitive ? usersFusedService.getByParams({ id: userId }) : Promise.resolve(userOrId))
  if (user.is_super || item.created_by_id === userId) {
    return ['C', 'R', 'U', 'D']
  }

  var permissions = []
  let currentLevel = hierarchy[itemModelName]
  while (currentLevel) {
    // try to find role for requested item
    const itemRole = await currentLevel.roleModel.findOne({
      where: {
        user_id: userId,
        [currentLevel.columnId]: item.id
      },
      include: roleBaseInclude
    })
    if (itemRole && itemRole.role) {
      // if role is found, check permissions of this role
      permissions = (itemRole.role.permissions || []).map(x => x.permission)
      break
    } else if (!itemRole && currentLevel.parent) {
      const parentColumnId = `${currentLevel.parent.toLowerCase()}_id`
      // if current item is not the first in level hierarchy, request its parent item
      if (item[parentColumnId]) {
        item = await models[currentLevel.parent].findOne({
          where: {
            id: item[parentColumnId]
          }
        })
        if (item) {
          currentLevel = hierarchy[currentLevel.parent]
        }
      } else {
        break
      }
    } else {
      // nothing is found
      break
    }
  }
  if (!permissions.length && item.is_public) {
    permissions = ['R']
  }
  return permissions
}

module.exports = {
  hasPermission,
  getPermissions
}
