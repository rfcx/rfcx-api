'use strict'

const { query } = require('../../classifier-jobs/dao/index')
const { updateSummary } = require('../../classifier-jobs/bl/summary')

module.exports = {
  up: () => {
    return query()
      .then(async (data) => {
        for (const job of data.results) {
          await updateSummary(job.id)
        }
      })
  },
  down: () => {
    return Promise.resolve()
  }
}
