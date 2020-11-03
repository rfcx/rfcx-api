const models = require('../../modelsTimescale')
const EmptyResultError = require('../../utils/converter/empty-result-error')

/**
 * Searches for classifier with given uuid
 * @param {string} uuid
 * @param {*} opts additional function params
 * @returns {*} classifier model item
 */
function getByUuid (uuid, opts = {}) {
  return models.Classifier
    .findOne({
      where: { uuid },
      attributes: models.Classifier.attributes.full
    })
    .then(item => {
      if (!item) {
        throw new EmptyResultError('Classifier with given uuid not found.')
      }
      return item
    })
}

function getId (uuid) {
  return models.Classifier
    .findOne({
      where: { uuid },
      attributes: ['id']
    }).then(item => {
      if (!item) {
        throw new EmptyResultError('Classifier with given uuid not found.')
      }
      return item.id
    })
}

/**
 * Given a set of uuid, returns their ids as an object map
 * @param {Array<String>} uuids An array of classifier uuids
 * @returns {Promise<Object>} Object that maps uuids to ids
 */
function getIds (uuids) {
  return Promise.all(uuids.map(uuid => getId(uuid)))
    .then(ids => {
      // Combine 2 arrays into a map
      const mapping = {}
      for (let i = 0; i < ids.length; i++) {
        mapping[uuids[i]] = ids[i]
      }
      return mapping
    })
}

function query (attrs, opts = {}) {

}

module.exports = {
  getByUuid,
  getIds,
  query
}
