const models = require('../../modelsTimescale')
const EmptyResultError = require('../../utils/converter/empty-result-error')
const moment = require('moment')

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
    model: models.Project,
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
    .then(classifier => {
      if (!classifier) {
        throw new EmptyResultError('Classifier with given id not found.')
      }
      const data = classifier.toJSON()
      // Remove join tables from json
      if (data.active_streams) {
        data.active_streams = data.active_streams.map(({ classifier_active_streams, ...obj }) => obj) // eslint-disable-line camelcase
      }

      if (data.active_projects) {
        data.active_projects = data.active_projects.map(({ classifier_active_projects, ...obj }) => obj) // eslint-disable-line camelcase
      }
      return data
    })
}

function getIdByExternalId (externalId) {
  return models.Classifier
    .findOne({
      where: { external_id: externalId },
      attributes: ['id']
    }).then(item => {
      if (!item) {
        throw new EmptyResultError('Classifier with given external id not found.')
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
    if (attrs.activeProjects) {
      await updateActiveProjects({ id: classifier.id, active_projects: attrs.activeProjects }, t)
    }
    if (attrs.activeStreams) {
      await updateActiveStreams({ id: classifier.id, active_streams: attrs.activeStreams }, t)
    }

    return classifier
  })
}

async function update (id, createdBy, attrs) {
  const classifier = await models.Classifier.findOne({
    where: { id }
  })

  if (!classifier) {
    throw new EmptyResultError('Classifier with given id not found.')
  }

  await models.sequelize.transaction(async (t) => {
    // Only update if there is a change in status or deployment parameters
    if (attrs.status || attrs.deployment_parameters) {
      const update = {
        id: id,
        created_by: createdBy,
        status: attrs.status,
        platform: attrs.platform || 'aws',
        deployment_parameters: attrs.deployment_parameters || null
      }
      await updateDeployment(update, t)
    }

    // Only update if there are active_streams
    if (Array.isArray(attrs.active_streams)) {
      const update = {
        id: id,
        active_streams: attrs.active_streams
      }
      await updateActiveStreams(update, t)
    }

    // Only update if there is active_projects
    if (Array.isArray(attrs.active_projects)) {
      const update = {
        id: id,
        active_projects: attrs.active_projects
      }
      await updateActiveProjects(update, t)
    }

    await classifier.update(attrs, t)
  })
}

async function updateDeployment (update, transaction) {
  // Search for current deployment
  const existingDeployment = await models.ClassifierDeployment.findOne({
    where: {
      classifier_id: update.id,
      start: { [models.Sequelize.Op.lt]: new Date() },
      [models.Sequelize.Op.or]: [{ end: null }, { end: { [models.Sequelize.Op.gt]: new Date() } }]
    }
  })

  // Status is the same, do nothing
  if (existingDeployment && (!update.status || existingDeployment.status === update.status) && (!update.deployment_parameters || existingDeployment.deployment_parameters === update.deployment_parameters)) {
    return
  }

  // Update the existing deployment before creating a new one
  if (existingDeployment) {
    await existingDeployment.update({ end: Date() }, { transaction: transaction })
  }

  // Create the new deployment
  const newDeployment = {
    classifier_id: update.id,
    status: update.status,
    start: Date(),
    end: null,
    created_by_id: update.created_by,
    platform: update.platform,
    deployment_parameters: update.deployment_parameters,
    deployed: false // Background job will transition this to true on classifier deployment
  }
  return await models.ClassifierDeployment.create(newDeployment, { transaction: transaction })
}

async function updateActiveStreams (update, transaction) {
  const existingStreams = await models.ClassifierActiveStream.findAll({
    attributes: ['stream_id'],
    where: {
      classifier_id: update.id
    }
  }, { transaction })
  const existingStreamIds = existingStreams.map(s => s.stream_id)
  // Additions
  const deletedStreamIds = existingStreamIds.filter(s => !update.active_streams.includes(s))
  await models.ClassifierActiveStream.destroy({
    where: {
      classifier_id: update.id,
      stream_id: deletedStreamIds
    }
  }, { transaction })

  // Deletions
  const addedStreamIds = update.active_streams.filter(s => !existingStreamIds.includes(s))
  await models.ClassifierActiveStream.bulkCreate(addedStreamIds.map(streamId => ({
    classifier_id: update.id,
    stream_id: streamId
  })), { transaction })
}

async function updateActiveProjects (update, transaction) {
  const existingProjects = await models.ClassifierActiveProject.findAll({
    attributes: ['project_id'],
    where: {
      classifier_id: update.id
    }
  }, { transaction })
  const existingProjectIds = existingProjects.map(p => p.project_id)

  // Additions
  const deletedProjectIds = existingProjectIds.filter(p => !update.active_projects.includes(p))
  await models.ClassifierActiveProject.destroy({
    where: {
      classifier_id: update.id,
      project_id: deletedProjectIds
    }
  }, { transaction })

  // Deletions
  const addedProjectIds = update.active_projects.filter(p => !existingProjectIds.includes(p))
  await models.ClassifierActiveProject.bulkCreate(addedProjectIds.map(streamId => ({
    classifier_id: update.id,
    project_id: streamId
  })), { transaction })
}

/**
 * Gets classifier deployments based on input params
 * @param {*} filters
 * @param {string} filters.platform
 * @param {boolean} filters.deployed
 * @param {string} filters.endBefore
 * @param {string} filter.startAfter
 */
async function queryDeployments (filters) {
  const condition = {}

  if (filters.platform) {
    condition.platform = filters.platform
  }

  if (filters.deployed) {
    condition.deployed = filters.deployed
  }

  if (filters.startAfter) {
    condition.start = { [models.Sequelize.Op.gte]: moment.utc(filters.startAfter).valueOf() }
  }

  if (filters.endBefore) {
    condition.end = { [models.Sequelize.Op.lte]: moment.utc(filters.endBefore).valueOf() }
  }

  return models.ClassifierDeployment.findAll({
    where: condition,
    order: [['id', 'DESC']],
    attributes: models.ClassifierDeployment.attributes.full
  })
}

/**
 * Update classifier deployment deployed status by id
 * @param {number} id
 * @param {boolean} deployed
 */
async function updateDeploymentStatusById (id, deployed) {
  const deployment = await models.ClassifierDeployment.findOne({ where: { id } })
  await models.sequelize.transaction(async (t) => {
    await deployment.update({ deployed: deployed }, { transaction: t })
  })
}

module.exports = {
  get,
  getIdsByExternalIds,
  query,
  create,
  update,
  queryDeployments,
  updateDeploymentStatusById
}
