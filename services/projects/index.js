const { Stream, Project, User, Organization, Sequelize } = require('../../modelsTimescale')
const { ForbiddenError, ValidationError, EmptyResultError } = require('../../utils/errors')
const { hasPermission, getAccessibleObjectsIDs, PROJECT, READ } = require('../roles')

const availableIncludes = [
  User.include('created_by'), Organization.include()
]

/**
 * Get a single project by id or where clause
 * @param {string|object} idOrWhere
 * @param {*} options Additional get options
 * @param {number} options.readableBy Include only if project is accessible to the given user id
 * @param {string[]} options.fields Attributes and relations to include in results (defaults to all)
 * @returns {Project} project model item
 * @throws EmptyResultError when project not found
 * @throws ForbiddenError when `readableBy` user does not have read permission on the project
 */
async function get (idOrWhere, options = {}) {
  const where = typeof idOrWhere === 'string' ? { id: idOrWhere } : idOrWhere
  const attributes = options.fields && options.fields.length > 0 ? Project.attributes.full.filter(a => options.fields.includes(a)) : Project.attributes.full
  const include = options.fields && options.fields.length > 0 ? availableIncludes.filter(i => options.fields.includes(i.as)) : availableIncludes

  const project = await Project.findOne({ where, attributes, include, paranoid: false })

  if (!project) {
    throw new EmptyResultError('Project not found')
  }
  if (options.readableBy && !(await hasPermission(READ, options.readableBy, project.id, PROJECT))) {
    throw new ForbiddenError()
  }
  return project
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
  return Project
    .create({ id, name, description, is_public, organization_id, created_by_id, external_id })
    .then(item => { return opts && opts.joinRelations ? item.reload({ include: availableIncludes }) : item })
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
      [Sequelize.Op.iLike]: `%${attrs.keyword}%`
    }
  }

  if (attrs.is_public === true) {
    where.is_public = true
  }

  if (attrs.is_partner === true) {
    where.is_partner = true
  }

  if (attrs.created_by === 'me') {
    where.created_by_id = attrs.current_user_id
  } else if (attrs.created_by === 'collaborators') {
    if (!attrs.current_user_is_super) {
      const ids = await getAccessibleObjectsIDs(attrs.current_user_id, PROJECT)
      where.id = {
        [Sequelize.Op.in]: ids
      }
    }
  } else if (attrs.current_user_id !== undefined) {
    where[Sequelize.Op.or] = [{
      [Sequelize.Op.and]: {
        created_by_id: attrs.current_user_id,
        ...attrs.is_public !== undefined && { is_public: attrs.is_public }
      }
    }]
    if (attrs.is_public !== false) {
      where[Sequelize.Op.or].push(
        {
          [Sequelize.Op.and]: {
            is_public: true,
            created_by_id: {
              [Sequelize.Op.ne]: attrs.current_user_id
            }
          }
        }
      )
    }
  }

  if (attrs.is_deleted === true) { // user can get only personal deleted projects
    where.created_by_id = attrs.current_user_id
    where.deleted_at = {
      [Sequelize.Op.ne]: null
    }
  }

  if (attrs.organization_id) {
    where.organization_id = {
      [Sequelize.Op.in]: attrs.organization_id
    }
  }

  const method = (!!attrs.limit || !!attrs.offset) ? 'findAndCountAll' : 'findAll' // don't use findAndCountAll if we don't need to limit and offset
  return Project[method]({
    where,
    limit: attrs.limit,
    offset: attrs.offset,
    attributes: opts.attributes || Project.attributes.lite,
    include: opts.joinRelations ? availableIncludes : [],
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
    .then(item => { return opts && opts.joinRelations ? item.reload({ include: availableIncludes }) : item })
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

/**
 * Get project location by first stream related to a project
 * @param {*} id project id
 * @returns {object | null} object with latitude and longitude or null
 */
function getProjectLocation (id) {
  return Stream.findOne({
    where: {
      project_id: id
    },
    attributes: ['latitude', 'longitude']
  }).then((data) => {
    if (!data) {
      return null
    }
    const { latitude, longitude } = data
    return { latitude, longitude }
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
  get,
  create,
  query,
  update,
  softDelete,
  restore,
  getProjectLocation,
  formatProject,
  formatProjects
}
