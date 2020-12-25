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
  let item = await (isId ? hierarchy[itemName].model.findOne({ where: { id: itemOrId } }) : Promise.resolve(itemOrId))
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
    permissions = [READ]
  }
  return permissions
}

/**
 * Returns ids of all Organizations or Projects or Streams (based on specified itemModelName) which are accessible for user
 * based on his direct roles assigned to these objects or roles which assigned to parent objects (e.g. user will have access
 * to all Streams of the Project he has access to)
 * @param {string} userId user id
 * @param {string} itemName `STREAM` or `PROJECT` or `ORGANIZATION`
 */
async function getSharedObjectsIDs (userId, itemName) {
  const select = `SELECT DISTINCT ${itemName}.id FROM ${itemName}s ${itemName}`
  const joins = [
    `LEFT JOIN user_${itemName}_roles ${itemName}r ON ${itemName}.id = ${itemName}r.${itemName}_id`
  ]
  const wheres = [
    `${itemName}r.user_id = $userId`
  ]
  if (itemName === STREAM) {
    joins.push(...[
      `LEFT JOIN projects project ON ${itemName}.project_id = project.id`,
      'LEFT JOIN user_project_roles projectr ON project.id = projectr.project_id'
    ])
    wheres.push('projectr.user_id = $userId')
  }
  if (itemName === STREAM || itemName === PROJECT) {
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
  getSharedObjectsIDs,
  ORGANIZATION,
  PROJECT,
  STREAM,
  CREATE,
  READ,
  UPDATE,
  DELETE
}
