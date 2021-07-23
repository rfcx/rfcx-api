const moment = require('moment')
const { Classifier, ClassifierDeployment, Project, Stream, Sequelize: { Op }, sequelize } = require('../../modelsTimescale')
const streamService = require('../../services/streams')
const projectService = require('../../services/projects')
const classifierMessageQueue = require('./classifier-message-queue/default')

const defaultPlatform = 'aws'

async function enqueueClassifiers (streamId, start) {
  // Find the preferred platform for the stream
  const stream = await streamService.get(streamId, { fields: ['id', 'project_id'] })
  let preferredPlatform = defaultPlatform
  if (stream.project_id) {
    const project = await projectService.get(stream.project_id, { fields: ['preferred_platform'] })
    if (project.preferred_platform) {
      preferredPlatform = project.preferred_platform
    }
  }

  // Get the classifiers that are enabled for the stream
  const classifiers = await getActiveClassifiers(stream)

  // Select the platform for each classifier
  const classifiersAndPlatforms = classifiers.map(classifier => ({ classifier: classifier.toJSON(), platform: selectPlatform(classifier, preferredPlatform) }))

  // Queue the prediction service
  await Promise.all(classifiersAndPlatforms.map(cp => enqueue(cp.platform, cp.classifier, streamId, start)))
}

async function getActiveClassifiers (stream) {
  const include = [
    {
      model: ClassifierDeployment,
      as: 'deployments',
      required: true,
      attributes: ['platform']
    },
    {
      model: Project,
      as: 'active_projects',
      attributes: []
    },
    {
      model: Stream,
      as: 'active_streams',
      attributes: []
    }]

  const where = {
    '$deployments.status$': [20, 30],
    '$deployments.start$': { [Op.lte]: sequelize.literal('CURRENT_TIMESTAMP') },
    '$deployments.end$': { [Op.or]: { [Op.is]: null, [Op.gt]: sequelize.literal('CURRENT_TIMESTAMP') } }
  }

  if (stream.project_id) {
    where[Op.or] = {
      '$active_projects.id$': stream.project_id,
      '$active_streams.id$': stream.id
    }
  } else {
    where['$active_streams.id$'] = stream.id
  }

  const options = {
    attributes: Classifier.attributes.lite,
    include,
    where
  }

  return await Classifier.findAll(options)
}

function selectPlatform (classifier, preferredPlatform) {
  if (classifier.deployments.find(d => d.platform === preferredPlatform)) {
    return preferredPlatform
  }
  return classifier.deployments.length > 0 ? classifier.deployments[0].platform : defaultPlatform
}

function enqueue (platform, classifier, streamId, start) {
  const isPriority = moment(start).isAfter(moment().subtract(1, 'day'))
  const message = { streamId, start }
  return classifierMessageQueue.publish(platform, classifier, isPriority, message)
}

module.exports = enqueueClassifiers