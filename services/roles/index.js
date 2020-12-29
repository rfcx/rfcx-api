const models = require('../../modelsTimescale')
const usersFusedService = require('../users/fused')
const EmptyResultError = require('../../utils/converter/empty-result-error')

const userRoleBaseInclude = [
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

const roleBaseInclude = [
  {
    model: models.RolePermission,
    as: 'permissions',
    attributes: models.RolePermission.attributes.lite
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
 * Searches for role model with given name
 * @param {string} name
 * @param {*} opts additional function params
 * @returns {*} role model item
 */
function getByName (name, opts = {}) {
  return models.Role
    .findOne({
      where: { name },
      attributes: models.Role.attributes.full,
      include: opts && opts.joinRelations ? roleBaseInclude : []
    })
    .then(item => {
      if (!item) {
        throw new EmptyResultError('Role with given name not found.')
      }
      return item
    })
}

/**
 * Returns true if the user has permission for the subject
 * @param {string} type
 * @param {number} user
 * @param {string} itemOrId item id or item
 * @param {string} itemModelName model class name
 */
async function hasPermission (type, user, itemOrId, itemModelName) {
  const permissions = await getPermissions(user, itemOrId, itemModelName)
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
  let item = await (isId ? models[itemModelName].findOne({
    where: { id: itemOrId },
    paranoid: false
  }) : Promise.resolve(itemOrId))
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
      include: userRoleBaseInclude
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
          },
          paranoid: false
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
 * @param {string} userId user id
 * @param {string} itemName item name
 */
async function getAccessibleObjectsIDs (userId, itemName, createdBy = 'me', inIds) {
  const select = `SELECT DISTINCT ${itemName}.id FROM ${itemName}s ${itemName}`
  const appendMe = createdBy === 'me' || createdBy === 'all'
  const joins = [
    `LEFT JOIN user_${itemName}_roles ${itemName}r ON ${itemName}.id = ${itemName}r.${itemName}_id`
  ]
  const wheres = [
    `${itemName}r.user_id = :userId`,
    ...(appendMe ? [`${itemName}.created_by_id = :userId`] : [])
  ]
  if (itemName === 'stream') {
    joins.push(...[
      `LEFT JOIN projects project ON ${itemName}.project_id = project.id`,
      'LEFT JOIN user_project_roles projectr ON project.id = projectr.project_id'
    ])
    wheres.push(...[
      'projectr.user_id = :userId',
      ...(appendMe ? ['project.created_by_id = :userId'] : [])
    ])
  }
  if (itemName === 'stream' || itemName === 'project') {
    joins.push(...[
      'LEFT JOIN organizations organization ON project.organization_id = organization.id',
      'LEFT JOIN user_organization_roles organizationr ON organization.id = organizationr.organization_id'
    ])
    wheres.push(...[
      'organizationr.user_id = :userId',
      ...(appendMe ? ['organization.created_by_id = :userId'] : [])
    ])
  }
  let sql = `${select} ${joins.join(' ')} WHERE (${wheres.join(' OR ')})`
  if (inIds && inIds.length) {
    sql += ` AND ${itemName}.id IN (:inIds)`
  }
  return models.sequelize.query(sql, { replacements: { userId, inIds }, type: models.sequelize.QueryTypes.SELECT })
    .then(data => data.map(x => x.id))
}

/**
 * Returns list of users with their role and permissions for specified item
 * @param {string} id item id
 * @param {string} itemModelName item model name (e.g. Stream, Project, Organization)
 */
function getUsersForItem (id, itemModelName) {
  if (!itemModelNames.includes(itemModelName)) {
    throw new Error(`RolesService: invalid value for "itemModelName" parameter: "${itemModelName}"`)
  }
  return hierarchy[itemModelName].roleModel.findAll({
    where: {
      [hierarchy[itemModelName].columnId]: id
    },
    include: [
      ...userRoleBaseInclude,
      {
        model: models.User,
        as: 'user',
        attributes: models.User.attributes.lite
      }
    ]
  })
    .then((items) => {
      return items.map((item) => {
        return {
          ...item.user.toJSON(),
          role: item.role.name,
          permissions: item.role.permissions.map(x => x.permission)
        }
      })
    })
}

/**
 * Returns user info with user's role and permissions for specified item
 * @param {string} id item id
 * @param {string} userId user id
 * @param {string} itemModelName item model name (e.g. Stream, Project, Organization)
 */
function getUserRoleForItem (id, userId, itemModelName) {
  if (!itemModelNames.includes(itemModelName)) {
    throw new Error(`RolesService: invalid value for "itemModelName" parameter: "${itemModelName}"`)
  }
  return hierarchy[itemModelName].roleModel.findOne({
    where: {
      [hierarchy[itemModelName].columnId]: id,
      user_id: userId
    },
    include: [
      ...userRoleBaseInclude,
      {
        model: models.User,
        as: 'user',
        attributes: models.User.attributes.lite
      }
    ]
  })
    .then((item) => {
      if (!item) {
        throw new EmptyResultError('No roles found for given item.')
      }
      return {
        ...item.user.toJSON(),
        role: item.role.name,
        permissions: item.role.permissions.map(x => x.permission)
      }
    })
}

/**
 * Adds specified role to item for user
 * @param {string} userId user id
 * @param {string} roleId role id
 * @param {string} itemId item id
 * @param {string} itemModelName item model name (e.g. Stream, Project, Organization)
 */
function addRole (userId, roleId, itemId, itemModelName) {
  return models.sequelize.transaction(async (transaction) => {
    const columnName = `${itemModelName.toLowerCase()}_id`
    await hierarchy[itemModelName].roleModel.destroy({
      where: {
        [columnName]: itemId,
        user_id: userId
      },
      transaction
    })
    return hierarchy[itemModelName].roleModel.create({
      user_id: userId,
      [columnName]: itemId,
      role_id: roleId
    }, {
      transaction
    })
  })
}

/**
 * Removes user role for specified item
 * @param {string} userId user id
 * @param {string} itemId item id
 * @param {string} itemModelName item model name (e.g. Stream, Project, Organization)
 */
function removeRole (userId, itemId, itemModelName) {
  const columnName = `${itemModelName.toLowerCase()}_id`
  return hierarchy[itemModelName].roleModel.destroy({
    where: {
      [columnName]: itemId,
      user_id: userId
    }
  })
}

module.exports = {
  getByName,
  hasPermission,
  getPermissions,
  getAccessibleObjectsIDs,
  getUsersForItem,
  getUserRoleForItem,
  addRole,
  removeRole
}
