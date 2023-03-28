const { ClassifierProcessedSegment } = require('../../_models')

async function batchCreate (segments) {
  await ClassifierProcessedSegment.bulkCreate(segments)
}

module.exports = {
  batchCreate
}
