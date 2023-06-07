const { Detection } = require('../../_models')

async function create (detections, options = {}) {
  const transaction = options.transaction

  await Detection.bulkCreate(detections, { transaction })
}

module.exports = { create }
