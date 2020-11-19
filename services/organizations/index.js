const models = require('../../modelsTimescale')
const EmptyResultError = require('../../utils/converter/empty-result-error')

const baseInclude = [
  {
    model: models.User,
    as: 'created_by',
    attributes: models.User.attributes.lite
  }
]

/**
 * Searches for organization model with given id
 * @param {string} id
 * @param {*} opts additional function params
 * @returns {*} organization model item
 */
function getById (id, opts = {}) {
  return models.Organization
    .findOne({
      where: { id },
      attributes: models.Organization.attributes.full,
      include: opts && opts.joinRelations ? baseInclude : [],
      paranoid: !opts.includeDeleted
    })
    .then(item => {
      if (!item) {
        throw new EmptyResultError('Organization with given id not found.')
      }
      return item
    })
}

module.exports = {
  getById
}
