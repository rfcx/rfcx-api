var models = require('../../../models')
var express = require('express')
var router = express.Router()
var passport = require('passport')
var views = require('../../../views/v1')
var httpError = require('../../../utils/http-errors.js')
passport.use(require('../../../middleware/passport-token').TokenStrategy)
var sequelize = require('sequelize')
var hasRole = require('../../../middleware/authorization/authorization').hasRole

router.route('/:guid/software')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), (req, res) => {
    const query = `
      SELECT soft.role as role, ver.version as version
      FROM GuardianMetaSoftwareVersions AS metaver
      INNER JOIN (
        SELECT MAX(last_checkin_at) as last_checkin, software_id, version_id, guardian_id
        FROM GuardianMetaSoftwareVersions
        GROUP BY software_id
      ) metaver_recent ON metaver.software_id = metaver_recent.software_id
      INNER JOIN GuardianSoftwareVersions AS ver ON metaver.version_id = ver.id
      INNER JOIN GuardianSoftware AS soft ON soft.id = ver.software_role_id
      INNER JOIN Guardians AS g ON metaver.guardian_id = g.id
      WHERE g.guid = "${req.params.guid}";
    `

    models.sequelize.query(query, { type: models.sequelize.QueryTypes.SELECT })
      .then((versionData) => {
        if (!versionData.length) {
          httpError(req, res, 404, null, 'Guardian or software versions not found.')
          return
        }
        const result = {}
        versionData.forEach((item) => {
          result[item.role] = {
            version: item.version
          }
        })
        return result
      })
      .then((versions) => {
        res.status(200).json(versions)
      })
      .catch(function (err) {
        httpError(req, res, 500, err, 'Failed to get guardian software versions')
      })
  })

// get the latest released version of the guardian software
// (primarily for guardians who are checking for updates)
router.route('/:guardian_id/software/:software_role')
  .get(passport.authenticate('token', { session: false }), function (req, res) {
    var softwareRole = req.params.software_role

    var inquiringGuardianBattery = parseInt(req.query.battery)
    var inquiringGuardianTimeStamp = new Date(parseInt(req.query.timestamp))

    models.Guardian
      .findOne({
        where: { guid: req.params.guardian_id }
      })
      .bind({})
      .then(function (dbGuardian) {
        if (!dbGuardian) {
          console.error('Guardian with given guid not found', { req: req.guid })
          throw new sequelize.EmptyResultError('Guardian with given guid not found.')
        }
        this.dbGuardian = dbGuardian
        return models.GuardianSoftware.findOne({
          where: { role: req.query.role }
        })
      })
      .then(function (dbSoftware) {
        if (!dbSoftware) {
          console.error('Software with given guid not found', { req: req.guid })
          throw new sequelize.EmptyResultError('Software with given guid not found.')
        }
        this.dbSoftware = dbSoftware
        return models.GuardianSoftwareVersion.findOne({
          where: {
            software_role_id: dbSoftware.id,
            version: req.query.version
          }
        })
      })
      .then(function (dbSoftwareVersion) {
        if (!dbSoftwareVersion) {
          console.error('SoftwareVersion with given guid not found', { req: req.guid })
          throw new sequelize.EmptyResultError('SoftwareVersion with given guid not found.')
        }
        return models.GuardianMetaUpdateCheckIn.create({
          guardian_id: this.dbGuardian.id,
          version_id: dbSoftwareVersion.id,
          role_id: this.dbSoftware.id
        })
      })
      .then(function (dbGuardianMetaUpdateCheckIn) {
        return models.GuardianMetaBattery.create({
          guardian_id: this.dbGuardian.id,
          check_in_id: null,
          measured_at: inquiringGuardianTimeStamp,
          battery_percent: inquiringGuardianBattery,
          battery_temperature: null
        })
      })
      .then(function (dbGuardianMetaBattery) {
        var dbQuery = {
          is_available: true
        }
        if (softwareRole === 'all') {
          dbQuery.is_updatable = true
        } else if (softwareRole === 'extra') {
          dbQuery.is_extra = true
        } else {
          dbQuery.role = softwareRole
        }
        return models.GuardianSoftware.findAll({
          where: dbQuery,
          include: [{ all: true }],
          order: [['current_version_id', 'ASC']]
        })
      })
      .then(function (dSoftware) {
        res.status(200).json(
          (this.dbGuardian.is_updatable) ? views.models.guardianSoftware(req, res, dSoftware) : []
        )
      })
      .catch(sequelize.EmptyResultError, function (err) {
        httpError(req, res, 404, null, err.message)
      })
      .catch(function (err) {
        httpError(req, res, 500, err, 'Failed to get latest software versions')
      })
  })

module.exports = router
