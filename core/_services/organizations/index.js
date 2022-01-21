const { Organization, Sequelize, User } = require('../../../models')
const { ForbiddenError, ValidationError } = require('../../../utils/errors')
const { hasPermission, getAccessibleObjectsIDs, ORGANIZATION, CREATE, READ, UPDATE, DELETE } = require('../roles')
const { randomId } = require('../../../utils/misc/hash')
const pagedQuery = require('../../_utils/db/paged-query')
const { getSortFields } = require('../../_utils/db/sort')

const availableIncludes = [User.include({ as: 'created_by' })]

/**
 * Create an organization
 * @param {*} organization
 * @param {string} organization.name
 * @param {boolean} organization.isPublic
 * @param {*} options Additional get options
 * @param {number} options.creatableBy Allow only if the given user id has permission to create
 */
async function create (organization, options = {}) {
  if (options.creatableBy && !(await hasPermission(CREATE, options.creatableBy, undefined, ORGANIZATION))) {
    throw new ForbiddenError()
  }

  if (!organization.id) {
    organization.id = randomId()
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

  const organization = await Organization.findOne({
    where: { id },
    attributes,
    include: includes,
    paranoid: false
  })

  return organization !== null ? organization.toJSON() : null
}

/**
 * Get a list of organizations matching the conditions
 * @param {*} filters Organization attributes to filter
 * @param {string} filters.keyword Where keyword is found (in the organization name)
 * @param {number} filters.createdBy Where created by the given user id
 * @param {*} options Query options
 * @param {number} options.readableBy Include only organizations readable by the given user id
 * @param {boolean} options.onlyPublic Include only public organizations
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
  if (filters.createdBy) {
    where.created_by_id = filters.createdBy
  }

  // Options (change behaviour - mix with care)
  if (options.onlyPublic) {
    where.is_public = true
  } else {
    if (options.readableBy) {
      where.id = {
        [Sequelize.Op.in]: await getAccessibleObjectsIDs(options.readableBy, ORGANIZATION)
      }
    }
    if (options.onlyDeleted) {
      where.deleted_at = {
        [Sequelize.Op.ne]: null
      }
    }
  }

  const attributes = options.fields && options.fields.length > 0 ? Organization.attributes.full.filter(a => options.fields.includes(a)) : Organization.attributes.lite
  const include = options.fields && options.fields.length > 0 ? availableIncludes.filter(i => options.fields.includes(i.as)) : []
  const order = getSortFields(options.sort || '-updated_at')

  return pagedQuery(Organization, {
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
 * Update organization
 * @param {string} id
 * @param {Organization} organization Organization
 * @param {*} options
 * @param {number} options.updatableBy Update only if organization is updatable by the given user id
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
 * @param {number} options.deletableBy Perform only if organization is deletable by the given user id
 * @param {boolean} options.force Remove from the database (not soft-delete)
 * @throws ForbiddenError when `deletableBy` user does not have delete permission on the organization
 */
async function remove (id, options = {}) {
  if (options.deletableBy && !(await hasPermission(DELETE, options.deletableBy, id, ORGANIZATION))) {
    throw new ForbiddenError()
  }
  return Organization.destroy({ where: { id }, force: options.force })
}

/**
 * Restore deleted organization
 * @param {string} id
 * @param {*} options Additional restore options
 * @param {number} options.deletableBy Perform only if organization is deletable by the given user id
 * @throws ForbiddenError when `deletableBy` user does not have delete permission on the organization
 */
async function restore (id, options = {}) {
  if (options.deletableBy && !(await hasPermission(DELETE, options.deletableBy, id, ORGANIZATION))) {
    throw new ForbiddenError()
  }
  return Organization.restore({ where: { id } })
}

module.exports = {
  create,
  get,
  query,
  update,
  remove,
  restore
}
