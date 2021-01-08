const models = require('../../modelsTimescale')
const usersFusedService = require('../users/fused')
const EmptyResultError = require('../../utils/converter/empty-result-error')

const ORGANIZATION = 'organization'
const PROJECT = 'project'
const STREAM = 'stream'

const CREATE = 'C'
const READ = 'R'
const UPDATE = 'U'
const DELETE = 'D'

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
  [ORGANIZATION]: {
    columnId: 'organization_id',
    parent: null,
    model: models.Organization,
    roleModel: models.UserOrganizationRole
  },
  [PROJECT]: {
    columnId: 'project_id',
    parent: ORGANIZATION,
    model: models.Project,
    roleModel: models.UserProjectRole
  },
  [STREAM]: {
    columnId: 'stream_id',
    parent: PROJECT,
    model: models.Stream,
    roleModel: models.UserStreamRole
  }
}

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
 * @param {string} type `CREATE` or `READ` or `UPDATE` or `DELETE`
 * @param {number} userId
 * @param {string} itemOrId item id or item
 * @param {string} itemName `STREAM` or `PROJECT` or `ORGANIZATION`
 */
async function hasPermission (type, userId, itemOrId, itemName) {
  const permissions = await getPermissions(userId, itemOrId, itemName)
  return permissions.includes(type)
}

/**
 * Returns true if the user has permission for the subject
 * @param {string | object} itemOrId item id or item
 * @param {string} itemName `STREAM` or `PROJECT` or `ORGANIZATION`
 */
async function getPermissions (userOrId, itemOrId, itemName) {
  const isId = typeof itemOrId === 'string'
  const userIsPrimitive = ['string', 'number'].includes(typeof userOrId)
  const userId = userIsPrimitive ? userOrId : userOrId.owner_id
  if (isId && !itemName) {
    throw new Error('RolesService: getPermissions: missing required parameter "itemName"')
  }
  if (!Object.keys(hierarchy).includes(itemName)) {
    throw new Error(`RolesService: invalid value for "itemModelName" parameter: "${itemName}"`)
  }
  let item = await (isId ? models[itemName].findOne({
    where: { id: itemOrId },
    paranoid: false
  }) : Promise.resolve(itemOrId))
  if (!item) {
    throw new EmptyResultError(`${itemName} with given id doesn't exist.`)
  }
  const user = await (userIsPrimitive ? usersFusedService.getByParams({ id: userId }) : Promise.resolve(userOrId))
  if (user.is_super || item.created_by_id === userId) {
    return [CREATE, READ, UPDATE, DELETE]
  }

  var permissions = []
  let currentLevel = hierarchy[itemName]
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
    permissions = [READ]
  }
  return permissions
}

/**
 * Returns ids of all Organizations or Projects or Streams (based on specified itemModelName) which are accessible for user
 * based on his direct roles assigned to these objects or roles which assigned to parent objects (e.g. user will have access
 * to all Streams of the Project he has access to)
 * @param {string} userId The user for which the objects are accessible
 * @param {string} itemName Type of object:`STREAM` or `PROJECT` or `ORGANIZATION`
 * @param {string[]} inIds Subset of object ids to select from
 */
async function getAccessibleObjectsIDs (userId, itemName, inIds) {
  const select = `SELECT DISTINCT ${itemName}.id FROM ${itemName}s ${itemName}`
  const joins = [
    `LEFT JOIN user_${itemName}_roles ${itemName}r ON ${itemName}.id = ${itemName}r.${itemName}_id`
  ]
  const wheres = [
    `${itemName}r.user_id = :userId`,
    `${itemName}.created_by_id = :userId`
  ]
  if (itemName === STREAM) {
    joins.push(...[
      `LEFT JOIN projects project ON ${itemName}.project_id = project.id`,
      'LEFT JOIN user_project_roles projectr ON project.id = projectr.project_id'
    ])
    wheres.push('projectr.user_id = :userId')
    wheres.push('project.created_by_id = :userId')
  }
  if (itemName === STREAM || itemName === PROJECT) {
    joins.push(...[
      'LEFT JOIN organizations organization ON project.organization_id = organization.id',
      'LEFT JOIN user_organization_roles organizationr ON organization.id = organizationr.organization_id'
    ])
    wheres.push('organizationr.user_id = :userId')
    wheres.push('organization.created_by_id = :userId')
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
  ORGANIZATION,
  PROJECT,
  STREAM,
  CREATE,
  READ,
  UPDATE,
  DELETE
}
