const express = require('express')
const metricsService = require('../../_services/metrics/metrics-service')
const router = express.Router()

router.route('/')
  .get((req, res) => {
    const opts = {
      startingAfterLocal: req.query.starting_after_local,
      startingBeforeLocal: req.query.starting_before_local,
      sites: req.query.sites ? (Array.isArray(req.query.sites) ? req.query.sites : [req.query.sites]) : undefined,
      guardians: req.query.guardians ? (Array.isArray(req.query.guardians) ? req.query.guardians : [req.query.guardians]) : undefined
    }

    metricsService.getAudioCountWithFilters(opts)
      .then(dataArr => {
        const count = dataArr[0].count
        const times = metricsService.countToTimes(count)
        res.status(200).json(Object.assign({}, { files: count }, times))
      })
      .catch(function (err) {
        console.error('Error while getting metrics', err)
        res.status(500).json({ msg: err })
      })
  })

module.exports = router
