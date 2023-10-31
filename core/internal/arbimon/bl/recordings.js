const streamSegmentDao = require('../../../stream-segments/dao')
const streamSourceFileDao = require('../../../stream-source-files/dao')
const { sequelize } = require('../../../_models')

const TRASHES_STREAM_ID = process.env.TRASHES_STREAM_ID

async function softDeleteRecordings (params) {
  return sequelize.transaction(async (transaction) => {
    await softDeleteSourceFilesBatch(params, { transaction })
    await softDeleteSegmentsBatch(params, { transaction })
  })
}

/**
 * Move all segments belonging to streams within specified start array to "trash" array
 * @param {oblect[]} arr Array of objects with stream ids and starts
 * @param {*} options
 * @param {Transaction} options.transaction Perform within given transaction
 */
async function softDeleteSegmentsBatch (arr, options = {}) {
  for (const item of arr) {
    await streamSegmentDao.updateByStreamAndStarts(item.stream, item.starts, { stream_id: TRASHES_STREAM_ID }, options)
  }
}

/**
 * Find all source file ids belonging to a stream within specified start array
 * @param {object[]} arr Array of objects with stream ids and starts
 * @param {*} options
 * @param {Transaction} options.transaction Perform within given transaction
 */
async function findSourceFiles (arr, options = {}) {
  let sourceFiles = []
  for (const item of arr) {
    const segments = await streamSegmentDao.findByStreamAndStarts(item.stream, item.starts, { ...options, fields: ['stream_source_file_id'] })
    sourceFiles = [...sourceFiles, ...segments.map(s => s.stream_source_file_id)]
  }
  return sourceFiles
}

/**
 * Move all source files belonging to streams within specified start array to "trash" array
 * @param {object[]} arr Array of objects with stream ids and starts
 * @param {*} options
 * @param {Transaction} options.transaction Perform within given transaction
 */
async function softDeleteSourceFilesBatch (arr, options = {}) {
  const ids = await findSourceFiles(arr, options)
  await streamSourceFileDao.updateByIds({ stream_id: TRASHES_STREAM_ID }, ids, options)
}

module.exports = {
  softDeleteRecordings
}
