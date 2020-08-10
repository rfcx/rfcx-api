const models = require('../../modelsTimescale')
const EmptyResultError = require('../../utils/converter/empty-result-error')
const ValidationError = require('../../utils/converter/validation-error')
const ForbiddenError = require('../../utils/converter/forbidden-error')
const crg = require('country-reverse-geocoding').country_reverse_geocoding();

let streamBaseInclude = [
  {
    model: models.User,
    as: 'created_by',
    attributes: models.User.attributes.lite,
  },
];

/**
 * Searches for stream model with given id
 * @param {string} id
 * @param {*} opts additional function params
 * @returns {*} stream model item
 */
function getById (id, opts = {}) {
  return models.Stream
    .findOne({
      where: { id },
      attributes: models.Stream.attributes.full,
      include: opts && opts.joinRelations? streamBaseInclude : [],
      paranoid: !opts.includeDeleted
    })
    .then(item => {
      if (!item) {
        throw new EmptyResultError('Stream with given id not found.')
      }
      return item
    });
}

/**
 * Creates stream item
 * @param {*} data stream attributes
 * @param {*} opts additional function params
 * @returns {*} stream model item
 */
function create(data, opts = {}) {
  if (!data) {
    throw new ValidationError('Cannot create stream with empty object.');
  }
  const { id, name, description, start, end, is_public, latitude, longitude, created_by_id } = data; // do not use raw input object for security reasons
  return models.Stream
    .create({ id, name, description, start, end, is_public, latitude, longitude, created_by_id })
    .then(item => { return opts && opts.joinRelations? item.reload({ include: streamBaseInclude }) : item })
    .catch((e) => {
      console.error('Streams service -> create -> error', e);
      throw new ValidationError('Cannot create stream with provided data.');
    })
}

/**
 * Returns list of streams with total number filtered by specified attributes
 * @param {*} attrs stream attributes
 * @param {*} opts additional function params
 */
async function query(attrs, opts = {}) {

  let where = {};
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

  if (attrs.is_public === true) {
    where.is_public = true
  }

  if (attrs.created_by === 'me') {
    where.created_by_id = attrs.current_user_id
  } else if (attrs.created_by === 'collaborators') {
    const permissions = await models.StreamPermission.findAll({ where: { user_id: attrs.current_user_id } })
    const streamIds = [...new Set(permissions.map(d => d.stream_id))]
    where.id = {
      [models.Sequelize.Op.in]: streamIds
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

  const method = (!!attrs.limit || !!attrs.offset) ? 'findAndCountAll' : 'findAll' // don't use findAndCountAll if we don't need to limit and offset
  return models.Stream[method]({
    where,
    limit: attrs.limit,
    offset: attrs.offset,
    attributes: models.Stream.attributes.full,
    include: opts.joinRelations ? streamBaseInclude : [],
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
function update(stream, data, opts = {}) {
  ['name', 'description', 'is_public', 'start', 'end', 'latitude', 'longitude', 'max_sample_rate'].forEach((attr) => {
    if (data[attr] !== undefined) {
      stream[attr] = data[attr];
    }
  });
  return stream
    .save()
    .then(item => { return opts && opts.joinRelations? item.reload({ include: streamBaseInclude }) : item })
    .catch((e) => {
      console.error('Streams service -> update -> error', e);
      throw new ValidationError('Cannot update stream with provided data.');
    })
}

/**
 * Deletes stream softly
 * @param {*} stream stream model item
 */
function softDelete(stream) {
  return stream.destroy()
    .catch((e) => {
      console.error('Streams service -> softDelete -> error', e);
      throw new ValidationError('Cannot delete stream.');
    })
}

/**
 * Restored deleted stream
 * @param {*} stream stream model item
 */
function restore(stream) {
  return stream.restore()
    .catch((e) => {
      console.error('Streams service -> restore -> error', e);
      throw new ValidationError('Cannot restore stream.');
    })
}

function formatStream(stream, permissions = []) {
  const { id, name, description, start, end, is_public, latitude, longitude, created_at, updated_at, max_sample_rate } = stream;
  let country_name = null
  if (latitude && longitude) {
    const country = crg.get_country(latitude, longitude)
    if (country) {
      country_name = country.name
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
    country_name,
    permissions,
  };
}

function formatStreams(data) {
  return data.map((item) => {
    return formatStream(item.stream, item.permissions)
  });
}

/**
 * Finds max sample rate value of stream source files belonging to stream and updates max_sample_rate attribute of the stream
 * @param {*} stream stream model item
 */
async function refreshStreamMaxSampleRate(stream) {
  const where = { stream_id: stream.id }
  let max_sample_rate = await models.StreamSourceFile.max('sample_rate', { where })
  max_sample_rate = max_sample_rate || null
  return update(stream, { max_sample_rate })
}

/**
 * Finds first and last time points of stream segments and updates start and end columns of the stream
 * @param {*} stream stream model item
 */
async function refreshStreamStartEnd(stream) {
  const where = { stream_id: stream.id }
  let start = await models.StreamSegment.min('start', { where })
  let end = await models.StreamSegment.max('end', { where })
  start = start || null
  end = end || null
  return update(stream, { start, end })
}

function ensureStreamExistsForGuardian(dbGuardian) {
  const where = {
    id: dbGuardian.guid,
  }
  const defaults = {
    name: dbGuardian.shortname,
    is_public: !dbGuardian.is_private,
    ...dbGuardian.latitude && { latitude: dbGuardian.latitude },
    ...dbGuardian.longitude && { longitude: dbGuardian.longitude },
    created_by_id: dbGuardian.creator? dbGuardian.creator : 1 // Streams must have creator, so Topher will be their creator
  }
  return models.Stream.findOrCreate({ where, defaults })
    .spread((dbStream) => {
      return dbStream;
    })
}


module.exports = {
  getById,
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
}
