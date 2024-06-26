const models = require('../../_models')
const { ForbiddenError, EmptyResultError } = require('../../../common/error-handling/errors')
const pagedQuery = require('../../_utils/db/paged-query')
const { toCamelObject } = require('../../_utils/formatters/string-cases')
const { parseClassifierOutputMapping } = require('../dao/parsing')
const { getIds } = require('../../classifications/dao')
const { getSortFields } = require('../../_utils/db/sort')

const availableIncludes = [
  {
    model: models.ClassifierDeployment,
    as: 'deployments',
    attributes: models.ClassifierDeployment.attributes.lite
  },
  {
    model: models.ClassifierOutput,
    as: 'outputs',
    attributes: models.ClassifierOutput.attributes.lite,
    include: [{
      model: models.Classification,
      as: 'classification',
      attributes: models.Classification.attributes.lite
    }]
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
async function get (id, options = {}) {
  const requiredAttrs = ['is_public', 'created_by_id']
  const transaction = options.transaction
  const where = { id }

  const attributes = options.fields && options.fields.length > 0 ? models.Classifier.attributes.full.filter(a => options.fields.includes(a)) : models.Classifier.attributes.lite
  const include = options.fields && options.fields.length > 0 ? availableIncludes.filter(i => options.fields.includes(i.as)) : []

  let classifier = await models.Classifier.findOne({
    where,
    attributes: [...requiredAttrs, ...attributes],
    include,
    transaction
  })
  if (!classifier) {
    throw new EmptyResultError('Classifier with given id not found.')
  }
  classifier = classifier.toJSON()
  // When readableBy is specified, only return public classifiers or classifiers created by the user
  if (options.readableBy && !classifier.is_public && classifier.created_by_id !== options.readableBy) {
    throw new ForbiddenError()
  }
  // delete attributes we needed for permissions which user hasn't requested
  requiredAttrs.forEach((a) => {
    if (!attributes.includes(a)) {
      delete classifier[a]
    }
  })
  if (classifier.activeStreams) {
    classifier.activeStreams = classifier.activeStreams.map(({ classifierActiveStreams, ...obj }) => obj)
  }

  if (classifier.activeProjects) {
    classifier.activeProjects = classifier.activeProjects.map(({ classifierActiveProjects, ...obj }) => obj)
  }

  return toCamelObject(classifier, 3)
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
  const transaction = options.transaction
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
  const order = options.sort ? getSortFields(options.sort) : []

  return pagedQuery(models.Classifier, {
    where,
    attributes,
    include,
    limit: options.limit,
    offset: options.offset,
    order,
    transaction
  })
}

function create (attrs) {
  const classifierData = {
    name: attrs.name,
    version: attrs.version,
    externalId: attrs.externalId,
    modelUrl: attrs.modelUrl || '',
    modelRunner: attrs.modelRunner || 'tf2',
    createdById: attrs.createdById,
    parameters: attrs.parameters
  }
  return models.sequelize.transaction(async (transaction) => {
    // Create the classifier
    const classifier = await models.Classifier.create(classifierData, { transaction })

    // Create the outputs
    const outputsData = attrs.outputs.map(output => ({
      classifierId: classifier.id,
      classificationId: output.id,
      outputClassName: output.className,
      ignoreThreshold: output.threshold
    }))
    await models.ClassifierOutput.bulkCreate(outputsData, { transaction })

    // Create the active projects and streams
    if (attrs.activeProjects) {
      await updateActiveProjects({ id: classifier.id, activeProjects: attrs.activeProjects }, { transaction })
    }
    if (attrs.activeStreams) {
      await updateActiveStreams({ id: classifier.id, activeStreams: attrs.activeStreams }, { transaction })
    }

    return classifier
  })
}

async function update (id, createdBy, attrs, opts = {}) {
  const isTransactionLocal = !opts.transaction
  let transaction = opts.transaction
  if (!transaction) {
    transaction = await models.sequelize.transaction()
  }
  try {
    const classifier = await models.Classifier.findOne({
      where: { id },
      transaction
    })

    if (!classifier) {
      throw new EmptyResultError('Classifier with given id not found.')
    }
    // Only update if there is a change in status
    if (attrs.status) {
      const update = {
        ...attrs,
        id,
        createdBy
      }
      await updateClassifierDeployment(update, { transaction })
    }

    // Only update if there are activeStreams
    if (Array.isArray(attrs.activeStreams)) {
      const update = {
        id,
        activeStreams: attrs.activeStreams
      }
      await updateActiveStreams(update, { transaction })
    }

    // Only update if there is activeProjects
    if (Array.isArray(attrs.activeProjects)) {
      const update = {
        id,
        activeProjects: attrs.activeProjects
      }
      await updateActiveProjects(update, { transaction })
    }

    // Only update if there is classificationValues
    if (Array.isArray(attrs.classificationValues)) {
      const update = {
        classificationValues: attrs.classificationValues
      }
      await updateClassifierOutputs(id, update, { transaction })
    }

    await classifier.update(attrs, { transaction })
    if (isTransactionLocal) {
      await transaction.commit()
    }
  } catch (e) {
    if (isTransactionLocal) {
      await transaction.rollback()
    }
    throw e
  }
}

async function updateClassifierDeployment (update, opts = {}) {
  const transaction = opts.transaction
  // Search for current deployment with given platform
  const existingDeployment = await models.ClassifierDeployment.findOne({
    where: {
      classifierId: update.id,
      start: { [models.Sequelize.Op.lt]: new Date() },
      platform: update.platform,
      [models.Sequelize.Op.or]: [{ end: null }, { end: { [models.Sequelize.Op.gt]: new Date() } }]
    }
  }, { transaction })

  // Status and deployment is the same, do nothing
  const statusHasChanged = existingDeployment === null || (update.status !== undefined && existingDeployment.status !== update.status)
  const deploymentParametersHaveChanged = existingDeployment === null || (update.deploymentParameters !== undefined && existingDeployment.deploymentParameters !== update.deploymentParameters)
  if (!statusHasChanged && !deploymentParametersHaveChanged) {
    return
  }

  // Update the existing deployment before creating a new one
  if (existingDeployment) {
    await existingDeployment.update({ end: Date() }, { transaction })
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
  return await models.ClassifierDeployment.create(newDeployment, { transaction })
}

async function updateActiveStreams (update, opts = {}) {
  const transaction = opts.transaction
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
    streamId
  })), { transaction })
}

