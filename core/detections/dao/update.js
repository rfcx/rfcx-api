const moment = require('moment-timezone')
const { Detection } = require('../../_models')

/**
 * Update detection, `id`, `start`, and `streamId` are required.
 * @param {{ id: string, start: string, streamId: string, classificationId?: number, classifierId?: number, classifierJobId?: number }} filters where options
 * @param {Detection} detection
 * @param {string} detection.reviewStatus
 * @param {*} options
 * @param {options.transaction} options.transaction Transaction for sql chain
 * @returns {Promise<void>} nothing to return
 * @throws EmptyResultError when detection not found
 */
async function update (filters, detection, options = {}) {
  const allowedDetection = {}
  const allowedUpdates = ['reviewStatus']
  allowedUpdates.forEach(k => {
    if (detection[k] !== undefined) {
      allowedDetection[k] = detection[k]
    }
  })

  const where = {
    id: filters.id,
    start: moment.utc(filters.start).valueOf(),
    streamId: filters.streamId
  }

  if (filters?.classificationId) {
    where.classificationId = filters.classificationId
  }

  if (filters?.classifierId) {
    where.classifierId = filters.classifierId
  }

  if (filters?.classifierJobId) {
    where.classifierJobId = filters.classifierJobId
  }

  const transaction = options.transaction || null
  return await Detection.update(allowedDetection, {
    where,
    transaction
  })
}

module.exports = { update }
