const { Stream, Project, User, Sequelize } = require('../../_models')
const { escape } = require('sequelize/lib/sql-string')
const { ForbiddenError, ValidationError, EmptyResultError } = require('../../../common/error-handling/errors')
const crg = require('country-reverse-geocoding').country_reverse_geocoding()
const projectsService = require('../../projects/dao')
const { getAccessibleObjectsIDs, hasPermission, STREAM, PROJECT, READ, UPDATE, DELETE } = require('../../roles/dao')
const pagedQuery = require('../../_utils/db/paged-query')
const { getSortFields } = require('../../_utils/db/sort')
const { hashedCredentials } = require('../../../common/crypto/sha256')
const { getTzByLatLng } = require('../../_utils/datetime/timezone')
const { getCountryCodeByLatLng, getCountryNameByCode } = require('../../_utils/location/country-code')

const availableIncludes = [
  User.include({ as: 'created_by' }),
  Project.include({ required: false })
]

function computedAdditions (data, stream = {}) {
  const additions = {}
  const { latitude, longitude } = data
  if (latitude && longitude) {
    const country = crg.get_country(latitude, longitude)
    if (country) {
      additions.countryName = country.name
    }
    if (!stream.timezone_locked) {
      additions.timezone = getTzByLatLng(latitude, longitude)
    }
    additions.countryCode = getCountryCodeByLatLng(latitude, longitude)
  } else {
    additions.timezone = 'UTC'
    additions.countryCode = null
  }
  return additions
}

/**
 * Get a single stream by id or where clause
 * @param {string|object} idOrWhere id or where condition
 * @param {*} options Additional get options
 * @param {number} options.readableBy Include only if stream is accessible to the given user id
 * @param {string[]} options.fields Attributes and relations to include in results (defaults to all)
 * @param {Transaction} options.transaction Perform in the given Sequelize transaction
 * @returns {Stream} stream model item
 * @throws EmptyResultError when stream not found
 * @throws ForbiddenError when `readableBy` user does not have read permission on the stream
 */
async function get (idOrWhere, options = {}) {
  if (idOrWhere === undefined || idOrWhere === null) {
    throw new ValidationError('Unable to get stream with provided data')
  }
  const where = typeof idOrWhere === 'string' ? { id: idOrWhere } : idOrWhere
  const attributes = options.fields && options.fields.length > 0 ? Stream.attributes.full.filter(a => options.fields.includes(a)) : Stream.attributes.full
  const include = options.fields && options.fields.length > 0 ? availableIncludes.filter(i => options.fields.includes(i.as)) : availableIncludes
  const transaction = options.transaction || null

  const stream = await Stream.findOne({
    where,
    attributes,
    include,
    paranoid: options.onlyDeleted !== true,
    transaction
  })

  if (!stream) {
    throw new EmptyResultError('Stream not found')
  }
  if (options.readableBy && !(await hasPermission(READ, options.readableBy, where.id, STREAM))) {
    throw new ForbiddenError()
  }
  return stream.toJSON()
}

/**
 * Create a stream
 * @param {Stream} stream
 * @param {*} options
 */
async function create (stream, options = {}) {
  const fullStream = { ...stream, ...computedAdditions(stream) }
  if (fullStream.projectId && options.creatableBy && !(await hasPermission(UPDATE, options.creatableBy, fullStream.projectId, PROJECT))) {
    throw new ForbiddenError()
  }
  return Stream.create(fullStream)
    .catch((e) => {
      console.error('Streams service -> create -> error', e)
      throw new ValidationError('Cannot create stream with provided data.')
    })
}

/**
 * Get a list of streams matching the filters
 * @param {*} filters Stream attributes
 * @param {string[]} filters.names Where names are found
 * @param {string[]} filters.keywords Where keywords are found (in the stream name)
 * @param {string[]} filters.projects Where belongs to one of the projects (array of project ids)
 * @param {string[]} filters.organizations Where belongs to one of the organizations (array of organization ids)
 * @param {string|number} filters.start Having audio (segments) after start (moment)
 * @param {string|number} filters.end Having audio (segments) before end (moment)
 * @param {number} filters.createdBy Where created by the given user id
 * @param {string|number} filters.updatedAfter Where created by the given user id
 * @param {*} options Query options
 * @param {boolean} options.onlyPublic Include only public streams
 * @param {boolean} options.onlyDeleted Include only deleted streams
 * @param {string[]} options.fields Attributes and relations to include in results
 * @param {string} options.sort Order the results by one or more columns
 * @param {number} options.limit Maximum results to include
 * @param {number} options.offset Number of results to skip
 * @param {string} options.permission Include only streams for which you have selected permission (only 'C', 'R', 'U', 'D' are available)
 * @param {number} options.permissableBy Include only streams permissable by the given user id
 * @param {number} options.hidden Include only hidden streams
 */
