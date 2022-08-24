const models = require('../../_models')
const { EmptyResultError } = require('../../../common/error-handling/errors')
const pagedQuery = require('../../_utils/db/paged-query')

const availableIncludes = [
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
 * @param {*} options additional function params
 * @param {boolean} options.joinRelations Join the classifier related relation
 * @param {string[]} options.attributes Custom attributes
 * @returns {*} classifier model item
 * @throws EmptyResultError when classifier not found
 */
function get (id, options = {}) {
  return models.Classifier
    .findOne({
      where: { id },
      attributes: options && options.attributes ? options.attributes : models.Classifier.attributes.full,
      include: options && options.joinRelations ? availableIncludes : []
    })
    .then(classifier => {
      if (!classifier) {
        throw new EmptyResultError('Classifier with given id not found.')
      }
      const data = classifier.toJSON()
      // Remove join tables from json
      if (data.activeStreams) {
        data.activeStreams = data.activeStreams.map(({ classifierActiveStreams, ...obj }) => obj) // eslint-disable-line camelcase
      }

      if (data.activeProjects) {
        data.activeProjects = data.activeProjects.map(({ classifierActiveProjects, ...obj }) => obj) // eslint-disable-line camelcase
      }
      return data
    })
    .catch(() => {
      throw new EmptyResultError('Classifier with given id not found.')
    })
}

/**
 * Get a list of classifiers matching the conditions
 * @param {*} filters Classifier attributes to filter
 * @param {string} filters.keyword Where keyword is found (in the classifier name)
 * @param {number} filters.createdBy Where created by the given user id
 * @param {number[]} filters.ids Where the identifier is matched in the array
 * @param {string[]} filters.externalIds Where the external identifier is matched in the array
 * @param {*} options Query options
 * @param {string[]} options.fields Attributes and relations to include in results
 * @param {number} options.readableBy Include only classifiers readable by the given user id
 * @param {number} options.limit Maximum results to include
 * @param {number} options.offset Number of results to skip
 */
async function query (filters, options = {}) {
  const where = {}
  if (filters.keyword) {
    where.name = {
      [models.Sequelize.Op.iLike]: `%${filters.keyword}%`
    }
  }
  if (filters.createdBy) {
    where.createdById = filters.createdBy
  }
  if (filters.ids) {
    where.id = filters.ids
  }
  if (filters.externalIds) {
    where.externalId = filters.externalIds
  }

  // When readableBy is specified, only return public classifiers or classifiers created by the user
  if (options.readableBy) {
    where[models.Sequelize.Op.or] = {
      isPublic: true,
      createdById: options.readableBy
    }
  }

  const attributes = options.fields && options.fields.length > 0 ? models.Classifier.attributes.full.filter(a => options.fields.includes(a)) : models.Classifier.attributes.lite
  const include = options.fields && options.fields.length > 0 ? availableIncludes.filter(i => options.fields.includes(i.as)) : []

  return pagedQuery(models.Classifier, {
    where,
    attributes,
    include,
    limit: options.limit,
    offset: options.offset
  })
}

function create (attrs) {
  const classifierData = {
    name: attrs.name,
    version: attrs.version,
    externalId: attrs.externalId,
    modelUrl: attrs.modelUrl || '',
    modelRunner: attrs.modelRunner || 'tf2',
    createdById: attrs.createdById
  }
  return models.sequelize.transaction(async (t) => {
    // Create the classifier
    const classifier = await models.Classifier.create(classifierData, { transaction: t })

    // Create the outputs
    const outputsData = attrs.outputs.map(output => ({
      classifierId: classifier.id,
      classificationId: output.id,
      outputClassName: output.className
    }))
    await Promise.all(outputsData.map(output => models.ClassifierOutput.create(output, { transaction: t })))

    // Create the active projects and streams
    if (attrs.activeProjects) {
      await updateActiveProjects({ id: classifier.id, activeProjects: attrs.activeProjects }, t)
    }
    if (attrs.activeStreams) {
      await updateActiveStreams({ id: classifier.id, activeStreams: attrs.activeStreams }, t)
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
    // Only update if there is a change in status
    if (attrs.status) {
      const update = {
        ...attrs,
        id: id,
        createdBy: createdBy
      }
      await updateClassifierDeployment(update, t)
    }

    // Only update if there are activeStreams
    if (Array.isArray(attrs.activeStreams)) {
      const update = {
        id: id,
        activeStreams: attrs.activeStreams
      }
      await updateActiveStreams(update, t)
    }

    // Only update if there is activeProjects
    if (Array.isArray(attrs.activeProjects)) {
      const update = {
        id: id,
        activeProjects: attrs.activeProjects
      }
      await updateActiveProjects(update, t)
    }

    await classifier.update(attrs, t)
  })
}

async function updateClassifierDeployment (update, transaction) {
  // Search for current deployment with given platform
  const existingDeployment = await models.ClassifierDeployment.findOne({
    where: {
      classifierId: update.id,
      start: { [models.Sequelize.Op.lt]: new Date() },
      platform: update.platform,
      [models.Sequelize.Op.or]: [{ end: null }, { end: { [models.Sequelize.Op.gt]: new Date() } }]
    }
  })

  // Status and deployment is the same, do nothing
  const statusHasChanged = existingDeployment === null || (update.status !== undefined && existingDeployment.status !== update.status)
  const deploymentParametersHaveChanged = existingDeployment === null || (update.deploymentParameters !== undefined && existingDeployment.deploymentParameters !== update.deploymentParameters)
  if (!statusHasChanged && !deploymentParametersHaveChanged) {
    return
  }

  // Update the existing deployment before creating a new one
  if (existingDeployment) {
    await existingDeployment.update({ end: Date() }, { transaction: transaction })
  }

  // Create the new deployment
  const newDeployment = {
    classifierId: update.id,
    status: statusHasChanged ? update.status : existingDeployment.status,
    start: Date(),
    end: null,
    createdById: update.createdBy,
    platform: update.platform,
    deploymentParameters: deploymentParametersHaveChanged ? update.deploymentParameters : existingDeployment.deploymentParameters,
    deployed: false // Background job will transition this to true on classifier deployment
  }
  return await models.ClassifierDeployment.create(newDeployment, { transaction: transaction })
}

async function updateActiveStreams (update, transaction) {
  const existingStreams = await models.ClassifierActiveStream.findAll({
    attributes: ['streamId'],
    where: {
      classifierId: update.id
    }
  }, { transaction })
  const existingStreamIds = existingStreams.map(s => s.streamId)
  // Additions
  const deletedStreamIds = existingStreamIds.filter(s => !update.activeStreams.includes(s))
  await models.ClassifierActiveStream.destroy({
    where: {
      classifierId: update.id,
      streamId: deletedStreamIds
    }
  }, { transaction })

  // Deletions
  const addedStreamIds = update.activeStreams.filter(s => !existingStreamIds.includes(s))
  await models.ClassifierActiveStream.bulkCreate(addedStreamIds.map(streamId => ({
    classifierId: update.id,
    streamId: streamId
  })), { transaction })
}

async function updateActiveProjects (update, transaction) {
  const existingProjects = await models.ClassifierActiveProject.findAll({
    attributes: ['projectId'],
    where: {
      classifierId: update.id
    }
  }, { transaction })
  const existingProjectIds = existingProjects.map(p => p.projectId)

  // Additions
  const deletedProjectIds = existingProjectIds.filter(p => !update.activeProjects.includes(p))
  await models.ClassifierActiveProject.destroy({
    where: {
      classifierId: update.id,
      projectId: deletedProjectIds
    }
  }, { transaction })

  // Deletions
  const addedProjectIds = update.activeProjects.filter(p => !existingProjectIds.includes(p))
  await models.ClassifierActiveProject.bulkCreate(addedProjectIds.map(streamId => ({
    classifierId: update.id,
    projectId: streamId
  })), { transaction })
}

module.exports = {
  get,
  query,
  create,
  update
}
