const classifierDao = require('../../classifiers/dao')
const detectionDao = require('../dao/create')
const bestDetectionDao = require('../dao/best-detections')
const { Op } = require('sequelize')

async function addClassifiers (rawDetections, options = {}) {
  const transaction = options.transaction
  // Extract all classifier ids
  const unknownIds = [...new Set(rawDetections.map(d => `${d.classifier}`))]

  // Gather the potential classifiers
  const queryOptions = { fields: ['id', 'external_id', 'name', 'version', 'outputs'], transaction }
  const classifiersUsingIds = (await classifierDao.query({ ids: unknownIds.filter(id => !isNaN(id)) }, queryOptions)).results
  const classifiersUsingExternalIds = (await classifierDao.query({ externalIds: unknownIds }, queryOptions)).results
  const classifiersUsingNameAndVersions = (await classifierDao.query({ [Op.or]: unknownIds.map(x => x.toString().split('-v')).filter(x => x.length === 2).map(([name, version]) => ({ name, version })) }, queryOptions)).results

  // Create a mapping from unknown id to classifier
  const classifierMapping = {}
  for (const unknownId of unknownIds) {
    let classifier = classifiersUsingIds.find(c => c.id === parseInt(unknownId))
    if (classifier === undefined) {
      classifier = classifiersUsingExternalIds.find(c => c.external_id === unknownId)
      if (classifier === undefined) {
        classifier = classifiersUsingNameAndVersions.find(({ name, version }) => `${name}-v${version}` === unknownId)
      }
    }
    classifierMapping[unknownId] = classifier
  }

  return rawDetections.map(detection => ({ ...detection, classifier: classifierMapping[detection.classifier] }))
}

async function build (rawDetections, options = {}) {
  const detectionsWithClassifiers = await addClassifiers(rawDetections, options)

  // Remove detections without matching classifiers or missing classification ids (classifier outputs)
  const validDetections = detectionsWithClassifiers.filter(detection => {
    if (!detection.classifier) {
      return false
    }
    const output = (detection.classifier.outputs || []).find(i => i.output_class_name === detection.classification)
    if (!output) {
      return false
    }
    detection.output = output
    return true
  })
  const classifierIds = [...new Set(validDetections.map(detection => detection.classifier.id))]

  if (validDetections.length < rawDetections.length) {
    const missingIds = [...new Set(rawDetections.map(d => d.classifier).filter(c => !classifierIds.includes(c)))]
    console.warn(`WARN: Missing classifier or classifier output in classifiers with ids: ${missingIds.join(',')}`)
  }

  // Remove detections below the threshold
  const savableDetections = validDetections.filter(detection => detection.confidence > detection.output.ignore_threshold)

  const detections = savableDetections.map(detection => ({
    streamId: detection.streamId,
    classificationId: detection.output.classification_id,
    classifierId: detection.classifier.id,
    start: detection.start,
    end: detection.end,
    confidence: detection.confidence,
    classifierJobId: detection.classifierJobId
  }))

  return { detections, classifierIds }
}

async function create (rawDetections, options = {}) {
  // Find dependent ids, filter rows
  const { detections, classifierIds } = await build(rawDetections, options)

  // Save the detections
  await detectionDao.create(detections, options)

  // Mark classifiers as updated
  for (const id of classifierIds) {
    await classifierDao.update(id, null, { last_executed_at: new Date() }, options)
  }
}

async function updateBestDetections (classifierJob) {
  await bestDetectionDao.dropBestDetections(classifierJob)
  await bestDetectionDao.saveBestDetections(classifierJob)
}

module.exports = { create, updateBestDetections }
