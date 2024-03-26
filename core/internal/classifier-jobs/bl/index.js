const { RUNNING, WAITING } = require('../../../classifier-jobs/classifier-job-status')
const { ClassifierJob, sequelize, Sequelize } = require('../../../_models')
const { getSortFields } = require('../../../_utils/db/sort')

async function count (status = 0) {
  return await ClassifierJob.count({
    where: { status }
  })
}

async function query (filters, options = {}) {
  const where = {}

  if (filters.status) {
    where.status = filters.status
  }

  const order = getSortFields(options.sort || '-updated_at')
  return await ClassifierJob.findAll({
    where,
    order,
    limit: options.limit ?? 10,
    offet
  })
}

async function dequeue (maxConcurrency, maxRows) {
  const dequeuedIds = await sequelize.transaction(async transaction => {
    const replacements = { maxConcurrency, maxRows, waiting: WAITING, running: RUNNING }
    const ids = await sequelize.query(`
      SELECT id FROM (
        SELECT id, status, created_at 
        FROM classifier_jobs 
        WHERE status in (:waiting,:running) 
        ORDER BY status DESC, created_at 
        LIMIT :maxConcurrency
      ) waiting_classifier_jobs
      WHERE status = :waiting
      ORDER BY created_at
      LIMIT :maxRows
    `, { type: Sequelize.QueryTypes.SELECT, replacements, transaction }).map(row => row.id)

    if (ids.length === 0) { return [] }

    await ClassifierJob.update({ status: RUNNING, startedAt: sequelize.literal('CURRENT_TIMESTAMP') }, { where: { id: ids }, transaction })
    return ids
  })

  const where = { id: dequeuedIds }
  const order = [['created_at']]
  return await ClassifierJob.findAll({ where, order })
}

module.exports = {
  count,
  dequeue,
  query
}
