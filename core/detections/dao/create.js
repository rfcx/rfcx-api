const build = require('../bl/build')
const classifierService = require('../../classifiers/dao')
const { Detection } = require('../../_models')

async function create (rawDetections) {
  // Find dependent ids, filter rows
  const { detections, classifierIds } = await build(rawDetections)

  // Save the detections
  await bulkCreate(detections)

  // Mark classifiers as updated
  await Promise.all(classifierIds.map(id => classifierService.update(id, null, { last_executed_at: new Date() })))
}

function bulkCreate (detections) {
  return Detection.bulkCreate(
    detections.map(d => ({
      stream_id: d.streamId,
      classification_id: d.classificationId,
      classifier_id: d.classifierId,
      start: d.start,
      end: d.end,
      confidence: d.confidence,
      classifier_job_id: d.classifierJobId ? d.classifierJobId : null
    })))
}

module.exports = { create }
