const models = require('../../modelsTimescale')
const EmptyResultError = require('../../utils/converter/empty-result-error')
const ValidationError = require('../../utils/converter/validation-error')
const rolesService = require('../roles')

const baseInclude = [
  {
    model: models.User,
    as: 'created_by',
    attributes: models.User.attributes.lite
  },
  {
    model: models.Organization,
    as: 'organization',
    attributes: models.Organization.attributes.lite
  }
]

/**
 * Searches for project model with given id
 * @param {string} id
 * @param {*} opts additional function params
 * @returns {*} project model item
 */
function getById (id, opts = {}) {
  return models.Project
    .findOne({
      where: { id },
      attributes: models.Project.attributes.full,
      include: opts && opts.joinRelations ? baseInclude : [],
      paranoid: !opts.includeDeleted
    })
    .then(item => {
      if (!item) {
        throw new EmptyResultError('Project with given id not found.')
      }
      return item
    })
}

/**
 * Searches for project model with given external id
 * @param {string} id
 * @param {*} opts additional function params
 * @returns {*} project model item
 */
function getByExternalId (id, opts = {}) {
  return models.Project
    .findOne({
      where: { external_id: id },
      attributes: models.Project.attributes.full,
      include: opts && opts.joinRelations ? baseInclude : [],
      paranoid: !opts.includeDeleted
    })
    .then(item => {
      if (!item) {
        throw new EmptyResultError('Project with given external id not found.')
      }
      return item
    })
}

/**
 * Creates project item
 * @param {*} data project attributes
 * @param {*} opts additional function params
 * @returns {*} project model item
 */
function create (data, opts = {}) {
  if (!data) {
    throw new ValidationError('Cannot create project with empty object.')
  }
  const { id, name, description, is_public, organization_id, created_by_id, external_id } = data // eslint-disable-line camelcase
  return models.Project
    .create({ id, name, description, is_public, organization_id, created_by_id, external_id })
    .then(item => { return opts && opts.joinRelations ? item.reload({ include: baseInclude }) : item })
    .catch((e) => {
      console.error('Projects service -> create -> error', e)
      throw new ValidationError('Cannot create project with provided data.')
    })
}

/**
 * Returns list of projects with total number filtered by specified attributes
 * @param {*} attrs project attributes
 * @param {*} opts additional function params
 */
async function query (attrs, opts = {}) {
  const where = {}
  if (attrs.keyword) {
    where.name = {
      [models.Sequelize.Op.iLike]: `%${attrs.keyword}%`
    }
  }

  if (attrs.is_public === true) {
    where.is_public = true
  }

  if (attrs.created_by === 'me') {
    where.created_by_id = attrs.current_user_id
  } else if (attrs.created_by === 'collaborators') {
    if (!attrs.current_user_is_super) {
      const ids = await rolesService.getAccessibleObjectsIDs(attrs.current_user_id, 'project', 'collaborators')
      where.id = {
        [models.Sequelize.Op.in]: ids
      }
    }
  } else if (attrs.current_user_id !== undefined) {
    where[models.Sequelize.Op.or] = [{
      [models.Sequelize.Op.and]: {
        created_by_id: attrs.current_user_id,
        ...attrs.is_public !== undefined && { is_public: attrs.is_public }
      }
    }]
    if (attrs.is_public !== false) {
      where[models.Sequelize.Op.or].push(
        {
          [models.Sequelize.Op.and]: {
            is_public: true,
            created_by_id: {
              [models.Sequelize.Op.ne]: attrs.current_user_id
            }
          }
        }
      )
    }
  }

  if (attrs.is_deleted === true) { // user can get only personal deleted projects
    where.created_by_id = attrs.current_user_id
    where.deleted_at = {
      [models.Sequelize.Op.ne]: null
    }
  }

  const method = (!!attrs.limit || !!attrs.offset) ? 'findAndCountAll' : 'findAll' // don't use findAndCountAll if we don't need to limit and offset
  return models.Project[method]({
    where,
    limit: attrs.limit,
    offset: attrs.offset,
    attributes: models.Project.attributes.lite,
    include: opts.joinRelations ? baseInclude : [],
    paranoid: attrs.is_deleted !== true
  })
    .then((data) => {
      return {
        count: method === 'findAndCountAll' ? data.count : data.length,
        projects: method === 'findAndCountAll' ? data.rows : data
      }
    })
}

/**
 * Updates existing project item
 * @param {*} project project model item
 * @param {*} data attributes to update
 * @param {*} opts additional function params
 * @returns {*} project model item
 */
function update (project, data, opts = {}) {
  ['name', 'description', 'is_public', 'external_id'].forEach((attr) => {
    if (data[attr] !== undefined) {
      project[attr] = data[attr]
    }
  })
  return project
    .save()
    .then(item => { return opts && opts.joinRelations ? item.reload({ include: baseInclude }) : item })
    .catch((e) => {
      console.error('Projects service -> update -> error', e)
      throw new ValidationError('Cannot update project with provided data.')
    })
}

/**
 * Deletes project softly
 * @param {*} project project model item
 */
function softDelete (project) {
  return project.destroy()
    .catch((e) => {
      console.error('Projects service -> softDelete -> error', e)
      throw new ValidationError('Cannot delete project.')
    })
}

/**
 * Restore deleted project
 * @param {*} project project model item
 */
function restore (project) {
  return project.restore()
    .catch((e) => {
      console.error('Projects service -> restore -> error', e)
      throw new ValidationError('Cannot restore project.')
    })
}

function formatProject (project) {
  const { id, name, description, is_public, created_at, updated_at } = project // eslint-disable-line camelcase
  return {
    id,
    name,
    description,
    is_public,
    created_at,
    created_by: project.created_by || null,
    updated_at,
    organization: project.organization || null
  }
}

function formatProjects (data) {
  return data.map((item) => {
    return formatProject(item)
  })
}

module.exports = {
  getById,
  getByExternalId,
  create,
  query,
  update,
  softDelete,
  restore,
  formatProject,
  formatProjects
}
