const models = require('../../_models')
const usersService = require('../../../common/users')
const { EmptyResultError, ForbiddenError } = require('../../../common/error-handling/errors')

const ADMIN = 1
const MEMBER = 2
const GUEST = 3
const OWNER = 4

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
  const transaction = opts.transaction
  return models.Role
    .findOne({
      where: { name },
      attributes: models.Role.attributes.full,
      include: opts && opts.joinRelations ? roleBaseInclude : [],
      transaction
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
async function hasPermission (type, userId, itemOrId, itemName, options = {}) {
  const permissions = await getPermissions(userId, itemOrId, itemName, options)
  return permissions.includes(type)
}

/**
 * Returns true if the user has permission for the subject
 * @param {string | object} itemOrId item id or item
 * @param {string} itemName `STREAM` or `PROJECT` or `ORGANIZATION`
 */
async function getPermissions (userOrId, itemOrId, itemName, options = {}) {
  const transaction = options.transaction
  const isId = typeof itemOrId === 'string'
  const userIsPrimitive = ['string', 'number'].includes(typeof userOrId)
  const userId = userIsPrimitive ? userOrId : userOrId.id
  if (isId && !itemName) {
    throw new Error('RolesService: getPermissions: missing required parameter "itemName"')
  }
  if (!Object.keys(hierarchy).includes(itemName)) {
    throw new Error(`RolesService: invalid value for "itemName" parameter: "${itemName}"`)
  }
  let item = itemOrId
  if (isId) {
    try {
      item = (await hierarchy[itemName].model.findOne({ where: { id: itemOrId }, paranoid: false, transaction })).toJSON()
    } catch (e) {
      throw new EmptyResultError(`${itemName} with given id doesn't exist.`)
    }
  }
  const originalItem = { ...item }
  const user = await (userIsPrimitive ? usersService.getUserByParams({ id: userId }, false, { transaction }) : Promise.resolve(userOrId))
  if (user.is_super) {
    return [CREATE, READ, UPDATE, DELETE]
  }

  let permissions = []
  let currentLevel = hierarchy[itemName]
  while (currentLevel) {
    // try to find role for requested item
    const itemRole = await currentLevel.roleModel.findOne({
      where: {
        user_id: userId,
        [currentLevel.columnId]: item.id
      },
      include: userRoleBaseInclude,
      transaction
    })
    if (itemRole && itemRole.role) {
      // if role is found, check permissions of this role
      permissions = (itemRole.role.permissions || []).map(x => x.permission)
      break
    } else if (!itemRole && currentLevel.parent) {
      const parentColumnId = `${currentLevel.parent.toLowerCase()}_id`
      const parentModelName = currentLevel.parent
      // if current item is not the first in level hierarchy, request its parent item
      if (item[parentColumnId] || item[parentModelName]) {
        item = await hierarchy[currentLevel.parent].model.findOne({
          where: {
            id: item[parentColumnId] || item[parentModelName].id
          },
          paranoid: false,
          transaction
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
  if (!permissions.length && originalItem.isPublic) {
    permissions = [READ]
  }
  return permissions
}

/**
 * Returns object of permissions from passed projects
 * @param {string[]} projectIds The list of project id
 * @param {string} userId The user for which the projects are accessible
 */
async function getPermissionsForProjects (projectIds, userId) {
  if (!projectIds.length) {
    return {}
  }
  const projectsSql = 'SELECT id, organization_id, created_by_id FROM projects WHERE id IN (:projectIds)'
  const projectsResult = await models.sequelize.query(projectsSql, { replacements: { projectIds }, type: models.sequelize.QueryTypes.SELECT })

  const organizationIds = projectsResult.map(p => p.organization_id)
  const organizationPerms = await getPermissionsForObjects(ORGANIZATION, organizationIds, userId)

  const permObject = {}
  const excludedProjectIds = []

  projectsResult.forEach(p => {
    if (p.organization_id) {
      permObject[p.id] = organizationPerms[p.organization_id]
    }
    excludedProjectIds.push(p.id)
  })
  const projectPerms = await getPermissionsForObjects(PROJECT, excludedProjectIds, userId)

  return { ...permObject, ...projectPerms }
}

/**
 * Returns object of permissions from passed objects
 * @param {string} itemName Type of object:`STREAM` or `PROJECT` or `ORGANIZATION`
 * @param {string[]} inIds Subset of object ids to select from
 * @param {string} userId The user for which the projects are accessible
 */
async function getPermissionsForObjects (itemName, inIds, userId, options = {}) {
  const transaction = options.transaction
  if (!inIds.length) {
    return {}
  }
  const select = `SELECT ${itemName}r.${itemName}_id, rp.permission FROM user_${itemName}_roles ${itemName}r`
  const join = `JOIN role_permissions rp on ${itemName}r.role_id = rp.role_id`
  const where = `WHERE ${itemName}r.${itemName}_id IN (:inIds) AND ${itemName}r.user_id = ${userId}`
  const sql = `${select} ${join} ${where}`

  return models.sequelize.query(sql, { replacements: { inIds }, type: models.sequelize.QueryTypes.SELECT, transaction })
    .then(data => {
      return data.reduce((result, row) => {
        result[row[`${itemName}_id`]] = (result[row[`${itemName}_id`]] || []).concat(row.permission)
        return result
      }, {})
    })
}

/**
 * Returns ids of all Organizations or Projects or Streams (based on specified itemModelName) which are accessible for user
 * based on his direct roles assigned to these objects or roles which assigned to parent objects (e.g. user will have access
 * to all Streams of the Project he has access to)
 * @param {string} userId The user for which the objects are accessible
 * @param {string} itemName Type of object:`STREAM` or `PROJECT` or `ORGANIZATION`
 * @param {string[]} inIds Subset of object ids to select from
 * @param {string} permission Required permission "R" by default
 */
async function getAccessibleObjectsIDs (userId, itemName, inIds, permission = READ, includePublic = false, options = {}) {
  const transaction = options.transaction
  const select = `SELECT DISTINCT ${itemName}.id FROM ${itemName}s ${itemName}`
  const joins = [
    `LEFT JOIN user_${itemName}_roles ${itemName}r ON ${itemName}.id = ${itemName}r.${itemName}_id AND ${itemName}r.user_id = ${userId}`,
    `LEFT JOIN role_permissions ${itemName}perm ON ${itemName}r.role_id = ${itemName}perm.role_id`
  ]
  const wheres = [
    `${itemName}.created_by_id = :userId`,
    `${itemName}perm.permission = '${permission}'`
  ]
  if (itemName === STREAM) {
    joins.push(...[
      `LEFT JOIN projects project ON ${itemName}.project_id = project.id`,
      `LEFT JOIN user_project_roles projectr ON project.id = projectr.project_id AND projectr.user_id = ${userId}`,
      'LEFT JOIN role_permissions projectperm ON projectr.role_id = projectperm.role_id'
    ])
    wheres.push('project.created_by_id = :userId')
    wheres.push(`projectperm.permission = '${permission}'`)
  }
  if (itemName === STREAM || itemName === PROJECT) {
    joins.push(...[
      'LEFT JOIN organizations organization ON project.organization_id = organization.id',
      `LEFT JOIN user_organization_roles organizationr ON organization.id = organizationr.organization_id AND organizationr.user_id = ${userId}`,
      'LEFT JOIN role_permissions organizationperm ON organizationr.role_id = organizationperm.role_id'
    ])
    if (includePublic) {
      wheres.push(`${itemName}.is_public = true`)
    }
    wheres.push('organization.created_by_id = :userId')
    wheres.push(`organizationperm.permission = '${permission}'`)
  }
  let sql = `${select} ${joins.join(' ')} WHERE (${wheres.join(' OR ')})`
  if (inIds && inIds.length) {
    sql += ` AND ${itemName}.id IN (:inIds)`
  }
  return models.sequelize.query(sql, { replacements: { userId, inIds }, type: models.sequelize.QueryTypes.SELECT, transaction })
    .then(data => data.map(x => x.id))
}

/**
 * Returns list of users with their role and permissions for specified item
 * @param {string} id item id
 * @param {string} itemModelName item model name (e.g. Stream, Project, Organization)
 * @param {*} filters Additional get filters
 * @param {string[]} options.includeRoles Include only if user role is in the given roles
 * @param {string[]} options.permissions Include only if user has permissions in the given permissions
 */
function getUsersForItem (id, itemName, filters) {
  if (!Object.keys(hierarchy).includes(itemName)) {
    throw new Error(`RolesService: invalid value for "itemModelName" parameter: "${itemName}"`)
  }
  return hierarchy[itemName].roleModel.findAll({
    where: {
      [hierarchy[itemName].columnId]: id
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
      if (filters.includeRoles) {
        items = items.filter(item => {
          return filters.includeRoles.includes(item.role.name)
        })
      }
      if (filters.permissions) {
        items = items.filter(item => {
          const permissions = item.role.permissions.map(x => x.permission)
          for (const permission of filters.permissions) {
            if (!permissions.includes(permission)) {
              return false
            }
          }
          return true
        })
      }
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
 * @param {object} options.transaction Sequelize transaction object
 */
function getUserRoleForItem (id, userId, itemName, options = {}) {
  const transaction = options.transaction
  if (!Object.keys(hierarchy).includes(itemName)) {
    throw new Error(`RolesService: invalid value for "itemModelName" parameter: "${itemName}"`)
  }
  return hierarchy[itemName].roleModel.findOne({
    where: {
      [hierarchy[itemName].columnId]: id,
      user_id: userId
    },
    include: [
      ...userRoleBaseInclude,
      {
        model: models.User,
        as: 'user',
        attributes: models.User.attributes.lite
      }
    ],
    transaction
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
 * @param {string} itemName item model name (e.g. stream, project, organization)
 * @param {object} options.transaction Sequelize transaction object
 */
function addRole (userId, roleId, itemId, itemName, options = {}) {
  return models.sequelize.transaction(async (sequelizeTransaction) => {
    let transaction = sequelizeTransaction
    if (options.transaction) {
      transaction = options.transaction
    }
    const columnName = `${itemName}_id`
    const userRole = await hierarchy[itemName].roleModel.findOne({
      where: {
        [columnName]: itemId,
        user_id: userId
      },
      transaction
    })
    // check if user is Owner
    if (userRole && userRole.role_id === OWNER) {
      throw new ForbiddenError('Cannot change Owner user to below roles')
    }
    await hierarchy[itemName].roleModel.destroy({
      where: {
        [columnName]: itemId,
        user_id: userId
      },
      transaction
    })
    return hierarchy[itemName].roleModel.create({
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
 * @param {string} itemName item model name (e.g. stream, project, organization)
 */
async function removeRole (userId, itemId, itemName) {
  const columnName = `${itemName}_id`

  const userRole = await hierarchy[itemName].roleModel.findOne({
    where: {
      [columnName]: itemId,
      user_id: userId
    }
  })
  // check if user is Owner
  if (userRole && userRole.role_id === OWNER) {
    throw new ForbiddenError('Cannot remove Owner role')
  }
  return hierarchy[itemName].roleModel.destroy({
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
  getPermissionsForProjects,
  getAccessibleObjectsIDs,
  getUsersForItem,
  getUserRoleForItem,
  addRole,
  removeRole,
  ORGANIZATION,
  PROJECT,
  STREAM,
  CREATE,
  READ,
  UPDATE,
  DELETE,
  ADMIN,
  MEMBER,
  GUEST,
  OWNER
}
