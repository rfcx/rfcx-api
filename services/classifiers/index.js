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
  },
  {
    model:models.Project,
    as: 'active_projects',
    attributes: models.Project.attributes.lite
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
  const classifierData = {
    name: attrs.name,
    version: attrs.version,
    external_id: attrs.externalId,
    model_url: attrs.modelUrl || '',
    model_runner: attrs.modelRunner || 'tf2',
    created_by_id: attrs.createdById
  }
  return models.sequelize.transaction(async (t) => {
    // Create the classifier
    const classifier = await models.Classifier.create(classifierData, { transaction: t })

    // Create the outputs
    const outputsData = attrs.outputs.map(output => ({
      classifier_id: classifier.id,
      classification_id: output.id,
      output_class_name: output.className
    }))
    await Promise.all(outputsData.map(output => models.ClassifierOutput.create(output, { transaction: t })))

    // Create the active projects and streams
    // TODO - Frongs
    insertActiveProjects({id:classifier.id, active_projects:attrs.activeProjects})
    insertActiveStreams({id:classifier.id, active_streams:attrs.activeStreams})

    return classifier
  })
}

function update (id, createdBy, attrs, opts = {}) {
  return models.Classifier
    .findOne({
      where: { id },
      attributes: models.Classifier.attributes.full,
      include: opts && opts.joinRelations ? baseInclude : []
    })
    .then(async (item) => {
      if (!item) {
        throw new EmptyResultError('Classifier with given uuid not found.')
      }

      // TODO - Frongs - all updates in a single transaction - if 1 fails, they all fail

      // Update classifier-deployment if there is status in update body.
      if (attrs.status) {
        const update = {
          id: id,
          created_by: createdBy,
          status: attrs.status,
          deployment_parameters: attrs.deployment_parameters || null
        }
        await updateStatus(update)
      }

      // Update classifier-deployment if there is deployment_parameters in update body.
      if (attrs.deployment_parameters) {
        const update = {
          id: id,
          parameters: attrs.deployment_parameters
        }
        await updateDeploymentParameters(update)
      }

      // Update classifier-active-streams if there is active_streams in update body.
      if (attrs.active_streams) {
        const update = {
          id: id,
          active_streams: attrs.active_streams
        }
        await insertActiveStreams(update)
      }

      // TODO - Frongs - update active projects

      return item.update(attrs)
    })
}

function updateStatus (update) {
  const classifierDeployment = {
    classifier_id: update.id,
    status: update.status,
    start: Date(),
    end: null,
    created_by_id: update.created_by,
    deployment_parameters: update.deployment_parameters
  }
  // Search for last active of classifier id
  return models.ClassifierDeployment.findOne({
    where: {
      classifier_id: update.id,
      active: true
    },
    attributes: models.ClassifierDeployment.attributes.full
  })
    .then(itemDeployment => {
      if (!itemDeployment) {
        // Create if there is not last active
        const active = {
          active: true
        }
        const classifierObj = { ...classifierDeployment, ...active }
        return models.ClassifierDeployment.create(classifierObj)
      } else {
        if (itemDeployment.status !== update.status) {
          const updateDeployment = {
            end: Date()
          }
          // Update the old one with end
          itemDeployment.update(updateDeployment)
          // Create if the new one
          const active = {
            active: false
          }
          const classifierObj = { ...classifierDeployment, ...active }
          return models.ClassifierDeployment.create(classifierObj)
        }
      }
    })
}

function insertActiveStreams (update) {
  const activeStreams = update.active_streams
  activeStreams.forEach(streamId => {
    const stream = {
      classifier_id: update.id,
      stream_id: streamId
    }
    // Search for specific classifier_id and stream_id if it's existed
    models.ClassifierActiveStreams.findOne({
      where: stream,
      attributes: models.ClassifierActiveStreams.attributes.full
    })
      .then(itemActiveStreams => {
      // If not existed then create new one
        if (!itemActiveStreams) {
          models.ClassifierActiveStreams.create(stream)
        }
      })
  })
}

function insertActiveProjects (update) {
  const activeProjects = update.active_projects
  activeProjects.forEach(projectId => {
    const project = {
      classifier_id: update.id,
      project_id: projectId
    }
    // Search for specific classifier_id and project_id if it's existed
    models.ClassifierActiveProjects.findOne({
      where: project,
      attributes: models.ClassifierActiveProjects.attributes.full
    })
      .then(itemActiveProjects => {
      // If not existed then create new one
        if (!itemActiveProjects) {
          models.ClassifierActiveProjects.create(project)
        }
      })
  })
}

function updateDeploymentParameters (update) {
  // Search for last active of classifier id
  return models.ClassifierDeployment.findOne({
    where: {
      classifier_id: update.id,
      active: true
    },
    attributes: models.ClassifierDeployment.attributes.full
  })
    .then(itemDeployment => {
      if (itemDeployment && !itemDeployment.end) {
      // Update deployment-parameters
        const updateDeployment = {
          deployment_parameters: update.parameters
        }
        return itemDeployment.update(updateDeployment)
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
