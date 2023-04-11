const { ClassifierProcessedSegment } = require('../../_models')

async function batchCreate (segments, opts = {}) {
  const transaction = opts.transaction
  await ClassifierProcessedSegment.bulkCreate(segments, {
    transaction,
    ignoreDuplicates: true
  })
}

module.exports = {
  batchCreate
}
