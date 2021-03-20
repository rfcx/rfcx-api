const classifierService = require('../classifiers')
const classificationService = require('../classifications')
const detectionsService = require('.')

async function addClassifiers (rawDetections) {
  // Extract all classifier ids
  const unknownIds = [...new Set(rawDetections.map(d => d.classifier))]

  // Gather the potential classifiers
  const queryOptions = { fields: ['id', 'external_id', 'outputs'] }
  const classifiersUsingIds = (await classifierService.query({ ids: unknownIds }, queryOptions)).results
  const classifiersUsingExternalIds = (await classifierService.query({ externalIds: unknownIds }, queryOptions)).results

  // Create a mapping from unknown id to classifier
  const classifierMapping = {}
  for (const unknownId of unknownIds) {
    let classifier = classifiersUsingIds.find(c => c.id === parseInt(unknownId))
    if (classifier === undefined) {
      classifier = classifiersUsingExternalIds.find(c => c.external_id === `${unknownId}`)
    }
    classifierMapping[unknownId] = classifier
  }

  return rawDetections.map(detection => ({ ...detection, classifier: classifierMapping[detection.classifier] }))
}

async function build (rawDetections, streamId) {
  const detectionsWithClassifiers = await addClassifiers(rawDetections)

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
    console.warn(`Missing classifier or classifier output in classifiers with ids: ${classifierIds.join(',')}`)
  }

  // Remove detections below the threshold
  const savableDetections = validDetections.filter(detection => detection.confidence > detection.output.ignore_threshold)

  const detections = savableDetections.map(detection => ({
    streamId,
    classificationId: detection.output.classification_id,
    classifierId: detection.classifier.id,
    start: detection.start,
    end: detection.end,
    confidence: detection.confidence
  }))

  return { detections, classifierIds }
}

module.exports = build
