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
 * @param {number} userId
 * @param {string} itemOrId item id or item model item
 * @param {string} type
 */
async function hasPermission (type, userId, itemOrId, itemModelName) {
  const isId = typeof itemOrId === 'string'
  if (isId && !itemModelName) {
    throw new Error('RolesService: hasPermission: missing required parameter "subjectModel"')
  }
  if (!itemModelNames.includes(itemModelName)) {
    throw new Error(`RolesService: invalid value for "itemModelName" parameter: "${itemModelName}"`)
  }
  let item = await (isId ? hierarchy[itemModelName].service.getById(itemOrId) : Promise.resolve(itemOrId))
  if (!item) {
    throw new EmptyResultError(`${itemModelName} with given id doesn't exist.`)
  }
  const user = await usersFusedService.getByParams({ id: userId })
  if (user.is_super || item.created_by_id === userId || (item.is_public && type === 'R')) {
    return true
  }

  var allow = false
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
      allow = !!(itemRole.role.permissions || []).find((per) => {
        return per.permission === type
      })
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
      }
    } else {
      // nothing is found, deny
      break
    }
  }

  return allow
}

module.exports = {
  hasPermission
}
