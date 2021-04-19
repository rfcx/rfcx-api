const { Stream, Project, User, StreamSegment, StreamSourceFile, Sequelize } = require('../../modelsTimescale')
const { ForbiddenError, ValidationError, EmptyResultError } = require('../../utils/errors')
const crg = require('country-reverse-geocoding').country_reverse_geocoding()
const projectsService = require('../projects')
const { getAccessibleObjectsIDs, hasPermission, STREAM, READ, UPDATE, DELETE } = require('../roles')
const pagedQuery = require('../../utils/db/paged-query')
const { getSortFields } = require('../../utils/sequelize/sort')

const availableIncludes = [
  User.include({ as: 'created_by' }),
  Project.include({ required: false })
]

function computedAdditions (stream) {
  const additions = {}
  if (stream.latitude && stream.longitude) {
    const country = crg.get_country(stream.latitude, stream.longitude)
    if (country) {
      additions.countryName = country.name
    }
  }
  return additions
}

/**
 * Get a single stream by id or where clause
 * @param {string|object} idOrWhere id or where condition
 * @param {*} options Additional get options
 * @param {number} options.readableBy Include only if organization is accessible to the given user id
 * @param {string[]} options.fields Attributes and relations to include in results (defaults to all)
 * @returns {Stream} stream model item
 * @throws EmptyResultError when organization not found
 * @throws ForbiddenError when `readableBy` user does not have read permission on the organization
 */
async function get (idOrWhere, options = {}) {
  const where = typeof idOrWhere === 'string' ? { id: idOrWhere } : idOrWhere
  const attributes = options.fields && options.fields.length > 0 ? Stream.attributes.full.filter(a => options.fields.includes(a)) : Stream.attributes.full
  const include = options.fields && options.fields.length > 0 ? availableIncludes.filter(i => options.fields.includes(i.as)) : availableIncludes

  const stream = await Stream.findOne({ where, attributes, include, paranoid: false })

  if (!stream) {
    throw new EmptyResultError('Stream not found')
  }
  if (options.readableBy && !(await hasPermission(READ, options.readableBy, stream.id, STREAM))) {
    throw new ForbiddenError()
  }
  return stream
}

/**
 * Create a stream
 * @param {Stream} stream
 * @param {*} options
 */
function create (stream, options = {}) {
  const fullStream = { ...stream, ...computedAdditions(stream) }
  return Stream.create(fullStream)
    .catch((e) => {
      console.error('Streams service -> create -> error', e)
      throw new ValidationError('Cannot create stream with provided data.')
    })
}

/**
 * Get a list of streams matching the filters
 * @param {*} filters Stream attributes
 * @param {string} filters.keyword Where keyword is found (in the stream name)
 * @param {string[]} filters.projects Where belongs to one of the projects (array of project ids)
 * @param {string[]} filters.organizations Where belongs to one of the organizations (array of organization ids)
 * @param {string|number} filters.start Having audio (segments) after start (moment)
 * @param {string|number} filters.end Having audio (segments) before end (moment)
 * @param {number} filters.createdBy Where created by the given user id
 * @param {string|number} filters.updatedAfter Where created by the given user id
 * @param {*} options Query options
 * @param {number} options.readableBy Include only streams readable by the given user id
 * @param {boolean} options.onlyPublic Include only public streams
 * @param {boolean} options.onlyDeleted Include only deleted streams
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
    if (options.readableBy) {
      where.id = {
        [Sequelize.Op.in]: await getAccessibleObjectsIDs(options.readableBy, STREAM)
      }
    }
    if (options.onlyDeleted) {
      where.deletedAt = {
        [Sequelize.Op.ne]: null
      }
    }
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
    paranoid: options.onlyDeleted !== true
  })

  // TODO move country into the table and perform lookup once on create/update
  // TODO avoid language-specific data in results (return country code instead of name)
  streamsData.results = streamsData.results.map(stream => {
    if (stream.latitude && stream.longitude) {
      const country = crg.get_country(stream.latitude, stream.longitude)
      if (country) {
        return { ...stream.toJSON(), country_name: country.name } // eslint-disable-line camelcase
      }
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
 * @throws EmptyResultError when stream not found
 * @throws ForbiddenError when `updatableBy` user does not have update permission on the stream
 */
async function update (id, stream, options = {}, individual = false) {
  if (options.updatableBy && !(await hasPermission(UPDATE, options.updatableBy, id, STREAM))) {
    throw new ForbiddenError()
  }
  const fullStream = { ...stream, ...computedAdditions(stream) }
  return Stream.update(fullStream, {
    where: { id },
    individualHooks: individual
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
async function remove (id, options = {}, individual = false) {
  if (options.deletableBy && !(await hasPermission(DELETE, options.deletableBy, id, STREAM))) {
    throw new ForbiddenError()
  }
  return Stream.destroy({ where: { id }, force: options.force, individualHooks: individual })
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
 * Finds max sample rate value of stream source files belonging to stream and updates max_sample_rate attribute of the stream
 * @param {*} stream stream model item
 */
async function refreshStreamMaxSampleRate (stream) {
  const where = { stream_id: stream.id }
  let max_sample_rate = await StreamSourceFile.max('sample_rate', { where }) // eslint-disable-line camelcase
  max_sample_rate = max_sample_rate || null // eslint-disable-line camelcase
  return update(stream, { max_sample_rate })
}

/**
 * Refreshes stream's start and end points based on provided segment or by searching for first and last segments
 * @param {*} stream stream model item
 * @param {*} segment (optional) stream segment model item
 */
async function refreshStreamStartEnd (stream, segment) {
  const upd = {}
  if (segment) {
    if (segment.start < stream.start || !stream.start) {
      upd.start = segment.start
    }
    if (segment.end > stream.end || !stream.end) {
      upd.end = segment.end
    }
  } else {
    const where = { stream_id: stream.id }
    upd.start = await StreamSegment.min('start', { where })
    upd.end = await StreamSegment.max('end', { where })
    if (upd.start === 0) {
      upd.start = null
    }
    if (upd.end === 0) {
      upd.end = null
    }
  }
  return update(stream, upd)
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
      return dbStream
    })
}

async function getPublicStreamIds () {
  return (await query({ is_public: true })).streams.map(d => d.id)
}

/**
 * Get a list of IDs for streams which are accessible to the user
 * @param {string} createdBy Limit to streams created by `me` (my streams) or `collaborators` (shared with me)
 */
async function getAccessibleStreamIds (user, createdBy = undefined) {
  // Only my streams or my collaborators
  if (createdBy !== undefined) {
    return (await query({
      current_user_id: user.id,
      created_by: createdBy
    })).streams.map(d => d.id)
  }

  // Get my streams and my collaborators
  const s1 = await query({
    current_user_id: user.id
  })
  const s2 = await query({
    current_user_id: user.id,
    created_by: 'collaborators',
    current_user_is_super: user.is_super
  })
  const streamIds = [...new Set([
    ...s1.streams.map(d => d.id),
    ...s2.streams.map(d => d.id)
  ])]
  return streamIds
}

module.exports = {
  get,
  create,
  query,
  update,
  remove,
  restore,
  refreshStreamMaxSampleRate,
  refreshStreamStartEnd,
  ensureStreamExistsForGuardian,
  getPublicStreamIds,
  getAccessibleStreamIds
}
