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
 * Returns list of segments with total number filtered by specified attributes
 * @param {*} attrs segment attributes
 * @param {*} opts additional function params
 */
function query (attrs, opts = {}) {
  let where = {
    stream_id: attrs.stream_id,
    [models.Sequelize.Op.or]: [
      {
        [models.Sequelize.Op.and]: {
          start: { [models.Sequelize.Op.lte]: attrs.start },
          end:   { [models.Sequelize.Op.gt]: attrs.end }
        },
      },
      {
        [models.Sequelize.Op.and]: {
          start: { [models.Sequelize.Op.gte]: attrs.start },
          end:   { [models.Sequelize.Op.lte]: attrs.end }
        },
      },
      {
        [models.Sequelize.Op.and]: {
          start: { [models.Sequelize.Op.lt]: attrs.end },
          end:   { [models.Sequelize.Op.gte]: attrs.end }
        }
      }
    ]
  }

  let method = (!!attrs.limit || !!attrs.offset) ? 'findAndCountAll' : 'findAll'; // don't use findAndCountAll if we don't need to limit and offset
  return models.Segment[method]({
    where,
    limit: attrs.limit,
    offset: attrs.offset,
    attributes: models.Segment.attributes.full,
    include: opts.joinRelations? segmentBaseInclude : [],
    order: [ ['start', 'ASC'] ]
  })
  .then((data) => {
    return {
      count: method === 'findAndCountAll' ? data.count : data.length,
      segments: method === 'findAndCountAll' ? data.rows : data,
    };
  })
}

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

/**
 * Formats single item or array with multiple items
 * @param {*} items single item or array with multiple items
 */
function format(data) {
  let isArray = Array.isArray(data)
  data = isArray ? data : [ data ];
  data = data.map((item) => {
    const { id, stream, start, end, sample_count, master_segment, file_extension } = item
    return {
      id,
      stream,
      start,
      end,
      sample_count,
      master_segment,
      file_extension: file_extension && file_extension.value? file_extension.value : null,
    };
  })
  return isArray? data : data[0];
}

module.exports = {
  query,
  getById,
  create,
  remove,
  findOrCreateRelationships,
  format
}
