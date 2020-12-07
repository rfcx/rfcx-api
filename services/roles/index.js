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

const OrganizationInclude = [
  {
    model: models.Organization,
    as: 'organization',
    attributes: models.Organization.attributes.lite,
    required: true,
    include: [
      {
        model: models.Project,
        as: 'projects',
        attributes: models.Project.attributes.lite,
        required: true,
        include: [
          {
            model: models.Stream,
            as: 'streams',
            attributes: ['id'],
            required: true
          }
        ]
      }
    ]
  }
]

const ProjectInclude = [
  {
    model: models.Project,
    as: 'project',
    attributes: models.Project.attributes.lite,
    required: true,
    include: [
      {
        model: models.Stream,
        as: 'streams',
        attributes: models.Stream.attributes.lite,
        required: true
      }
    ]
  }
]

const StreamInclude = [
  {
    model: models.Stream,
    as: 'stream',
    attributes: models.Stream.attributes.lite
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

async function getSharedObjectsIDs (userOrId, itemModelName) {
  const userIsPrimitive = ['string', 'number'].includes(typeof userOrId)
  const userId = userIsPrimitive ? userOrId : userOrId.owner_id

  const proms = []
  while (itemModelName) {
    (function (currentItemModelName) {
      const prom = hierarchy[currentItemModelName].roleModel.findAll({
        where: { user_id: userId },
        include: [
          ...(currentItemModelName === 'Organization' ? OrganizationInclude : []),
          ...(currentItemModelName === 'Project' ? ProjectInclude : []),
          ...(currentItemModelName === 'Stream' ? StreamInclude : [])
        ]
      })
        .then(async (userRoles) => {
          let result = userRoles
            .map(x => x[currentItemModelName.toLowerCase()])
          if (currentItemModelName === 'Organization') {
            result = result
              .reduce((arr, org) => {
                return arr.concat(org.projects || [])
              }, [])
              .reduce((arr, proj) => {
                return arr.concat(proj.streams || [])
              }, [])
          } else if (currentItemModelName === 'Project') {
            result = result
              .reduce((arr, proj) => {
                return arr.concat(proj.streams || [])
              }, [])
          }
          return result.map(x => x.id)
        })
      proms.push(prom)
    }(itemModelName))
    if (hierarchy[itemModelName].parent) {
      itemModelName = hierarchy[itemModelName].parent
    } else {
      itemModelName = null
    }
  }

  const promsResults = await Promise.all(proms)
  return [...new Set([...promsResults[0], ...promsResults[1], ...promsResults[2]])]
}

module.exports = {
  hasPermission,
  getPermissions,
  getSharedObjectsIDs
}
