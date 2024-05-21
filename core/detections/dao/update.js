const { Detection } = require('../../_models')

/**
 * Update detection
 * @param {{ start: string, streamId: string, classificationId: number, classifierId: number, classifierJobId?: number }} where where options
 * @param {Detection} detection
 * @param {string} detection.reviewStatus
 * @param {*} options
 * @param {options.transaction} options.transaction Transaction for sql chain
 * @returns {Promise<void>} nothing to return
 * @throws EmptyResultError when detection not found
 */
async function update (where, detection, options = {}) {
  const allowedDetection = {}
  const allowedUpdates = ['reviewStatus']
  allowedUpdates.forEach(k => {
    if (detection[k] !== undefined) {
      allowedDetection[k] = detection[k]
    }
  })

  const transaction = options.transaction || null
  return await Detection.update(allowedDetection, {
    where,
    transaction
  })
}

module.exports = { update }
