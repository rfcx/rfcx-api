const models = require('../../modelsTimescale')
const EmptyResultError = require('../../utils/converter/empty-result-error')
const ValidationError = require('../../utils/converter/validation-error')
const ForbiddenError = require('../../utils/converter/forbidden-error')

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
  const { id, name, description, start, end, is_private, latitude, longitude, created_by_id } = data; // do not use raw input object for security reasons
  return models.Stream
    .create({ id, name, description, start, end, is_private, latitude, longitude, created_by_id })
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
function query(attrs, opts = {}) {

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

  if (attrs.created_by === 'me') {
    where.created_by_id = attrs.current_user_id;
    if (attrs.is_private !== undefined) {
      where.is_private = attrs.is_private;
    }
  }
  else if (attrs.created_by === 'collaborators') {
    // TODO: change this logic when streams sharing is implemented
    return Promise.resolve({ count: 0, streams: [] });
  }
  else {
    where[models.Sequelize.Op.or] = [
      {
        [models.Sequelize.Op.and]: {
          created_by_id: attrs.current_user_id,
          ...attrs.is_private !== undefined && { is_private: attrs.is_private }
        }
      }
    ]
    if (attrs.is_private !== true) {
      where[models.Sequelize.Op.or].push(
        {
          [models.Sequelize.Op.and]: {
            is_private: false,
            created_by_id: {
              [models.Sequelize.Op.ne]: attrs.current_user_id
            }
          }
        }
      )
    }
  }

  if (attrs.is_deleted === true) { // user can get only personal deleted streams
    where.created_by_id = attrs.current_user_id;
    where.deleted_at = {
      [models.Sequelize.Op.ne]: null
    }
  }

  let method = (!!attrs.limit || !!attrs.offset) ? 'findAndCountAll' : 'findAll'; // don't use findAndCountAll if we don't need to limit and offset
  return models.Stream[method]({
    where,
    limit: attrs.limit,
    offset: attrs.offset,
    attributes: models.Stream.attributes.full,
    include: opts.joinRelations? streamBaseInclude : [],
    paranoid: attrs.is_deleted === true? false : true,
  })
  .then((data) => {
    return {
      count: method === 'findAndCountAll' ? data.count : data.length,
      streams: method === 'findAndCountAll' ? data.rows : data,
    };
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
  ['name', 'description', 'is_private', 'start', 'end', 'latitude', 'longitude', 'max_sample_rate'].forEach((attr) => {
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

/**
 * A function which checks whether user has access to stream or not.
 * This function will be extended with new streams permissions logic later.
 * @param {*} req express request object
 * @param {*} stream stream model item
 */
function checkUserAccessToStream(req, stream) {
  let userId = req.rfcx.auth_token_info.owner_id;
  if (stream.is_private && stream.created_by_id !== userId) {
    throw new ForbiddenError(`You don't have enough permissions for this operation.`);
  }
  return true;
}

function formatStream(stream) {
  const { id, name, description, start, end, is_private, latitude, longitude, created_at, updated_at, max_sample_rate } = stream;
  return {
    id,
    name,
    description,
    start,
    end,
    is_private,
    created_at,
    created_by: stream.created_by || null,
    updated_at,
    max_sample_rate,
    latitude,
    longitude,
  };
}

function formatStreams(streams) {
  return streams.map(formatStream);
}

/**
 * Finds max sample rate value of master segments belonging to stream and updates max_sample_rate attribute of the stream
 * @param {*} stream stream model item
 */
function refreshStreamMaxSampleRate(stream) {
  let sql = `SELECT b.id, b.value
              FROM master_segments a
              INNER JOIN sample_rates b ON a.sample_rate_id = b.id
              INNER JOIN ( SELECT id, MAX(value) max_sample_rate FROM sample_rates GROUP BY id) c ON b.id = c.id AND b.value = c.max_sample_rate
              WHERE a.stream_id = '${stream.id}' ORDER BY b.value DESC LIMIT 1;`
  return models.sequelize
    .query(sql,
      { replacements: {}, type: models.sequelize.QueryTypes.SELECT }
    )
    .then((data) => {
      let mas_sample_rate = null;
      if (data && data[0] && data[0].value) {
        max_sample_rate = data[0].value
      }
      return update(stream, { max_sample_rate })
    });
}

/**
 * Finds first and last time points of stream segments and updates start and end columns of the stream
 * @param {*} stream stream model item
 */
async function refreshStreamStartEnd(stream) {
  const where = { stream_id: stream.id }
  const start = await models.Segment.min('start', { where })
  const end = await models.Segment.max('end', { where })
  if (start && end) {
    return update(stream, { start, end })
  }
  return
}


module.exports = {
  getById,
  create,
  query,
  update,
  softDelete,
  restore,
  checkUserAccessToStream,
  formatStream,
  formatStreams,
  refreshStreamMaxSampleRate,
  refreshStreamStartEnd,
}
