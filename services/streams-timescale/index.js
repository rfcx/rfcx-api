const models = require('../../modelsTimescale')
const EmptyResultError = require('../../utils/converter/empty-result-error')
const ValidationError = require('../../utils/converter/validation-error')
const ForbiddenError = require('../../utils/converter/forbidden-error')

let streamBaseInclude = [
  {
    model: models.SampleRate,
    as: 'max_sample_rate',
    attributes: ['value'],
  },
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
function getById (id, joinRelations = false) {
  return models.Stream
    .findOne({
      where: { id },
      attributes: models.Stream.attributes.full,
      include: joinRelations? streamBaseInclude : []
    })
    .then(item => {
      if (!item) {
        throw new EmptyResultError('Stream with given id not found.')
      }
      return item
    })
    .catch((e) => {
      console.error('Streams service -> getById -> error', e);
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
  const { id, name, description, start, end, is_private, latitude, longitude, created_at, updated_at } = stream;
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
    max_sample_rate: stream.max_sample_rate? stream.max_sample_rate.value : null,
    latitude,
    longitude,
  };
}

module.exports = {
  getById,
  create,
  update,
  checkUserAccessToStream,
  formatStream,
}
