const streamSegmentDao = require('../../../stream-segments/dao')
const streamSourceFileDao = require('../../../stream-source-files/dao')
const { sequelize } = require('../../../_models')

const TRASHES_STREAM_ID = process.env.TRASHES_STREAM_ID

async function updateBatch (params) {
  const transaction = await sequelize.transaction()
  try {
    const sourceFiles = await findMultipleSourceFiles(params, { transaction, fields: ['stream_source_file_id'] })
    await updateSegmentsBatch(TRASHES_STREAM_ID, params, { transaction })
    await streamSourceFileDao.updateById({ stream_id: TRASHES_STREAM_ID }, sourceFiles, { transaction })
    await transaction.commit()
  } catch (e) {
    console.info('updateBatch error', e)
    transaction.rollback()
  }
}

/**
 * Find all segments belonging to a stream within specified start array
 * @param {any} streams Stream ids and array of segments start
 * @param {*} options
 * @param {Transaction} options.transaction Perform within given transaction
 */
async function findMultipleSourceFiles (streams, options = {}) {
  const transaction = options.transaction
  const fields = options.fields
  let sourceFiles = []
  for (const s of streams) {
    const ids = await streamSegmentDao.findByStreamAndStarts(s.stream, s.starts, { transaction, fields })
    sourceFiles = sourceFiles.concat(ids.map(id => id.stream_source_file_id))
  }
  return sourceFiles
}

/**
 * Update all segments belonging to streams within specified start array
 * @param {string} trashesStreamId trashes stream id
 * @param {oblect} streams Stream ids and array of segments start
 * @param {*} options
 * @param {Transaction} options.transaction Perform within given transaction
 */
async function updateSegmentsBatch (trashesStreamId, streams, options = {}) {
  const transaction = options.transaction
  for (const s of streams) {
    await streamSegmentDao.updateByStreamAndStarts(s.stream, s.starts, { stream_id: trashesStreamId }, { transaction })
  }
}

module.exports = {
  updateBatch
}
