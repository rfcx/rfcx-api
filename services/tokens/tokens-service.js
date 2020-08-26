var models = require('../../models')

function findUserTokens (user) {
  return models.UserToken
    .findAll({ where: { user_id: user.id } })
}

function removeUserTokens (user) {
  return models.UserToken
    .destroy({ where: { user_id: user.id } })
}

module.exports = {
  findUserTokens: findUserTokens,
  removeUserTokens: removeUserTokens
}
