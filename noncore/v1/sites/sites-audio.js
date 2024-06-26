const models = require('../../_models')
const express = require('express')
const router = express.Router()
const views = require('../../views/v1')
const { httpErrorResponse } = require('../../../common/error-handling/http')
const passport = require('passport')
passport.use(require('../../../common/middleware/passport-token').TokenStrategy)

router.route('/:site_id/audio')
  .get(passport.authenticate('token', { session: false }), function (req, res) {
    return models.GuardianSite
      .findOne({
        where: { guid: req.params.site_id }
      }).then(function (dbSite) {
        const dbQuery = { site_id: dbSite.id }
        const dateClmn = 'measured_at'
        if ((req.rfcx.ending_before != null) || (req.rfcx.starting_after != null)) { dbQuery[dateClmn] = {} }
        if (req.rfcx.ending_before != null) { dbQuery[dateClmn][models.Sequelize.Op.lt] = req.rfcx.ending_before }
        if (req.rfcx.starting_after != null) { dbQuery[dateClmn][models.Sequelize.Op.gt] = req.rfcx.starting_after }

        return models.GuardianAudio
          .findAll({
            where: dbQuery,
            order: [[dateClmn, 'DESC']],
            limit: req.rfcx.limit,
            offset: req.rfcx.offset
          }).then(function (dbAudio) {
            if (dbAudio.length < 1) {
              httpErrorResponse(req, res, 404, 'database')
            } else {
              views.models.guardianAudioJson(dbAudio)
                .then(function (json) { res.status(200).json(json) })
            }

            return null
          }).catch(function (err) {
            console.error('failed to return audio | ' + err)
            if (err) { res.status(500).json({ msg: 'failed to return audio' }) }
          })
      }).catch(function (err) {
        console.error('failed to return site | ' + err)
        if (err) { res.status(500).json({ msg: 'failed to return site' }) }
      })
  })

module.exports = router
