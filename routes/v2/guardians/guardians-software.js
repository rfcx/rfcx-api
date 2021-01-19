var models = require('../../../models')
var express = require('express')
var router = express.Router()
var passport = require('passport')
var httpError = require('../../../utils/http-errors.js')
passport.use(require('../../../middleware/passport-token').TokenStrategy)
var sequelize = require('sequelize')

// get the latest released version of the guardian software
// (primarily for guardians who are checking for updates)
router.route('/:guardian_id/software/:software_role')
  .get(passport.authenticate('token', { session: false }), function (req, res) {
    var softwareRole = req.params.software_role

    var inquiringGuardianBattery = parseInt(req.query.battery)
    //    var inquiringGuardianTimeStamp = new Date(parseInt(req.query.timestamp))

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
        var dbQuery = {
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
        httpError(req, res, 404, null, err.message)
      })
      .catch(function (err) {
        httpError(req, res, 500, err, 'Failed to get latest software versions')
      })
  })

module.exports = router

function viewSoftwareJson (dbSoftware) {
  if (!Array.isArray(dbSoftware)) { dbSoftware = [dbSoftware] }

  var jsonArray = []

  for (const i in dbSoftware) {
    var dbRow = dbSoftware[i]

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
