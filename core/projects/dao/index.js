/* eslint-disable camelcase */
const { Stream, Project, User, Organization, Sequelize } = require('../../_models')
const { ForbiddenError, EmptyResultError } = require('../../../common/error-handling/errors')
const { hasPermission, getAccessibleObjectsIDs, PROJECT, ORGANIZATION, READ, CREATE, DELETE } = require('../../roles/dao')
const { randomId } = require('../../../common/crypto/random')
const pagedQuery = require('../../_utils/db/paged-query')
const { getSortFields } = require('../../_utils/db/sort')

const availableIncludes = [
  User.include({ as: 'created_by' }),
  Organization.include({ required: false })
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
  const attributes = options.fields && options.fields.length > 0 ? Project.attributes.full.filter(a => options.fields.includes(a) || a === 'id') : Project.attributes.full
  const include = options.fields && options.fields.length > 0 ? availableIncludes.filter(i => options.fields.includes(i.as)) : availableIncludes

  const project = await Project.findOne({ where, attributes, include })

  if (project === null) {
    throw new EmptyResultError('Project not found')
  }
  if (options.readableBy && !(await hasPermission(READ, options.readableBy, project.id, PROJECT))) {
    throw new ForbiddenError()
  }
  return project.toJSON()
}

/**
 * Create a project
 * @param {*} project
 * @param {string} project.name
 * @param {string|undefined} project.description
 * @param {boolean} project.isPublic
 * @param {number} project.createdById
 * @param {string|undefined} project.organizationId
 * @param {string|undefined} project.externalId Arbimon project identifier
 * @param {*} options Additional create options
 * @param {number|undefined} options.creatableBy Allow only if the given user id has permission to create
 * @param {object} options.transaction Sequelize transaction object
 * @throws ForbiddenError when `creatableBy` user does not have create permission on the organization
 */
async function create (project, options = {}) {
  if (project.organizationId && options.creatableBy && !(await hasPermission(CREATE, options.creatableBy, project.organizationId, ORGANIZATION))) {
    throw new ForbiddenError()
  }

  if (!project.id) {
    project.id = randomId()
  }

  const { transaction } = options
  return Project.create(project, { transaction })
    .catch(error => {
      // TODO What errors do we expect here? Catch specific errors and create ValidationError for each
      throw error
    })
}

/**
 * Get a list of projects matching the conditions
 * @param {*} filters Project attributes to filter
 * @param {string} filters.keyword Where keyword is found (in the project name)
 * @param {number} filters.createdBy Where created by the given user id
 * @param {string[]} filters.organizations Where belongs to one of the organizations (array of organization ids)
 * @param {*} options Query options
 * @param {number} options.readableBy Include only organizations readable by the given user id
 * @param {boolean} options.onlyPublic Include only public organizations
 * @param {boolean} options.onlyPartner Include only public organizations
 * @param {boolean} options.onlyDeleted Include only deleted organizations
 * @param {string[]} options.fields Attributes and relations to include in results
 * @param {string} options.sort Order the results by one or more columns
 * @param {number} options.limit Maximum results to include
 * @param {number} options.offset Number of results to skip
 */
async function query (filters, options = {}) {
  const where = {}

  // Filters (restrict results - can use multiple filters safely)
  if (filters.keyword) {
    where.name = {
      [Sequelize.Op.iLike]: `%${filters.keyword}%`
    }
  }
  if (filters.organizations) {
    where.organization_id = {
      [Sequelize.Op.in]: filters.organizations
    }
  }

  if (filters.createdBy) {
    where.created_by_id = filters.createdBy
  }

  // Options (change behaviour - mix with care)
  if (options.onlyPartner) {
    where.is_partner = true
    where.is_public = true
  } else if (options.onlyPublic) {
    where.is_public = true
  } else {
    if (options.readableBy) {
      where.id = {
        [Sequelize.Op.in]: await getAccessibleObjectsIDs(options.readableBy, PROJECT)
      }
    }
    if (options.onlyDeleted) {
      where.deleted_at = {
        [Sequelize.Op.ne]: null
      }
    }
  }

  const attributes = options.fields && options.fields.length > 0 ? Project.attributes.full.filter(a => options.fields.includes(a)) : Project.attributes.lite
  const include = options.fields && options.fields.length > 0 ? availableIncludes.filter(i => options.fields.includes(i.as)) : []
  const order = getSortFields(options.sort || '-updated_at')

  return pagedQuery(Project, {
    where,
    attributes,
    include,
    order,
    limit: options.limit,
    offset: options.offset,
    paranoid: options.onlyDeleted !== true
  })
}

/**
 * Update project
 * @param {string} id
 * @param {Project} project
 * @param {string} project.name
 * @param {string} project.description
 * @param {boolean} project.is_public
 * @param {boolean} project.is_partner
 * @param {integer} project.external_id
 * @param {*} options
 * @param {object} options.transaction Sequelize transaction object
 */
async function update (id, project, options = {}) {
  const { transaction } = options
  return Project.update(project, {
    where: { id },
    transaction
  })
}

/**
 * Delete project
 * @param {string} id
 * @param {*} options Additional delete options
 * @param {number} options.deletableBy Perform only if project is deletable by the given user id
 * @param {boolean} options.force Remove from the database (not soft-delete)
 * @throws ForbiddenError when `deletableBy` user does not have delete permission on the project
 */
async function remove (id, options = {}) {
  if (options.deletableBy && !(await hasPermission(DELETE, options.deletableBy, id, PROJECT))) {
    throw new ForbiddenError()
  }
  return Project.destroy({ where: { id }, force: options.force })
}

/**
 * Restore deleted project
 * @param {*} options Additional restore options
 * @param {number} options.deletableBy Perform only if project is deletable by the given user id
 * @throws ForbiddenError when `deletableBy` user does not have delete permission on the project
 */
async function restore (id, options = {}) {
  if (options.deletableBy && !(await hasPermission(DELETE, options.deletableBy, id, PROJECT))) {
    throw new ForbiddenError()
  }
  return Project.restore({ where: { id } })
}

/**
 * Get project location by first stream related to a project
 * @param {*} id project id
 * @returns {object | null} object with latitude and longitude or null
 */
function getProjectLocation (id) {
  // TODO replace with columns in db
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

/* eslint-disable camelcase */
function formatProject (project) {
  const { id, name, description, is_public, created_at, updated_at, min_latitude, min_longitude, max_latitude, max_longitude } = project
  return {
    id,
    name,
    description,
    is_public,
    created_at,
    created_by: project.created_by || null,
    updated_at,
    organization: project.organization || null,
    min_latitude,
    min_longitude,
    max_latitude,
    max_longitude
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
  remove,
  restore,
  getProjectLocation,
  formatProject,
  formatProjects
}
