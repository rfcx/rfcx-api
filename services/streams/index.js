const models = require('../../modelsTimescale')
const EmptyResultError = require('../../utils/converter/empty-result-error')
const ValidationError = require('../../utils/converter/validation-error')
const crg = require('country-reverse-geocoding').country_reverse_geocoding()
const rolesService = require('../roles')

const streamBaseInclude = [
  {
    model: models.User,
    as: 'created_by',
    attributes: models.User.attributes.lite
  },
  {
    model: models.Project,
    as: 'project',
    attributes: models.Project.attributes.lite
  }
]

/**
 * Searches for stream model with given params
 * @param {object} params
 * @param {*} opts additional function params
 * @returns {*} stream model item
 */
function getByParams (where, opts = {}) {
  return models.Stream
    .findOne({
      where,
      attributes: models.Stream.attributes.full,
      include: opts && opts.joinRelations ? streamBaseInclude : [],
      paranoid: !opts.includeDeleted
    })
    .then(item => {
      if (!item) {
        throw new EmptyResultError('Stream with given id not found.')
      }
      return item
    })
}

/**
 * Searches for stream model with given id
 * @param {string} id
 * @param {*} opts additional function params
 * @returns {*} stream model item
 */
function getById (id, opts = {}) {
  return getByParams({ id }, opts)
}

/**
 * Searches for stream model with given external_id
 * @param {string} id external stream id
 * @param {*} opts additional function params
 * @returns {*} stream model item
 */
function getByExternalId (id, opts = {}) {
  return getByParams({ external_id: id }, opts)
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
  return models.Stream
    .create({ id, name, description, start, end, is_public, latitude, longitude, altitude, created_by_id, external_id, project_id })
    .then(item => { return opts && opts.joinRelations ? item.reload({ include: streamBaseInclude }) : item })
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
    .then(item => { return opts && opts.joinRelations ? item.reload({ include: streamBaseInclude }) : item })
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
 * Restored deleted stream
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
  let max_sample_rate = await models.StreamSourceFile.max('sample_rate', { where }) // eslint-disable-line camelcase
  max_sample_rate = max_sample_rate || null // eslint-disable-line camelcase
  return update(stream, { max_sample_rate })
}

/**
 * Finds first and last time points of stream segments and updates start and end columns of the stream
 * @param {*} stream stream model item
 */
async function refreshStreamStartEnd (stream) {
  const where = { stream_id: stream.id }
  let start = await models.StreamSegment.min('start', { where })
  let end = await models.StreamSegment.max('end', { where })
  start = start || null
  end = end || null
  return update(stream, { start, end })
}

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
  return models.Stream.findOrCreate({ where, defaults })
    .spread((dbStream) => {
      return dbStream
    })
}

async function getPublicStreamIds () {
  return (await query({
    is_public: true
  })).streams.map(d => d.id)
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
  getByParams,
  getById,
  getByExternalId,
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