async function query (filters, options = {}) {
  const where = {}

  // Filters (restrict results - can use multiple filters safely)
  if (filters.names) {
    where.name = {
      [Sequelize.Op.iLike]: {
        [Sequelize.Op.any]: filters.names.map(n => `${n.replace(/(_|%|\\)/g, '\\$1').replace(/^\*/, '%').replace(/\*$/, '%')}`)
      }
    }
  }
  if (filters.namesOrIds) {
    where[Sequelize.Op.or] = {
      id: {
        [Sequelize.Op.in]: filters.namesOrIds
      },
      name: {
        [Sequelize.Op.iLike]: {
          [Sequelize.Op.any]: filters.namesOrIds.map(n => `${n.replace(/(_|%|\\)/g, '\\$1').replace(/^\*/, '%').replace(/\*$/, '%')}`)
        }
      }
    }
  }
  console.log(where.name)
  if (filters.keywords) {
    where.name = {
      [Sequelize.Op.iLike]: {
        [Sequelize.Op.any]: filters.keywords.map(k => `%${k}%`)
      }
    }
  }
  if (filters.organizations) {
    const projectIds = await projectsService.query({ organizations: filters.organizations }, { fields: ['id'] })
    where.projectId = {
      [Sequelize.Op.in]: projectIds
    }
  }
  if (filters.projects) {
    where.projectId = {
      [Sequelize.Op.in]: filters.projects
    }
  }
  if (filters.start) {
    where.start = {
      [Sequelize.Op.gte]: filters.start.toDate()
    }
  }
  if (filters.end) {
    where.end = {
      [Sequelize.Op.lt]: filters.end.toDate()
    }
  }
  if (filters.createdBy) {
    where.createdById = filters.createdBy
  }
  if (filters.updatedAfter) {
    where.updated_at = {
      [Sequelize.Op.gte]: filters.updatedAfter.toDate()
    }
  }

  // Options (change behaviour - mix with care)
  if (options.onlyPublic) {
    where.isPublic = true
  } else {
    if (options.permissableBy) {
      where.id = {
        [Sequelize.Op.in]: await getAccessibleObjectsIDs(options.permissableBy, STREAM, null, options.permission)
      }
    }
    if (options.onlyDeleted) {
      where.deletedAt = {
        [Sequelize.Op.ne]: null
      }
    }
  }

  // Not include hidden streams by default
  if (options.hidden != null) {
    where.hidden = options.hidden
  }

  const attributes = options.fields && options.fields.length > 0 ? Stream.attributes.full.filter(a => options.fields.includes(a)) : Stream.attributes.lite
  const include = options.fields && options.fields.length > 0 ? availableIncludes.filter(i => options.fields.includes(i.as)) : []
  const order = getSortFields(options.sort || '-updated_at')

  const streamsData = await pagedQuery(Stream, {
    where,
    attributes,
    include,
    order,
    limit: options.limit,
    offset: options.offset,
    paranoid: options.onlyDeleted !== true,
    transaction: options.transaction
  })

  streamsData.results = streamsData.results.map(stream => {
    const { latitude, longitude } = stream
    if (latitude !== undefined && longitude !== undefined) {
      const countryCode = getCountryCodeByLatLng(latitude, longitude)
      stream.country_name = getCountryNameByCode(countryCode)
      stream.timezone = getTzByLatLng(latitude, longitude)
    }
    return stream
  })

  return streamsData
}

/**
 * Update stream
 * @param {string} id
 * @param {Stream} stream
 * @param {string} stream.name
 * @param {string} stream.description
 * @param {boolean} stream.is_public
 * @param {string} stream.start
 * @param {string} stream.end
 * @param {float} stream.latitude
 * @param {float} stream.longitude
 * @param {float} stream.altitude
 * @param {integer} stream.max_sample_rate
 * @param {integer} stream.project_id
 * @param {integer} stream.external_id
 * @param {integer} stream.project_external_id
 * @param {*} options
 * @param {number} options.updatableBy Update only if stream is updatable by the given user id
 * @param {Transaction} options.transaction Transaction for sql chain
 * @throws EmptyResultError when stream not found
 * @throws ForbiddenError when `updatableBy` user does not have update permission on the stream
 */
