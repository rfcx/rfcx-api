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
 * @param {*} joinRelations whether include join tables into returning model or not
 * @returns {*} stream model item
 */
function getById (id, opts = {}) {
  return models.Stream
    .findOne({
      where: { id },
      attributes: models.Stream.attributes.full,
      include: opts.joinRelations? streamBaseInclude : [],
      paranoid: !opts.includeDeleted
    })
    .then(item => {
      if (!item) {
        throw new EmptyResultError('Stream with given id not found.')
      }
      return item
    })
    .catch((e) => {
      if (!e instanceof EmptyResultError) {
        console.error('Streams service -> getById -> error', e);
      }
      // We need to rethrow error with "EmptyResultError" type for this method
      throw new EmptyResultError('Stream with given id not found.');
    })
}

/**
 * Creates stream item
 * @param {*} data stream attributes
 * @param {*} joinRelations whether include join tables into returning model or not
 * @returns {*} stream model item
 */
function create(data, joinRelations = false) {
  if (!data) {
    throw new ValidationError('Cannot create stream with empty object.');
  }
  const { id, name, description, start, end, is_private, latitude, longitude, created_by_id } = data; // do not use raw input object for security reasons
  return models.Stream
    .create({ id, name, description, start, end, is_private, latitude, longitude, created_by_id })
    .then(item => { return joinRelations? item.reload({ include: streamBaseInclude }) : item })
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

  let where = { [models.Sequelize.Op.and]: {} };
  if (attrs.start !== undefined) {
    where[models.Sequelize.Op.and]['start'] = {
      [models.Sequelize.Op.gte]: attrs.start
    }
  }
  if (attrs.end !== undefined) {
    where[models.Sequelize.Op.and]['end'] = {
      [models.Sequelize.Op.lt]: attrs.end
    }
  }
  if (attrs.is_private !== undefined) {
    where[models.Sequelize.Op.and]['is_private'] = attrs.is_private;
  }
  if (attrs.is_deleted === true) {
    where[models.Sequelize.Op.and]['deleted_at'] = {
      [models.Sequelize.Op.ne]: null
    }
  }
  if (attrs.keyword) {
    where[models.Sequelize.Op.and]['name'] = {
      [models.Sequelize.Op.iLike]: `%${attrs.keyword}%`
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
 * @param {*} joinRelations whether include join tables into returning model or not
 * @returns {*} stream model item
 */
function update(stream, data, joinRelations = false) {
  ['name', 'description', 'is_private', 'start', 'end', 'latitude', 'longitude'].forEach((attr) => {
    if (data[attr] !== undefined) {
      stream[attr] = data[attr];
    }
  });
  return stream
    .save()
    .then(item => { return joinRelations? item.reload({ include: streamBaseInclude }) : item })
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
  if (stream.created_by_id !== userId) {
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
}
