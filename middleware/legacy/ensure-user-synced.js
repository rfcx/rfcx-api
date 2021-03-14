
const { ensureUserSyncedFromToken } = require('../../services/users/fused')

module.exports = (req, res, next) => {
  ensureUserSyncedFromToken(req).then(() => {
    next()
  })
}