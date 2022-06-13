const models = require('../../../_models')

async function count (status = 0) {
  return await models.ClassifierJob.count({
    where: { status }
  })
}

async function dequeue () {
  return await models.ClassifierJob.findAll({ limit: 1, order: [['created_at']] })
}

module.exports = {
  count,
  dequeue
}
