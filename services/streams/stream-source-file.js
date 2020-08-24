const models = require('../../modelsTimescale')
const EmptyResultError = require('../../utils/converter/empty-result-error')
const ValidationError = require('../../utils/converter/validation-error')

const streamSourceFileBaseInclude = [
  {
    model: models.Stream,
    as: 'stream',
    attributes: models.Stream.attributes.lite
  },
  {
    model: models.AudioCodec,
    as: 'audio_codec',
    attributes: models.AudioCodec.attributes.lite
  },
  {
    model: models.AudioFileFormat,
    as: 'audio_file_format',
    attributes: models.AudioFileFormat.attributes.lite
  }
]

/**
 * Searches for source file model with given id
 * @param {string} id
 * @param {*} opts additional function params
 * @returns {*} source file model item
 */
function getById (id, opts = {}) {
  return models.StreamSourceFile
    .findOne({
      where: { id },
      attributes: models.StreamSourceFile.attributes.full,
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
function create (data, opts = {}) {
  if (!data) {
    throw new ValidationError('Cannot create source file with empty object.')
  }
  const { stream_id, filename, audio_file_format_id, duration, sample_count, sample_rate, channels_count, bit_rate, audio_codec_id, sha1_checksum, meta } = data // eslint-disable-line camelcase
  return models.StreamSourceFile
    .create({ stream_id, filename, audio_file_format_id, duration, sample_count, sample_rate, channels_count, bit_rate, audio_codec_id, sha1_checksum, meta }) // eslint-disable-line camelcase
    .then(item => { return opts && opts.joinRelations ? item.reload({ include: streamSourceFileBaseInclude }) : item })
    .catch((e) => {
      console.error('Source file service -> create -> error', e)
      throw new ValidationError('Cannot create source file with provided data.')
    })
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
function checkForDuplicates (stream_id, sha1_checksum) { // eslint-disable-line camelcase
  // check for duplicate source file files in this stream
  return models.StreamSourceFile
    .findAll({ where: { stream_id, sha1_checksum } }) // eslint-disable-line camelcase
    .then((existingStreamSourceFile) => {
      if (existingStreamSourceFile && existingStreamSourceFile.length) {
        throw new ValidationError('Duplicate file. Matching sha1 signature already ingested.')
      }
      return false
    })
}

/**
 * Finds or creates model items for AudioCodec, AudioFileFormat, SampleRate, ChannelLayout based on input value
 * Returns objcet with model item ids
 * @param {*} data object with values
 * @returns {*} object with mappings between attribute keys and ids
 */
async function findOrCreateRelationships (data) {
  const arr = [
    { modelName: 'AudioCodec', objKey: 'audio_codec' },
    { modelName: 'AudioFileFormat', objKey: 'audio_file_format' }
  ]
  for (const item of arr) {
    const where = { value: data[item.objKey] }
    const modelItem = await models.utils.findOrCreateItem(models[item.modelName], where, where)
    data[`${item.objKey}_id`] = modelItem.id
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
  getById,
  create,
  remove,
  checkForDuplicates,
  findOrCreateRelationships,
  format
}
