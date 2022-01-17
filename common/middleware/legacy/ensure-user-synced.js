/* eslint-disable promise/no-callback-in-promise */
/* eslint-disable promise/catch-or-return */
/* eslint-disable promise/always-return */

const { ensureUserSyncedFromToken } = require('../../../services/users/fused')

module.exports = (req, res, next) => {
  ensureUserSyncedFromToken(req).then(() => {
    next()
  }).catch((error) => {
    console.error(error)
    next()
  })
}
