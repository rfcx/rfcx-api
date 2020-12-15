const models = require('../../modelsTimescale')
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
    roleModel: models.UserOrganizationRole
  },
  Project: {
    columnId: 'project_id',
    parent: 'Organization',
    roleModel: models.UserProjectRole
  },
  Stream: {
    columnId: 'stream_id',
    parent: 'Project',
    roleModel: models.UserStreamRole
  }
}
const itemModelNames = Object.keys(hierarchy)

/**
 * Returns true if the user has permission for the subject
 * @param {string} type
 * @param {number} userId
 * @param {string} itemOrId item id or item
 * @param {string} itemModelName model class name
 */
async function hasPermission (type, userId, itemOrId, itemModelName) {
  const permissions = await getPermissions(userId, itemOrId, itemModelName)
  return permissions.includes(type)
}

/**
 * Returns true if the user has permission for the subject
 * @param {string | object} itemOrId item id or item
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
  let item = await (isId ? models[itemModelName].findOne({ where: { id: itemOrId } }) : Promise.resolve(itemOrId))
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

/**
 * Returns ids of all Organizations or Projects or Streams (based on specified itemModelName) which are accessible for user
 * based on his direct roles assigned to these objects or roles which assigned to parent objects (e.g. user will have access
 * to all Streams of the Project he has access to)
 * @param {string | object} itemOrId item id or model item
 * @param {string} itemName item name
 */
async function getSharedObjectsIDs (userOrId, itemName) {
  const userIsPrimitive = ['string', 'number'].includes(typeof userOrId)
  const userId = userIsPrimitive ? userOrId : userOrId.owner_id

  const select = `SELECT DISTINCT ${itemName}.id FROM ${itemName}s ${itemName}`
  const joins = [
    `LEFT JOIN user_${itemName}_roles ${itemName}r ON ${itemName}.id = ${itemName}r.${itemName}_id`
  ]
  const wheres = [
    `${itemName}r.user_id = $userId`
  ]
  if (itemName === 'stream') {
    joins.push(...[
      `LEFT JOIN projects project ON ${itemName}.project_id = project.id`,
      'LEFT JOIN user_project_roles projectr ON project.id = projectr.project_id'
    ])
    wheres.push('projectr.user_id = $userId')
  }
  if (itemName === 'stream' || itemName === 'project') {
    joins.push(...[
      'LEFT JOIN organizations organization ON project.organization_id = organization.id',
      'LEFT JOIN user_organization_roles organizationr ON organization.id = organizationr.organization_id'
    ])
    wheres.push('organizationr.user_id = $userId')
  }
  const sql = `${select} ${joins.join(' ')} WHERE ${wheres.join(' OR ')};`
  const options = {
    raw: true,
    nest: true,
    bind: { userId }
  }
  return models.sequelize.query(sql, options)
    .then(data => data.map(x => x.id))
}

module.exports = {
  hasPermission,
  getPermissions,
  getSharedObjectsIDs
}
