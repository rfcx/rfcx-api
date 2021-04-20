const EmptyResultError = require('../../utils/converter/empty-result-error')
const ValidationError = require('../../utils/converter/validation-error')
const { findOrCreateItem } = require('../../utils/sequelize')
const { StreamSourceFile, Sequelize, Stream, AudioCodec, AudioFileFormat } = require('../../modelsTimescale')
const { getAccessibleObjectsIDs, STREAM } = require('../roles')
const pagedQuery = require('../../utils/db/paged-query')

const streamSourceFileBaseInclude = [
  Stream.include(),
  {
    model: AudioCodec,
    as: 'audio_codec',
    attributes: AudioCodec.attributes.lite
  },
  {
    model: AudioFileFormat,
    as: 'audio_file_format',
    attributes: AudioFileFormat.attributes.lite
  }
]

/**
 * Searches for source file model with given id
 * @param {string} id
 * @param {*} opts additional function params
 * @returns {*} source file model item
 */
function get (id, opts = {}) {
  return StreamSourceFile
    .findOne({
      where: { id },
      attributes: StreamSourceFile.attributes.full,
      include: opts && opts.joinRelations ? streamSourceFileBaseInclude : []
    })
    .then(item => {
      if (!item) {
        throw new EmptyResultError('Source file with given id not found.')
      }
      return item
    })
}

/**
 * Creates source file item
 * @param {*} data source file attributes
 * @param {*} opts additional function params
 * @returns {*} source file model item
 */
async function create (data, opts = {}) {
  if (!data) {
    throw new ValidationError('Cannot create source file with empty object.')
  }
  const { stream_id, filename, duration, sample_count, sample_rate, channels_count, bit_rate, sha1_checksum, meta } = data // eslint-disable-line camelcase
  await checkForDuplicates(stream_id, sha1_checksum, filename)
  const { audio_codec_id, audio_file_format_id } = await findOrCreateRelationships(data) // eslint-disable-line camelcase
  const where = { stream_id, sha1_checksum }
  const defaults = { stream_id, filename, audio_file_format_id, duration, sample_count, sample_rate, channels_count, bit_rate, audio_codec_id, sha1_checksum, meta }
  const transaction = opts.transaction || null
  return StreamSourceFile.findOrCreate({ where, defaults, transaction })
    .spread((item, created) => {
      if (!created) {
        throw new ValidationError('Duplicate file. Matching sha1 signature already ingested.')
      }
      return item
    })
    .catch((e) => {
      console.error('Source file service -> create -> error', e)
      throw new ValidationError('Cannot create source file with provided data.')
    })
}

/**
 * Get a list of stream source files matching the filters
 * @param {string} id
 * @param {*} filters Additional query options
 * @param {moment} filters.start Limit to a start date on or after
 * @param {moment} filters.end Limit to a start date before
 * @param {string[]} filters.streamIds Filter by one or more stream identifiers
 * @param {string[]} filters.sha1Checksums Filter by sha1 checksums
 * @param {*} options Additional get options
 * @param {number} options.readableBy Include only if the stream is accessible to the given user id
 * @param {string[]} options.fields Attributes and relations to include in results (defaults to lite attributes)
 * @param {number} options.limit
 * @param {number} options.offset
 * @returns {StreamSourceFile[]} StreamSourceFile
 */
