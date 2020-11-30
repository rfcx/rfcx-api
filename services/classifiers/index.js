const { Converter } = require('aws-sdk/clients/dynamodb')
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

function update (id, createdBy, attrs, opts = {}) {
  models.Classifier
    .findOne({
      where: { id },
      attributes: models.Classifier.attributes.full,
      include: opts && opts.joinRelations ? baseInclude : []
    })
    .then(item => {
      if (!item) {
        throw new EmptyResultError('Classifier with given uuid not found.')
      }
      // Update classifier-deployment if there is status in update body.
      if (attrs.status) {
        const update = {
          id: id,
          created_by: createdBy,
          status: attrs.status,
          deployment_parameters: attrs.deployment_parameters || null
        }
        updateStatus(update)
      }
      // Update classifier-active-streams if there is active_streams in update body.
      if (attrs.active_streams) {
        const update = {
          id: id,
          active_streams: attrs.active_streams
        }
        updateActiveStreams(update)
      }
      // Update classifier-deployment if there is deployment_parameters in update body.
      if (attrs.deployment_parameters) {
        const update = {
          id: id,
          parameters: attrs.deployment_parameters
        }
        updateDeploymentParameters(update)
      }

      return item.update(attrs)
    })
}

function updateStatus (update) {
  const classifierDeployment = {
    classifier_id: update.id,
    active: true,
    status: update.status,
    start: Date(),
    end: null,
    created_by_id: update.created_by,
    deployment_parameters: update.deployment_parameters
  }
  // Search for last active of classifier id
  models.ClassifierDeployment.findOne({
    where: {
      classifier_id: update.id,
      active: true
    },
    attributes: models.ClassifierDeployment.attributes.full
  })
    .then(itemDeployment => {
      if (!itemDeployment) {
      // Create if there is not last active
        models.ClassifierDeployment.create(classifierDeployment)
      } else {
        if (itemDeployment.status !== update.status) {
        // Create if the new one
          const updateDeployment = {
            active: false,
            end: Date()
          }
          // Update the old one with active false and end
          itemDeployment.update(updateDeployment)
          models.ClassifierDeployment.create(classifierDeployment)
        }
      }
    })
}

function updateActiveStreams (update) {
  const activeStreams = update.active_streams
  activeStreams.forEach(streamId => {
    const activeStreams = {
      classifier_id: update.id,
      stream_id: streamId
    }
    // Search for specific classifier_id and stream_id if it's existed
    models.ClassifierActiveStreams.findOne({
      where: activeStreams,
      attributes: models.ClassifierActiveStreams.attributes.full
    })
      .then(itemActiveStreams => {
      // If not existed then create new one
        if (!itemActiveStreams) {
          models.ClassifierActiveStreams.create(activeStreams)
        }
      })
  })
}

function updateDeploymentParameters (update) {
  // Search for last active of classifier id
  models.ClassifierDeployment.findOne({
    where: {
      classifier_id: update.id,
      active: true
    },
    attributes: models.ClassifierDeployment.attributes.full
  })
    .then(itemDeployment => {
      if (itemDeployment) {
      // Update deployment-parameters
        const updateDeployment = {
          deployment_parameters: update.parameters
        }
        itemDeployment.update(updateDeployment)
      }
    })
}

module.exports = {
  get,
  getIdsByExternalIds,
  query,
  create,
  update
}
