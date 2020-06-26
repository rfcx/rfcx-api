const models = require('../../modelsTimescale')
const EmptyResultError = require('../../utils/converter/empty-result-error')
const ValidationError = require('../../utils/converter/validation-error')
const ForbiddenError = require('../../utils/converter/forbidden-error')

let masterSegmentBaseInclude = [
  {
    model: models.Stream,
    as: 'stream',
    attributes: models.Stream.attributes.lite,
  },
  {
    model: models.Codec,
    as: 'codec',
    attributes: models.Codec.attributes.lite,
  },
  {
    model: models.Format,
    as: 'format',
    attributes: models.Format.attributes.lite,
  },
  {
    model: models.SampleRate,
    as: 'sample_rate',
    attributes: models.SampleRate.attributes.lite,
  },
  {
    model: models.ChannelLayout,
    as: 'channel_layout',
    attributes: models.ChannelLayout.attributes.lite,
  },
];

/**
 * Searches for master segment model with given id
 * @param {string} id
 * @param {*} opts additional function params
 * @returns {*} master segment model item
 */
function getById (id, opts = {}) {
  return models.MasterSegment
    .findOne({
      where: { id },
      attributes: models.MasterSegment.attributes.full,
      include: opts && opts.joinRelations? masterSegmentBaseInclude : []
    })
    .then(item => {
      if (!item) {
        throw new EmptyResultError(`Master segment with given id not found.`)
      }
      return item
    });
}

/**
 * Creates master segment item
 * @param {*} data master segment attributes
 * @param {*} opts additional function params
 * @returns {*} master segment model item
 */
function create(data, opts = {}) {
  if (!data) {
    throw new ValidationError('Cannot create master segment with empty object.');
  }
  const { stream_id, filename, format_id, duration, sample_count, sample_rate_id, channel_layout_id, channels_count, bit_rate, codec_id, sha1_checksum, meta } = data;
  return models.MasterSegment
    .create({ stream_id, filename, format_id, duration, sample_count, sample_rate_id, channel_layout_id, channels_count, bit_rate, codec_id, sha1_checksum, meta })
    .then(item => { return opts && opts.joinRelations? item.reload({ include: masterSegmentBaseInclude }) : item })
    .catch((e) => {
      console.error('Master segment service -> create -> error', e);
      throw new ValidationError('Cannot create master segment with provided data.');
    })
}

/**
 * Destroys master segment item
 * @param {*} masterSegment master segment modei item
 */
function remove(masterSegment) {
  return masterSegment.destroy();
}

/**
 * Checks if master segment with given sha1 checksum exists in specified stream
 * @param {*} stream_id
 * @param {*} sha1_checksum
 * @returns {boolean} returns false if no duplicates, throws ValidationError if exists
 */
function checkForDuplicates(stream_id, sha1_checksum) {
  // check for duplicate master segment files in this stream
  return models.MasterSegment
    .findAll({ where: { stream_id, sha1_checksum } })
    .then((existingMasterSegment) => {
      if (existingMasterSegment && existingMasterSegment.length) {
        throw new ValidationError('Duplicate file. Matching sha1 signature already ingested.');
      }
      return false;
    });
}

/**
 * Finds or creates model items for Codec, Format, SampleRate, ChannelLayout based on input value
 * Returns objcet with model item ids
 * @param {*} data object with values
 * @returns {*} object with mappings between attribute keys and ids
 */
async function findOrCreateRelationships(data) {
  const arr = [
    { modelName: 'Codec', objKey: 'codec' },
    { modelName: 'Format', objKey: 'format' },
    { modelName: 'SampleRate', objKey: 'sample_rate' },
    { modelName: 'ChannelLayout', objKey: 'channel_layout' },
  ]
  for (let item of arr) {
    const where = { value: data[item.objKey] }
    let modelItem = await models.utils.findOrCreateItem(models[item.modelName], where, where)
    data[`${item.objKey}_id`] = modelItem.id
  }
}

function format(masterSegment) {
  const { id, stream, filename, format, duration, sample_count, sample_rate, channel_layout, channels_count, bit_rate, codec, sha1_checksum, meta } = masterSegment
  let parsedMeta;
  try {
    parsedMeta = JSON.parse(meta);
  } catch (e) {
    parsedMeta = null;
  }
  return {
    id,
    stream,
    filename,
    format: format && format.value? format.value : null,
    duration,
    sample_count,
    sample_rate: sample_rate && sample_rate.value? sample_rate.value : null,
    channel_layout: channel_layout && channel_layout.value? channel_layout.value : null,
    channels_count,
    bit_rate,
    codec: codec && codec.value? codec.value : null,
    sha1_checksum,
    meta: parsedMeta
  };
}

module.exports = {
  getById,
  create,
  remove,
  checkForDuplicates,
  findOrCreateRelationships,
  format
}
