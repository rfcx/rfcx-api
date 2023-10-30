const streamSegmentDao = require('../../../stream-segments/dao')
const streamSourceFileDao = require('../../../stream-source-files/dao')
const { sequelize } = require('../../../_models')

const TRASHES_STREAM_ID = process.env.TRASHES_STREAM_ID

async function updateBatch (params) {
  return sequelize.transaction(async (transaction) => {
    const sourceFiles = await findSourceFiles(params, { transaction })
    await softDeleteSegmentsBatch(TRASHES_STREAM_ID, params, { transaction })
    await streamSourceFileDao.updateById({ stream_id: TRASHES_STREAM_ID }, sourceFiles, { transaction })
  })
}

/**
 * Find all source file ids belonging to a stream within specified start array
 * @param {object[]} arr Array of objects with stream ids and starts
 * @param {*} options
 * @param {Transaction} options.transaction Perform within given transaction
 */
async function findSourceFiles (arr, options = {}) {
  let sourceFiles = []
  for (const s of arr) {
    const segments = await streamSegmentDao.findByStreamAndStarts(s.stream, s.starts, { ...options, fields: ['stream_source_file_id'] })
    sourceFiles = [...sourceFiles, ...segments.map(s => s.stream_source_file_id)]
  }
  return sourceFiles
}

/**
 * Move all segments belonging to streams within specified start array to "trash" array
 * @param {oblect} streams Stream ids and array of segments start
 * @param {*} options
 * @param {Transaction} options.transaction Perform within given transaction
 */
async function softDeleteSegmentsBatch (streams, options = {}) {
  for (const s of streams) {
    await streamSegmentDao.updateByStreamAndStarts(s.stream, s.starts, { stream_id: TRASHES_STREAM_ID }, options)
  }
}

module.exports = {
  updateBatch
}
