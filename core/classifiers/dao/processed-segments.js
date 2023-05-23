const { ClassifierProcessedSegment } = require('../../_models')

async function create (segments, options = {}) {
  const transaction = options.transaction
  await ClassifierProcessedSegment.bulkCreate(segments, {
    transaction,
    ignoreDuplicates: true
  })
}

module.exports = {
  create
}
