const express = require('express');
const sequelize = require('sequelize');
const models = require('../../../models');
const metricsService = require('../../../services/metrics/metrics-service');
var router = express.Router();

router.route('/')
  .get((req, res) => {

    let opts = {
      startingAfterLocal: req.query.starting_after_local,
      startingBeforeLocal: req.query.starting_before_local,
      sites: req.query.sites? (Array.isArray(req.query.sites)? req.query.sites : [req.query.sites]) : undefined,
      guardians: req.query.guardians? (Array.isArray(req.query.guardians)? req.query.guardians : [req.query.guardians]) : undefined,
    };

    metricsService.getAudioCountWithFilters(opts)
      .then(dataArr => {
        let count = dataArr[0].count;
        let times = metricsService.countToTimes(count);
        res.status(200).json(Object.assign({}, { files: count }, times));
      })
      .catch(function (err) {
        console.log('Error while getting metrics', err);
        res.status(500).json({ msg: err });
      });

  });

module.exports = router;
