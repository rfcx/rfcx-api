const { Stream, Project, Organization, User, StreamSegment, StreamSourceFile, Sequelize } = require('../../modelsTimescale')
const { ForbiddenError, ValidationError, EmptyResultError } = require('../../utils/errors')
const crg = require('country-reverse-geocoding').country_reverse_geocoding()
const projectsService = require('../projects')
const { getAccessibleObjectsIDs, hasPermission, STREAM, READ } = require('../roles')
const pagedQuery = require('../../utils/db/paged-query')
const { getSortFields } = require('../../utils/sequelize/sort')
const rolesService = require('../roles')

const availableIncludes = [
  User.include('created_by'),
  Project.include('project', Project.attributes.lite, false)
]

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
  const attributes = options.fields && options.fields.length > 0 ? Organization.attributes.full.filter(a => options.fields.includes(a)) : Organization.attributes.full
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
 * Creates stream item
 * @param {*} data stream attributes
 * @param {*} opts additional function params
 * @param {boolean} opts.joinRelations whether to include joined tables in returned object
 * @returns {*} stream model item
 */
function create (data, opts = {}) {
  if (!data) {
    throw new ValidationError('Cannot create stream with empty object.')
  }
  const { id, name, description, start, end, is_public, latitude, longitude, altitude, created_by_id, external_id, project_id } = data // eslint-disable-line camelcase
  return Stream
    .create({ id, name, description, start, end, is_public, latitude, longitude, altitude, created_by_id, external_id, project_id })
    .then(item => { return opts && opts.joinRelations ? item.reload({ include: availableIncludes }) : item })
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
 * @param {string|number} filters.start Having audio (segments) after start (iso or unix)
 * @param {string|number} filters.end Having audio (segments) before end (iso or unix)
 * @param {number} filters.createdBy Where created by the given user id
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
    where.project_id = {
      [Sequelize.Op.in]: projectIds
    }
  }
  if (filters.projects) {
    where.project_id = {
      [Sequelize.Op.in]: filters.projects
    }
  }
  if (filters.start) {
    where.start = {
      [Sequelize.Op.gte]: filters.start
    }
  }
  if (filters.end) {
    where.end = {
      [Sequelize.Op.lt]: filters.end
    }
  }
  if (filters.createdBy) {
    where.created_by_id = filters.createdBy
  }
  if (filters.updated_after) {
    where.updated_at = {
      [Sequelize.Op.gte]: filters.updated_after
    }
  }

  // Options (change behaviour - mix with care)
  if (options.onlyPublic) {
    where.is_public = true
  } else {
    if (options.readableBy) {
      where.id = {
        [Sequelize.Op.in]: await getAccessibleObjectsIDs(options.readableBy, STREAM)
      }
    }
    if (options.onlyDeleted) {
      where.deleted_at = {
        [Sequelize.Op.ne]: null
      }
    }
  }
  const attributes = options.fields && options.fields.length > 0 ? Stream.attributes.full.filter(a => options.fields.includes(a)) : Stream.attributes.lite
  const include = options.fields && options.fields.length > 0 ? availableIncludes.filter(i => options.fields.includes(i.as)) : []
  const order = getSortFields(options.sort ?? '-updated_at')

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
 * Updates existing stream item
 * @param {*} stream stream model item
 * @param {*} data attributes to update
 * @param {string} data.name
 * @param {string} data.description
 * @param {boolean} data.is_public
 * @param {string} data.start
 * @param {string} data.end
 * @param {float} data.latitude
 * @param {float} data.longitude
 * @param {float} data.altitude
 * @param {integer} data.max_sample_rate
 * @param {integer} data.project_id
 * @param {integer} data.external_id
 * @param {integer} data.project_external_id
 * @param {*} opts additional function params
 * @param {boolean} opts.joinRelations whether join related tables or not
 * @returns {*} stream model item
 */
function update (stream, data, opts = {}) {
  const attrs = ['name', 'description', 'is_public', 'start', 'end', 'latitude', 'longitude',
    'altitude', 'max_sample_rate', 'project_id', 'external_id', 'project_external_id']
  attrs.forEach((attr) => {
    if (data[attr] !== undefined) {
      stream[attr] = data[attr]
    }
  })
  return stream
    .save()
    .then(item => { return opts && opts.joinRelations ? item.reload({ include: availableIncludes }) : item })
    .catch((e) => {
      console.error('Streams service -> update -> error', e)
      throw new ValidationError('Cannot update stream with provided data.')
    })
}

/**
 * Delete a stream (soft or hard)
 * @param {*} stream stream model item
 * @param {*} options
 * @param {boolean} options.force
 */
function remove (stream, opts = {}) {
  return stream.destroy({
    ...opts.force !== undefined ? { force: opts.force } : {}
  })
    .catch((e) => {
      console.error('Streams service -> delete -> error', e)
      throw new ValidationError('Cannot delete stream.')
    })
}

/**
 * Restore deleted stream
 * @param {*} stream stream model item
 */
function restore (stream) {
  return stream.restore()
    .catch((e) => {
      console.error('Streams service -> restore -> error', e)
      throw new ValidationError('Cannot restore stream.')
    })
}

function formatStream (stream, permissions) {
  const { id, name, description, start, end, is_public, latitude, longitude, altitude, created_at, updated_at, max_sample_rate, external_id, project } = stream // eslint-disable-line camelcase
  let country_name = null // eslint-disable-line camelcase
  if (latitude && longitude) {
    const country = crg.get_country(latitude, longitude)
    if (country) {
      country_name = country.name // eslint-disable-line camelcase
    }
  }
  return {
    id,
    name,
    description,
    start,
    end,
    is_public,
    created_at,
    created_by: stream.created_by || null,
    updated_at,
    max_sample_rate,
    latitude,
    longitude,
    altitude,
    country_name,
    external_id,
    project: project || null,
    ...permissions && { permissions }
  }
}

function formatStreams (data) {
  return data.map((item) => {
    return formatStream(item.stream, item.permissions)
  })
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
    is_public: !dbGuardian.is_private,
    ...dbGuardian.latitude && { latitude: dbGuardian.latitude },
    ...dbGuardian.longitude && { longitude: dbGuardian.longitude },
    created_by_id: dbGuardian.creator ? dbGuardian.creator : 1 // Streams must have creator, so Topher will be their creator
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
      current_user_id: user.owner_id,
      created_by: createdBy
    })).streams.map(d => d.id)
  }

  // Get my streams and my collaborators
  const s1 = await query({
    current_user_id: user.owner_id
  })
  const s2 = await query({
    current_user_id: user.owner_id,
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
  formatStream,
  formatStreams,
  refreshStreamMaxSampleRate,
  refreshStreamStartEnd,
  ensureStreamExistsForGuardian,
  getPublicStreamIds,
  getAccessibleStreamIds
}
