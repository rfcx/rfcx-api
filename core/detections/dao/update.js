const moment = require('moment-timezone')
const { Detection } = require('../../_models')

/**
 * Update detection
 * @param {string} streamId stream id
 * @param {string} detectionId detection id
 * @param {string} start segment start time of a detection
 * @param {Detection} detection
 * @param {string} detection.reviewStatus
 * @param {*} options
 * @param {options.transaction} options.transaction Transaction for sql chain
 * @returns {Promise<void>} nothing to return
 * @throws EmptyResultError when detection not found
 */
async function update (streamId, detectionId, start, detection, options = {}) {
  const allowedDetection = {}
  const allowedUpdates = ['reviewStatus']
  allowedUpdates.forEach(k => {
    if (detection[k] !== undefined) {
      allowedDetection[k] = detection[k]
    }
  })

  const transaction = options.transaction || null
  return await Detection.update(allowedDetection, {
    where: {
      id: detectionId,
      streamId,
      start: moment.utc(start).valueOf()
    },
    transaction
  })
}

module.exports = { update }
