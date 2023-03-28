const dao = require('../../../classifiers/dao/processed-segments')

async function batchCreate (data) {
  const segments = data.map((d) => {
    return {
      streamId: d.stream,
      start: d.start,
      classifier_id: d.classifier,
      classifier_job_id: d.classifier_job
    }
  })
  return await dao.batchCreate(segments)
}

module.exports = {
  batchCreate
}
