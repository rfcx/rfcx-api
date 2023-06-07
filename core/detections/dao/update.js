const moment = require('moment-timezone')
const { Detection } = require('../../_models')

/**
 * Update detection
 * @param {string} streamId
 * @param {string} start
 * @param {Detection} detection
 * @param {string} detection.reviewStatus
 * @param {*} options
 * @param {Transaction} options.transaction Transaction for sql chain
 * @throws EmptyResultError when detection not found
 */
async function update (streamId, start, detection, options = {}) {
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
      streamId,
      start: moment.utc(start).valueOf()
    },
    transaction
  })
}

module.exports = { update }
