const models = require('../../_models')
const express = require('express')
const router = express.Router()
const views = require('../../views/v1')
const passport = require('passport')
passport.use(require('../../../common/middleware/passport-token').TokenStrategy)

router.route('/:guardian_id/screenshots')
  .get(passport.authenticate(['token', 'jwt'], { session: false }), function (req, res) {
    models.Guardian
      .findOne({
        where: { guid: req.params.guardian_id }
      }).then(function (dbGuardian) {
        const dbQuery = { guardian_id: dbGuardian.id }
        const dateClmn = 'captured_at'
        if ((req.rfcx.ending_before != null) || (req.rfcx.starting_after != null)) { dbQuery[dateClmn] = {} }
        if (req.rfcx.ending_before != null) { dbQuery[dateClmn][models.Sequelize.Op.lt] = req.rfcx.ending_before }
        if (req.rfcx.starting_after != null) { dbQuery[dateClmn][models.Sequelize.Op.gt] = req.rfcx.starting_after }
        const dbQueryOrder = (req.rfcx.order != null) ? req.rfcx.order : 'DESC'

        return models.GuardianMetaScreenShot
          .findAll({
            where: dbQuery,
            include: [{ all: true }],
            order: [[dateClmn, dbQueryOrder]],
            limit: req.rfcx.limit,
            offset: req.rfcx.offset
          }).then(function (dbScreenshots) {
            res.status(200).json(views.models.guardianMetaScreenshots(req, res, dbScreenshots))
            return null
          }).catch(function (err) {
            console.error('failed to return screenshots | ' + err)
            if (err) { res.status(500).json({ msg: 'failed to return screenshots' }) }
          })
      }).catch(function (err) {
        console.error('failed to find guardian | ' + err)
        if (err) { res.status(500).json({ msg: 'failed to find guardian' }) }
      })
  })

module.exports = router
