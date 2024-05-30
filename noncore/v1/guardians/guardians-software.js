const models = require('../../_models')
const express = require('express')
const router = express.Router()
const passport = require('passport')
const views = require('../../views/v1')
const { httpErrorResponse } = require('../../../common/error-handling/http')
passport.use(require('../../../common/middleware/passport-token').TokenStrategy)
const sequelize = require('sequelize')
const hasRole = require('../../../common/middleware/authorization/authorization').hasRole
const guardiansService = require('../../../noncore/_services/guardians/guardians-service')

router.route('/:guid/software')
  .get(passport.authenticate(['token', 'jwt'], { session: false }), hasRole(['rfcxUser']), (req, res) => {
    const query = `
      SELECT soft.role as role, ver.version as version, metaver.software_id
      FROM "GuardianMetaSoftwareVersions" AS metaver
      INNER JOIN (
        SELECT MAX(last_checkin_at) as last_checkin, software_id
        FROM "GuardianMetaSoftwareVersions"
        GROUP BY software_id
      ) metaver_recent ON metaver.software_id = metaver_recent.software_id
      INNER JOIN "GuardianSoftwareVersions" AS ver ON metaver.version_id = ver.id
      INNER JOIN "GuardianSoftware" AS soft ON soft.id = ver.software_role_id
      INNER JOIN "Guardians" AS g ON metaver.guardian_id = g.id
      WHERE g.guid = '${req.params.guid}';
    `

    models.sequelize.query(query, { type: models.sequelize.QueryTypes.SELECT })
      .then(async (versionData) => {
        if (!versionData.length) {
          httpErrorResponse(req, res, 404, null, 'Guardian or software versions not found.')
          return
        }
        const result = {}
        for (const item of versionData) {
          const lastVersionRow = await guardiansService.getGuardianLatestSoftwareVersion(item.software_id)
          result[item.role] = {
            version: item.version,
            latest_version: lastVersionRow.version
          }
        }
        return result
      })
      .then((versions) => {
        res.status(200).json(versions)
      })
      .catch(function (err) {
        httpErrorResponse(req, res, 500, err, 'Failed to get guardian software versions')
      })
  })

router.route('/:guid/software/preferences')
  .get(passport.authenticate(['token', 'jwt'], { session: false }), (req, res) => {
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
        httpErrorResponse(req, res, 404, null, err.message)
      })
      .catch(function (err) {
        httpErrorResponse(req, res, 500, err, 'Failed to get guardian software preferences')
      })
  })

// get the latest released version of the guardian software
// (primarily for guardians who are checking for updates)
router.route('/:guardian_id/software/:software_role')
  .get(passport.authenticate('token', { session: false }), function (req, res) {
    const softwareRole = req.params.software_role

    const inquiringGuardianBattery = parseInt(req.query.battery)
    const inquiringGuardianTimeStamp = new Date(parseInt(req.query.timestamp))

    models.Guardian.findOne({ where: { guid: req.params.guardian_id } })
      .then(async (guardian) => {
        if (!guardian) {
          console.error('Guardian with given guid not found', { req: req.guid })
          throw new sequelize.EmptyResultError('Guardian with given guid not found.')
        }
        const software = await models.GuardianSoftware.findOne({ where: { role: req.query.role } })
        if (!software) {
          console.error('Software with given guid not found', { req: req.guid })
          throw new sequelize.EmptyResultError('Software with given guid not found.')
        }
        const softwareVersion = await models.GuardianSoftwareVersion.findOne({ where: { software_role_id: software.id, version: req.query.version } })
        if (!softwareVersion) {
          console.error('SoftwareVersion with given guid not found', { req: req.guid })
          throw new sequelize.EmptyResultError('SoftwareVersion with given guid not found.')
        }
        await models.GuardianMetaUpdateCheckIn.create({
          guardian_id: guardian.id,
          version_id: softwareVersion.id,
          role_id: software.id
        })
        await models.GuardianMetaBattery.create({
          guardian_id: guardian.id,
          check_in_id: null,
          measured_at: inquiringGuardianTimeStamp,
          battery_percent: inquiringGuardianBattery,
          battery_temperature: null
        })
        await models.Guardian.update({ last_battery_internal: inquiringGuardianBattery || null }, { where: { id: guardian.id } })

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
        const result = await models.GuardianSoftware.findAll({
          where: dbQuery,
          include: [{ all: true }],
          order: [['current_version_id', 'ASC']]
        })
        res.status(200).json(
          (this.dbGuardian.is_updatable) ? views.models.guardianSoftware(req, res, result) : []
        )
      })
      .catch(sequelize.EmptyResultError, function (err) {
        httpErrorResponse(req, res, 404, null, err.message)
      })
      .catch(function (err) {
        httpErrorResponse(req, res, 500, err, 'Failed to get latest software versions')
      })
  })

module.exports = router
