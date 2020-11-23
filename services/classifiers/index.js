const models = require('../../modelsTimescale')
const EmptyResultError = require('../../utils/converter/empty-result-error')

const baseInclude = [
  {
    model: models.ClassifierDeployment,
    as: 'deployments',
    attributes: models.ClassifierDeployment.attributes.lite
  },
  {
    model: models.ClassifierOutput,
    as: 'outputs',
    attributes: models.ClassifierOutput.attributes.lite
  },
  {
    model: models.User,
    as: 'created_by',
    attributes: models.User.attributes.lite
  },
  {
    model: models.Stream,
    as: 'active_streams',
    attributes: models.Stream.attributes.lite
  }
]

/**
 * Searches for classifier with given uuid
 * @param {integer} id
 * @param {*} opts additional function params
 * @returns {*} classifier model item
 */
function get (id, opts = {}) {
  return models.Classifier
    .findOne({
      where: { id },
      attributes: models.Classifier.attributes.full,
      include: opts && opts.joinRelations ? baseInclude : []
    })
    .then(item => {
      if (!item) {
        throw new EmptyResultError('Classifier with given uuid not found.')
      }
      return item
    })
}

function getIdByExternalId (uuid) {
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
 * @param {Array<String>} externalIds An array of classifier external ids
 * @returns {Promise<Object>} Object that maps external ids to ids
 */
function getIdsByExternalIds (externalIds) {
  // TODO make more efficient by performing a single query
  return Promise.all(externalIds.map(uuid => getIdByExternalId(uuid)))
    .then(ids => {
      // Combine 2 arrays into a map
      const mapping = {}
      for (let i = 0; i < ids.length; i++) {
        mapping[externalIds[i]] = ids[i]
      }
      return mapping
    })
}

function query (attrs, opts = {}) {
  return models.Classifier.findAll({
    limit: attrs.limit,
    offset: attrs.offset,
    attributes: models.Classifier.attributes.lite
  })
}

function create (attrs) {
  const classifier = {
    name: attrs.name,
    version: attrs.version,
    external_id: attrs.external_id,
    model_url: attrs.model_url || '',
    model_runner: attrs.model_runner || 'tf2',
    created_by_id: attrs.createdById
  }
  return models.Classifier.create(classifier)
}

module.exports = {
  get,
  getIdsByExternalIds,
  query,
  create
}