async function query (filters, options) {
  const attributes = options.fields && options.fields.length > 0 ? StreamSourceFile.attributes.full.filter(a => options.fields.includes(a)) : StreamSourceFile.attributes.lite
  const include = options.fields && options.fields.length > 0 ? streamSourceFileBaseInclude.filter(i => options.fields.includes(i.as)) : []

  const where = {}
  if (options.readableBy) {
    const streamIds = await getAccessibleObjectsIDs(options.readableBy, STREAM, filters.streamIds)
    where.stream_id = {
      [Sequelize.Op.in]: streamIds
    }
  } else if (filters.streamIds) {
    where.stream_id = {
      [Sequelize.Op.in]: filters.streamIds
    }
  }
  if (filters.filenames) {
    where.filename = {
      [Sequelize.Op.in]: filters.filenames
    }
  }
  if (filters.sha1Checksums) {
    where.sha1_checksum = {
      [Sequelize.Op.in]: filters.sha1Checksums
    }
  }

  const query = {
    where,
    attributes,
    include,
    offset: options.offset,
    limit: options.limit
  }

  return pagedQuery(StreamSourceFile, query)
    .then(data => ({
      total: data.total,
      results: data.results.map((item) => {
        item = item.toJSON()
        if (item.audio_file_format) {
          item.audio_file_format = item.audio_file_format.value // eslint-disable-line camelcase
        }
        if (item.audio_codec) {
          item.audio_codec = item.audio_codec.value // eslint-disable-line camelcase
        }
        return item
      })
    }))
}

/**
 * Destroys source file item
 * @param {*} streamSourceFile source file modei item
 */
function remove (streamSourceFile) {
  return streamSourceFile.destroy()
}

/**
 * Checks if source file with given sha1 checksum exists in specified stream
 * @param {*} stream_id
 * @param {*} sha1_checksum
 * @returns {boolean} returns false if no duplicates, throws ValidationError if exists
 */
function checkForDuplicates (stream_id, sha1_checksum, filename) { // eslint-disable-line camelcase
  // check for duplicate source file files in this stream
  return StreamSourceFile
    .findAll({ where: { stream_id, sha1_checksum } }) // eslint-disable-line camelcase
    .then((existingStreamSourceFiles) => {
      if (existingStreamSourceFiles && existingStreamSourceFiles.length) {
        const sameFile = existingStreamSourceFiles.find(x => x.filename === filename)
        const message = sameFile ? 'This file was already ingested.' : 'Duplicate file. Matching sha1 signature already ingested.'
        throw new ValidationError(message)
      }
      return false
    })
}

/**
 * Finds or creates model items for AudioCodec, AudioFileFormat based on input value
 * Returns objcet with model item ids
 * @param {*} data object with values
 * @returns {*} object with mappings between attribute keys and ids
 */
async function findOrCreateRelationships (data) {
  const arr = [
    { model: AudioCodec, objKey: 'audio_codec' },
    { model: AudioFileFormat, objKey: 'audio_file_format' }
  ]
  const result = {}
  for (const item of arr) {
    const where = { value: data[item.objKey] }
    const modelItem = await findOrCreateItem(item.model, where, where)
    result[`${item.objKey}_id`] = modelItem.id
  }
  return result
}

/**
 * Checks for meta attributes and stringifies them if it is as an object. If it's not an object, deletes it.
 * @param {*} params
 */
 function transformMetaAttr (params) {
  if (params.meta && Object.keys(params.meta).length !== 0 && params.meta.constructor === Object) {
    params.meta = JSON.stringify(params.meta)
  } else {
    delete params.meta
  }
}

function format (streamSourceFile) {
  const { id, stream, filename, audio_file_format, duration, sample_count, sample_rate, channels_count, bit_rate, audio_codec, sha1_checksum, meta } = streamSourceFile // eslint-disable-line camelcase
  let parsedMeta
  try {
    parsedMeta = JSON.parse(meta)
  } catch (e) {
    parsedMeta = null
  }
  return {
    id,
    stream,
    filename,
    audio_file_format: audio_file_format && audio_file_format.value ? audio_file_format.value : null, // eslint-disable-line camelcase
    duration,
    sample_count,
    sample_rate,
    channels_count,
    bit_rate,
    audio_codec: audio_codec && audio_codec.value ? audio_codec.value : null, // eslint-disable-line camelcase
    sha1_checksum,
    meta: parsedMeta
  }
}

module.exports = {
  get,
  create,
  query,
  remove,
  checkForDuplicates,
  findOrCreateRelationships,
  transformMetaAttr,
  format
}
