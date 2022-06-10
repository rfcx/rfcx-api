const models = require('../../_models')

async function getClassifierJobsCountByStatus (status = 0) {
  const count = await models.ClassifierJob.count({
    where: { status }
  })
  return count
}

module.exports = {
  getClassifierJobsCountByStatus
}
