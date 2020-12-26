const { Organization, Sequelize, User } = require('../../modelsTimescale')
const { ForbiddenError, ValidationError } = require('../../utils/errors')
const { hasPermission, getSharedObjectsIDs, ORGANIZATION, READ, UPDATE, DELETE } = require('../roles')
const { hash } = require('../../utils/misc/hash.js')
const pagedQuery = require('../../utils/db/paged-query')

// TODO: move to model definition (find out how to ref User from Organization)
const availableIncludes = [
  {
    model: User,
    as: 'created_by',
    attributes: User.attributes.lite
  }
]

/**
 * Create an organization
 * @param {*} organization
 * @param {string} organization.name
 * @param {boolean} organization.isPublic
 */
function create (organization) {
  if (!organization.id) {
    organization.id = hash.randomString(12)
  }
  return Organization.create(organization).catch(error => {
    if (error instanceof Sequelize.UniqueConstraintError && error.fields.name) {
      throw new ValidationError('Organization name already exists')
    }
    throw error
  })
}

/**
 * Get organization by id
 * @param {string} id
 * @param {*} options Additional get options
 * @param {number} options.readableBy Include only if organization is accessible to the given user id
 * @param {string[]} options.fields Attributes and relations to include in results (defaults to all)
 * @returns {*} organization model item
 * @throws EmptyResultError when organization not found
 * @throws ForbiddenError when `readableBy` user does not have read permission on the organization
 */
async function get (id, options = {}) {
  if (options.readableBy && !(await hasPermission(READ, options.readableBy, id, ORGANIZATION))) {
    throw new ForbiddenError()
  }
  const attributes = options.fields && options.fields.length > 0 ? Organization.attributes.full.filter(a => options.fields.includes(a)) : Organization.attributes.full
  const includes = options.fields && options.fields.length > 0 ? availableIncludes.filter(i => options.fields.includes(i.as)) : availableIncludes

  return Organization
    .findOne({
      where: { id },
      attributes,
      include: includes,
      paranoid: false
    })
}

/**
 * Get a list of organizations matching the conditions
 * @param {*} filters Organization attributes to filter
 * @param {string} filters.keyword Filter by keyword (in the organization name)
 * @param {*} options Query options
 * @param {number} options.readableBy Include only organizations accessible to the given user id
 * @param {number} options.createdBy Include only organizations created by the given user id
 * @param {boolean} options.onlyPublic Include only public organizations
 * @param {boolean} options.onlyDeleted Include only deleted organizations
 * @param {string[]} options.fields Attributes and relations to include in results
 * @param {number} options.limit Maximum results to include
 * @param {number} options.offset Number of results to skip
 */
async function query (filters, options = {}) {
  const where = {}
  if (filters.keyword) {
    where.name = {
      [Sequelize.Op.iLike]: `%${filters.keyword}%`
    }
  }

  if (options.readableBy) {
    where.id = {
      [Sequelize.Op.in]: await getSharedObjectsIDs(options.readableBy, ORGANIZATION)
    }
  }

  if (options.createdBy) {
    where.created_by_id = options.createdBy
  }

  if (options.onlyPublic) {
    where.is_public = true
  }

  if (options.onlyDeleted) {
    where.deleted_at = {
      [Sequelize.Op.ne]: null
    }
  }

  const attributes = options.fields && options.fields.length > 0 ? Organization.attributes.full.filter(a => options.fields.includes(a)) : Organization.attributes.lite
  const includes = options.fields && options.fields.length > 0 ? availableIncludes.filter(i => options.fields.includes(i.as)) : []

  return pagedQuery(Organization, {
    where,
    attributes,
    include: includes,
    limit: options.limit,
    offset: options.offset,
    paranoid: options.onlyDeleted
  })
}

/**
 * Update organization
 * @param {string} id
 * @param {Organization} organization Organization
 * @param {*} options Additional restore options
 * @param {number} options.updatableBy Include only if organization is updatable by the given user id
 * @throws EmptyResultError when organization not found
 * @throws ForbiddenError when `updatableBy` user does not have update permission on the organization
 */
async function update (id, organization, options = {}) {
  if (options.updatableBy && !(await hasPermission(UPDATE, options.updatableBy, id, ORGANIZATION))) {
    throw new ForbiddenError()
  }
  return Organization.update(organization, {
    where: { id }
  })
}

/**
 * Delete organization
 * @param {string} id
 * @param {*} options Additional delete options
 * @param {number} options.deletableBy Include only if organization is deletable to the given user id
 * @param {boolean} options.force Remove from the database (not soft-delete)
 * @param {boolean} options.undo Restore a deleted organization
 * @throws EmptyResultError when organization not found
 * @throws ForbiddenError when `deletableBy` user does not have delete permission on the organization
 */
async function remove (id, options = {}) {
  if (options.deletableBy && !(await hasPermission(DELETE, options.deletableBy, id, ORGANIZATION))) {
    throw new ForbiddenError()
  }
  return options.undo
    ? Organization.restore({
      where: { id }
    }) : Organization.destroy({
      where: { id },
      force: options.force
    })
}

module.exports = {
  create,
  get,
  query,
  update,
  remove
}
