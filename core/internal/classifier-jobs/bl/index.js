const models = require('../../../_models')

async function count (status = 0) {
  return await models.ClassifierJob.count({
    where: { status }
  })
}

module.exports = {
  count
}
