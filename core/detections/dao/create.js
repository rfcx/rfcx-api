const build = require('../bl/build')
const classifierService = require('../../classifiers/dao')
const { Detection } = require('../../_models')

async function create (rawDetections, opts = {}) {
  // Find dependent ids, filter rows
  const { detections, classifierIds } = await build(rawDetections, opts)
  // Save the detections
  await bulkCreate(detections, opts)

  // Mark classifiers as updated
  for (const id of classifierIds) {
    await classifierService.update(id, null, { last_executed_at: new Date() }, opts)
  }
}

function bulkCreate (detections, opts = {}) {
  const transaction = opts.transaction
  return Detection.bulkCreate(
    detections.map(d => ({
      stream_id: d.streamId,
      classification_id: d.classificationId,
      classifier_id: d.classifierId,
      start: d.start,
      end: d.end,
      confidence: d.confidence,
      classifier_job_id: d.classifierJobId ? d.classifierJobId : null
    })), { transaction })
}

module.exports = { create }
