const models = require('../../../_models')

async function count (status = 0) {
  return await models.ClassifierJob.count({
    where: { status }
  })
}

async function dequeue () {
  const where = { status: 0 }
  const limit = 1
  const order = [['created_at']]
  return await models.ClassifierJob.findAll({ where, limit, order })
}

module.exports = {
  count,
  dequeue
}
