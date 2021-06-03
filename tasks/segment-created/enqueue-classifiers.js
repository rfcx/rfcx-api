const moment = require('moment')
const { Classifier, ClassifierDeployment, ClassifierActiveProject, ClassifierActiveStream, Sequelize: { Op }, sequelize } = require('../../modelsTimescale')
const streamService = require('../../services/streams')
const projectService = require('../../services/projects')
const ClassifierMessageQueue = require('./classifier-message-queue')

const defaultPlatform = 'aws'

async function enqueueClassifiers (streamId, start) {
  // Find the preferred platform for the stream
  const stream = await streamService.get(streamId, { fields: 'id,projectId' })
  let preferredPlatform = defaultPlatform
  if (stream.projectId) {
    const project = await projectService.get(stream.projectId, { fields: 'preferredPlatform' })
    if (project.preferredPlatform) {
      preferredPlatform = project.preferredPlatform
    }
  }

  // Get the classifiers that are enabled for the stream
  const classifiers = await getActiveClassifiers(stream)

  // Select the platform for each classifier
  const classifiersAndPlatforms = classifiers.map(classifier => selectPlatform(classifier, preferredPlatform))

  // Queue the prediction service
  await Promise.all(classifiersAndPlatforms.map(cp => enqueue(cp.platform, cp.classifier, streamId, start)))
}

async function getActiveClassifiers (stream) {
  // const sql = `select c.id, c.name, c.version, cd.platform from classifiers c
  //       join classifier_deployments cd on c.id = cd.classifier_id
  //       left join classifier_active_projects cap on c.id = cap.classifier_id
  //       left join classifier_active_streams cas on c.id = cas.classifier_id
  //   where cd.start <= now() and (cd."end" is null or cd."end" > now())
  //     and cd.status in (20, 30)
  //     and (cas.stream_id = ? or cap.project_id = ?)`

  const include = [
    {
      model: ClassifierDeployment,
      as: 'deployments',
      required: true
    },
    {
      model: ClassifierActiveProject,
      as: 'activeProject'
    },
    {
      model: ClassifierActiveStream,
      as: 'activeStream'
    }]

  const where = {
    '$deployments.status$': [20, 30],
    '$deployments.start$': { [Op.lte]: sequelize.literal('CURRENT_TIMESTAMP') },
    '$deployments.end$': { [Op.or]: { [Op.is]: null, [Op.gt]: sequelize.literal('CURRENT_TIMESTAMP') } }
  }

  if (stream.projectId) {
    where[Op.or] = {
      '$activeProject.projectId$': stream.projectId,
      '$activeStream.streamId$': stream.id
    }
  } else {
    where['$activeStream.streamId$'] = stream.id
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
  const messageQueue = ClassifierMessageQueue.default()
  return messageQueue.publish(platform, classifier, isPriority, message)
}

module.exports = enqueueClassifiers
