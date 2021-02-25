const models = require('../../modelsTimescale')
const EmptyResultError = require('../../utils/converter/empty-result-error')
const ValidationError = require('../../utils/converter/validation-error')
const { Stream, Project, Organization, User, StreamSegment, StreamSourceFile, Sequelize } = require('../../modelsTimescale')
const { ForbiddenError, ValidationError, EmptyResultError } = require('../../utils/errors')
const crg = require('country-reverse-geocoding').country_reverse_geocoding()
const rolesService = require('../roles')
const projectsService = require('../projects')
const { getAccessibleObjectsIDs, hasPermission, STREAM, READ } = require('../roles')
const pagedQuery = require('../../utils/db/paged-query')

const availableIncludes = [
  User.include('created_by'),
  Project.include()
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
 * Returns list of streams with total number filtered by specified attributes
 * @param {*} attrs stream attributes
 * @param {*} opts additional function params
 */
async function query (attrs, opts = {}) {
  const where = {}
  if (attrs.start !== undefined) {
    where.start = {
      [models.Sequelize.Op.gte]: attrs.start
    }
  }
  if (attrs.end !== undefined) {
    where.end = {
      [models.Sequelize.Op.lt]: attrs.end
    }
  }

  if (attrs.keyword) {
    where.name = {
      [models.Sequelize.Op.iLike]: `%${attrs.keyword}%`
    }
  }

  if (attrs.is_public !== undefined) {
    where.is_public = attrs.is_public
  }

  if (attrs.created_by === 'me') {
    where.created_by_id = attrs.current_user_id
  } else if (attrs.created_by === 'collaborators') {
    if (!attrs.current_user_is_super) {
      const ids = await rolesService.getAccessibleObjectsIDs(attrs.current_user_id, rolesService.STREAM)
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

  if (attrs.is_deleted === true) { // user can get only personal deleted streams
    where.created_by_id = attrs.current_user_id
    where.deleted_at = {
      [models.Sequelize.Op.ne]: null
    }
  }

  if (attrs.projects) {
    where.project_id = {
      [models.Sequelize.Op.in]: attrs.projects
    }
  }

  let streamInclude = streamBaseInclude
  if (attrs.organizations) {
    const projectInclude = {
      model: models.Project,
      as: 'project',
      attributes: models.Project.attributes.lite,
      where: {
        organization_id: {
          [models.Sequelize.Op.in]: attrs.organizations
        }
      }
    }
    streamInclude = [streamBaseInclude.find(i => i.as === 'created_by'), projectInclude]
    opts.joinRelations = true
  }

  const method = (!!attrs.limit || !!attrs.offset) ? 'findAndCountAll' : 'findAll' // don't use findAndCountAll if we don't need to limit and offset
  return models.Stream[method]({
    where,
    limit: attrs.limit,
    offset: attrs.offset,
    attributes: models.Stream.attributes.full,
    include: opts.joinRelations ? streamInclude : [],
    paranoid: attrs.is_deleted !== true
  })
    .then((data) => {
      return {
        count: method === 'findAndCountAll' ? data.count : data.length,
        streams: method === 'findAndCountAll' ? data.rows : data
      }
    })
}

/**
 * Updates existing stream item
 * @param {*} stream stream model item
 * @param {*} data attributes to update
 * @param {*} opts additional function params
 * @returns {*} stream model item
 */
function update (stream, data, opts = {}) {
  ['name', 'description', 'is_public', 'start', 'end', 'latitude', 'longitude', 'altitude', 'max_sample_rate', 'project_id'].forEach((attr) => {
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
 * Deletes stream softly
 * @param {*} stream stream model item
 */
function softDelete (stream) {
  return stream.destroy()
    .catch((e) => {
      console.error('Streams service -> softDelete -> error', e)
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

// TODO - move to guardian-related area (not part of Core)
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
  softDelete,
  restore,
  formatStream,
  formatStreams,
  refreshStreamMaxSampleRate,
  refreshStreamStartEnd,
  ensureStreamExistsForGuardian,
  getPublicStreamIds,
  getAccessibleStreamIds
}
