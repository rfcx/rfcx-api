const models = require('../../modelsTimescale')
const EmptyResultError = require('../../utils/converter/empty-result-error')
const ValidationError = require('../../utils/converter/validation-error')
const ForbiddenError = require('../../utils/converter/forbidden-error')
const redis = require('../../utils/redis');

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
  if (attrs.end < attrs.start) {
    throw new ValidationError('"end" attribute can not be less than "start" attribute')
  }
  let where = {
    stream_id: attrs.stream_id
  }
  if (attrs.start.valueOf() === attrs.end.valueOf()) {
    where[models.Sequelize.Op.or] = {
      start: attrs.start.valueOf(),
      end: attrs.start.valueOf(),
      [models.Sequelize.Op.and]: {
        start: { [models.Sequelize.Op.lt]: attrs.start.valueOf() },
        end: { [models.Sequelize.Op.gt]: attrs.end.valueOf() },
      }
    }
  }
  else {
    where[models.Sequelize.Op.not] = {
      [models.Sequelize.Op.or]: [
        { start: { [models.Sequelize.Op.gte]: attrs.end.valueOf() } },
        { end: { [models.Sequelize.Op.lte]: attrs.start.valueOf() } },
      ]
    }
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
 * Collects gaps for selected time range and calculates coverage
 * @param {*} attrs segment attributes
 */
async function getStreamCoverage(attrs) {
  const queryData = await query(attrs)
  const segments = queryData.segments
  if (!segments.length) {
    return {
      coverage: 0,
      gaps: [{
        start: attrs.start,
        end: attrs.end
      }]
    }
  }
  let gaps = [];
  let totalDuration = 0;
  segments.forEach((current, index) => {
    let prev = index === 0 ? null : segments[index - 1];
    let prevEnds = prev? prev.end : attrs.start;
    totalDuration += (current.end - current.start);
    if (current.start > prevEnds) {
      gaps.push({
        start: prevEnds,
        end: current.start
      });
    }
  })
  let lastSegment = segments[segments.length - 1]
  if (lastSegment && (attrs.end > lastSegment.end)) {
    gaps.push({
      start: lastSegment.end,
      end: attrs.end
    });
  }
  const coverage = {
    coverage: totalDuration / (attrs.end - attrs.start),
    gaps
  }
  return coverage
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
  getStreamCoverage,
  format
}
