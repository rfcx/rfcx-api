const models = require('../../_models')
const express = require('express')
const router = express.Router()
const passport = require('passport')
const { httpErrorResponse } = require('../../../common/error-handling/http')
passport.use(require('../../../common/middleware/passport-token').TokenStrategy)
const sequelize = require('sequelize')

// get the latest released version of the guardian software
// (not just for guardians but other platform like Companion that need to download latest softwares)
router.route('/software/:software_role')
  .get(passport.authenticate(['token', 'jwt'], { session: false }), function (req, res) {
    const softwareRole = req.params.software_role

    const dbQuery = {
      is_available: true
    }
    if (softwareRole === 'all') {
      dbQuery.is_updatable = true
    } else {
      dbQuery.role = softwareRole
    }
    return models.GuardianSoftware.findAll({
      where: dbQuery,
      include: [{ all: true }],
      order: [['current_version_id', 'ASC']]
    })
      .then(function (dSoftware) {
        res.status(200).json(viewSoftwareJson(dSoftware))
      })
      .catch(sequelize.EmptyResultError, function (err) {
        httpErrorResponse(req, res, 404, null, err.message)
      })
      .catch(function (err) {
        httpErrorResponse(req, res, 500, err, 'Failed to get latest software versions')
      })
  })

// get the latest released version of the guardian software
// (primarily for guardians who are checking for updates)
router.route('/:guardian_id/software/:software_role')
  .get(passport.authenticate(['token', 'jwt'], { session: false }), function (req, res) {
    const softwareRole = req.params.software_role

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
        return dbGuardian
      })
      .then(function (dbGuardian) {
        const dbQuery = {
          is_available: true
        }
        if (softwareRole === 'all') {
          dbQuery.is_updatable = true
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
          (this.dbGuardian.is_updatable) ? viewSoftwareJson(dSoftware) : []
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

function viewSoftwareJson (dbSoftware) {
  if (!Array.isArray(dbSoftware)) { dbSoftware = [dbSoftware] }

  const jsonArray = []

  for (const i in dbSoftware) {
    const dbRow = dbSoftware[i]

    if (dbRow.CurrentVersion != null) {
      jsonArray.push({
        role: dbRow.role,
        version: dbRow.CurrentVersion.version,
        released: dbRow.CurrentVersion.release_date.toISOString(),
        sha1: dbRow.CurrentVersion.sha1_checksum,
        size: dbRow.CurrentVersion.size,
        url: dbRow.CurrentVersion.url
      })
    }
  }
  return jsonArray
}
