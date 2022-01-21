const models = require('../../_models')
const express = require('express')
const router = express.Router()
const passport = require('passport')
const views = require('../../views/v1')
const httpError = require('../../../utils/http-errors.js')
passport.use(require('../../../common/middleware/passport-token').TokenStrategy)
const sequelize = require('sequelize')
const hasRole = require('../../../common/middleware/authorization/authorization').hasRole

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

router.route('/:guid/software/preferences')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), (req, res) => {
    models.Guardian.findOne({ where: { guid: req.params.guid } })
      .then(function (dbGuardian) {
        if (!dbGuardian) {
          console.error('Guardian with given guid not found', { req: req.guid })
          throw new sequelize.EmptyResultError('Guardian with given guid not found.')
        }
        return models.GuardianSoftwarePrefs.findAll({
          where: {
            guardian_id: dbGuardian.id,
            ...req.query.prefs && req.query.prefs.length ? { pref_key: req.query.prefs } : {}
          }
        }).then((data) => {
          return data.reduce((acc, cur) => {
            acc[cur.pref_key] = cur.pref_value
            return acc
          }, {})
        })
      })
      .then((data) => {
        res.status(200).json(data)
      })
      .catch(sequelize.EmptyResultError, function (err) {
        httpError(req, res, 404, null, err.message)
      })
      .catch(function (err) {
        httpError(req, res, 500, err, 'Failed to get guardian software preferences')
      })
  })

// get the latest released version of the guardian software
// (primarily for guardians who are checking for updates)
router.route('/:guardian_id/software/:software_role')
  .get(passport.authenticate('token', { session: false }), function (req, res) {
    const softwareRole = req.params.software_role

    const inquiringGuardianBattery = parseInt(req.query.battery)
    const inquiringGuardianTimeStamp = new Date(parseInt(req.query.timestamp))

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
        const dbQuery = {
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
