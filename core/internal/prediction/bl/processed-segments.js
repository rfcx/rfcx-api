const dao = require('../../../classifiers/dao/processed-segments')
const { asyncEvery } = require('../../../../common/helpers')
const { hasPermission, STREAM, READ } = require('../../../roles/dao')
const { ForbiddenError } = require('../../../../common/error-handling/errors')

async function batchCreate (data) {
  if (data.creatableBy) {
    // check that user has access to all specified streams
    const streamIds = [...new Set(data.map(d => d.stream))]
    if (!(await asyncEvery(streamIds, (id) => hasPermission(READ, data.creatableBy, id, STREAM)))) {
      throw new ForbiddenError()
    }
  }
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
