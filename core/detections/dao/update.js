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
async function update (streamId, start, data, options = {}) {
  const upd = {}
  const allowedUpdates = ['review_status']
  allowedUpdates.forEach(k => {
    if (data[k] !== undefined) {
      upd[k] = data[k]
    }
  })
  const transaction = options.transaction || null
  return await Detection.update(upd, {
    where: {
      stream_id: streamId,
      start: moment.utc(start).valueOf()
    },
    transaction
  })
}

module.exports = { update }