async function updateActiveProjects (update, opts = {}) {
  const transaction = opts.transaction
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

async function updateClassifierOutputs (id, data, opts = {}) {
  const transaction = opts.transaction
  // Get the classification ids for each output (or error if not found)
  const outputMappings = data.classificationValues.map(parseClassifierOutputMapping)
  const serverIds = await getIds(outputMappings.map(value => value.to), opts)
  // Create the outputs
  const updateData = outputMappings.map(output => ({
    classificationId: serverIds[output.to],
    classificationName: output.to,
    outputClassName: output.from,
    ignoreThreshold: output.threshold
  }))

  // Get current classifier output of classifier
  const currentOutputs = (await models.ClassifierOutput.findAll({ where: { classifierId: id }, transaction })).map(output => ({
    classifierId: output.classifierId,
    classificationId: output.classificationId,
    outputClassName: output.outputClassName,
    ignoreThreshold: output.ignoreThreshold
  }))
  // Update current output with the updateData
  updateData.forEach(data => {
    const targetIndex = currentOutputs.findIndex(output => data.classificationId === output.classificationId && data.outputClassName === output.outputClassName)
    if (targetIndex === -1) {
      throw new EmptyResultError(`Classification "${data.classificationName}" or Class name "${data.outputClassName}" does not exist for this classifier`)
    }
    // Replace with updated data
    currentOutputs[targetIndex] = {
      classifierId: id,
      classificationId: data.classificationId,
      outputClassName: data.outputClassName,
      ignoreThreshold: data.ignoreThreshold
    }
  })

  // Delete all current classifier outputs of classifier
  await models.ClassifierOutput.destroy({ where: { classifierId: id }, transaction })

  // Batch insert updated outputs
  await models.ClassifierOutput.bulkCreate(currentOutputs, { transaction })
}

module.exports = {
  get,
  query,
  create,
  update
}
