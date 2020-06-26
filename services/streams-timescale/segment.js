const models = require('../../modelsTimescale')
const EmptyResultError = require('../../utils/converter/empty-result-error')
const ValidationError = require('../../utils/converter/validation-error')
const ForbiddenError = require('../../utils/converter/forbidden-error')

let segmentBaseInclude = [
  {
    model: models.Stream,
    as: 'stream',
    attributes: models.Stream.attributes.lite,
  },
  {
    model: models.MasterSegment,
    as: 'master_segment',
    attributes: models.MasterSegment.attributes.lite,
  },
  {
    model: models.FileExtension,
    as: 'file_extension',
    attributes: models.FileExtension.attributes.lite,
  }
];

/**
 * Searches for segment model with given id
 * @param {string} id
 * @param {*} opts additional function params
 * @returns {*} segment model item
 */
function getById (id, opts = {}) {
  return models.Segment
    .findOne({
      where: { id },
      attributes: models.Segment.attributes.full,
      include: opts && opts.joinRelations? segmentBaseInclude : []
    })
    .then(item => {
      if (!item) {
        throw new EmptyResultError(`Segment with given id not found.`)
      }
      return item
    });
}

/**
 * Creates segment item
 * @param {*} data segment attributes
 * @param {*} opts additional function params
 * @returns {*} segment model item
 */
function create(data, opts = {}) {
  if (!data) {
    throw new ValidationError('Cannot create segment with empty object.');
  }
  // const { stream_id, filename, format_id, duration, sample_count, sample_rate_id, channel_layout_id, channels_count, bit_rate, codec_id, sha1_checksum, meta } = data;
  const { stream_id, start, end, sample_count, master_segment_id, file_extension_id }  = data
  return models.Segment
    .create({ stream_id, start, end, sample_count, stream_id, master_segment_id, file_extension_id })
    .then(item => { return opts && opts.joinRelations? item.reload({ include: segmentBaseInclude }) : item })
    .catch((e) => {
      console.error('Segment service -> create -> error', e);
      throw new ValidationError('Cannot create segment with provided data.');
    })
}

/**
 * Destroys segment item
 * @param {*} segment segment modei item
 */
function remove(segment) {
  return segment.destroy();
}

/**
 * Finds or creates model items for FileExtension based on input value
 * Returns objcet with model item ids
 * @param {*} data object with values
 * @returns {*} object with mappings between attribute keys and ids
 */
async function findOrCreateRelationships(data) {
  const arr = [
    { modelName: 'FileExtension', objKey: 'file_extension' },
  ]
  for (let item of arr) {
    const where = { value: data[item.objKey] }
    let modelItem = await models.utils.findOrCreateItem(models[item.modelName], where, where)
    data[`${item.objKey}_id`] = modelItem.id
  }
}

function format(segment) {
  const { id, stream, start, end, sample_count, master_segment, file_extension } = segment
  return {
    id,
    stream,
    start,
    end,
    sample_count,
    master_segment,
    file_extension: file_extension && file_extension.value? file_extension.value : null,
  };
}

module.exports = {
  getById,
  create,
  remove,
  findOrCreateRelationships,
  format
}