async function update (id, data, options = {}) {
  const transaction = options.transaction || null
  const stream = await get(id, { transaction })
  if (options.updatableBy && !(await hasPermission(UPDATE, options.updatableBy, id, STREAM))) {
    throw new ForbiddenError()
  }
  const fullStream = { ...data, ...computedAdditions(data, stream) }
  if (fullStream.name) {
    if (stream && stream.project_id && stream.name !== fullStream.name) {
      const duplicateStreamInProject = await query({ names: [fullStream.name], projects: [fullStream.project_id || stream.project_id] }, { fields: 'id', transaction })
      if (duplicateStreamInProject.total > 0) {
        throw new ValidationError('Duplicate stream name in the project')
      }
    }
  }
  return Stream.update(fullStream, {
    where: { id },
    individualHooks: true, // force use afterUpdate hook
    transaction
  })
}

/**
 * Delete stream
 * @param {string} id
 * @param {*} options Additional delete options
 * @param {number} options.deletableBy Perform only if organization is deletable by the given user id
 * @param {boolean} options.force Remove from the database (not soft-delete)
 * @throws ForbiddenError when `deletableBy` user does not have delete permission on the organization
 */
async function remove (id, options = {}) {
  if (options.deletableBy && !(await hasPermission(DELETE, options.deletableBy, id, STREAM))) {
    throw new ForbiddenError()
  }
  return Stream.destroy({ where: { id }, force: options.force, individualHooks: true })
}

/**
 * Restore deleted stream
 * @param {string} id
 * @param {*} options Additional restore options
 * @param {number} options.deletableBy Perform only if organization is deletable by the given user id
 * @throws ForbiddenError when `deletableBy` user does not have delete permission on the organization
 */
async function restore (id, options = {}) {
  if (options.deletableBy && !(await hasPermission(DELETE, options.deletableBy, id, STREAM))) {
    throw new ForbiddenError()
  }
  return Stream.restore({ where: { id } })
}

/**
* Refreshes stream's max sample_rate, start and end based on input params
 * @param {*} stream
 * @param {*} params
 * @param {number} params.sampleRate
 * @param {string} params.start
 * @param {string} params.end
 * @param {*} opts
 * @param {*} opts.transaction
 */
async function refreshStreamBoundVars (stream, params, options = {}) {
  const upd = {}
  if (params.start && (params.start < stream.start || !stream.start)) {
    upd.start = params.start
  }
  if (params.end && (params.end > stream.end || !stream.end)) {
    upd.end = params.end
  }
  if (params.sampleRate && (params.sampleRate > stream.max_sample_rate || !stream.max_sample_rate)) {
    upd.maxSampleRate = params.sampleRate
  }
  return update(stream.id, upd, options)
}

// TODO move to guardian-related area (not part of Core)
function ensureStreamExistsForGuardian (dbGuardian) {
  const where = {
    id: dbGuardian.guid
  }
  const defaults = {
    name: dbGuardian.shortname,
    isPublic: !dbGuardian.is_private,
    ...dbGuardian.latitude && { latitude: dbGuardian.latitude },
    ...dbGuardian.longitude && { longitude: dbGuardian.longitude },
    createdById: dbGuardian.creator ? dbGuardian.creator : 1 // Streams must have creator, so Topher will be their creator
  }
  return Stream.findOrCreate({ where, defaults })
    .spread((dbStream) => {
      return dbStream.toJSON()
    })
}

async function getPublicStreamIds () {
  return (await query({}, { onlyPublic: true })).results.map(d => d.id)
}

function getStreamRangeToken (stream, start, end) {
  const STREAM_TOKEN_SALT = process.env.STREAM_TOKEN_SALT || 'random_string'
  return hashedCredentials(STREAM_TOKEN_SALT, `${stream}_${start}_${end}`)
}

module.exports = {
  get,
  computedAdditions,
  create,
  query,
  update,
  remove,
  restore,
  refreshStreamBoundVars,
  ensureStreamExistsForGuardian,
  getPublicStreamIds,
  getStreamRangeToken
}
