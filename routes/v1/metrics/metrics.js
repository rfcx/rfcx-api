const express = require('express');
const sequelize = require('sequelize');
const models = require('../../../models');
const sqlUtils = require('../../../utils/misc/sql');
var router = express.Router();

router.route('/')
  .get((req, res) => {

    let opts = {
      startingAfterLocal: req.query.starting_after_local,
      startingBeforeLocal: req.query.starting_before_local,
      sites: req.query.sites? (Array.isArray(req.query.sites)? req.query.sites : [req.query.sites]) : undefined,
      guardians: req.query.guardians? (Array.isArray(req.query.guardians)? req.query.guardians : [req.query.guardians]) : undefined,
    };

    let sql = 'SELECT COUNT(*) as count from GuardianAudio as Audio';
    sql = sqlUtils.condAdd(sql, opts.sites || opts.startingAfterLocal || opts.startingBeforeLocal,
      ' LEFT JOIN GuardianSites AS Site ON Audio.site_id = Site.id');
    sql = sqlUtils.condAdd(sql, opts.guardians, ' LEFT JOIN Guardians AS Guardian ON Audio.guardian_id = Guardian.id');
    sql = sqlUtils.condAdd(sql, true, ' WHERE 1=1');

    sql = sqlUtils.condAdd(sql, opts.startingAfterLocal, ' AND CONVERT_TZ(Audio.measured_at, "UTC", Site.timezone) > :startingAfterLocal');
    sql = sqlUtils.condAdd(sql, opts.startingBeforeLocal, ' AND CONVERT_TZ(Audio.measured_at, "UTC", Site.timezone) < :startingBeforeLocal');
    sql = sqlUtils.condAdd(sql, opts.sites, ' AND Site.guid IN (:sites)');
    sql = sqlUtils.condAdd(sql, opts.guardians, ' AND Guardian.guid IN (:guardians)');

    models.sequelize.query(sql, { replacements: opts, type: models.sequelize.QueryTypes.SELECT })
      .then(dataArr => {
        let data = dataArr[0];
        res.status(200).json({ count: data.count });
      })
      .catch(function (err) {
        console.log('Error while getting metrics', err);
        res.status(500).json({ msg: err });
      });

  });

module.exports = router;
