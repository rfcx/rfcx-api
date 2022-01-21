const models = require('../../_models')
const express = require('express')
const router = express.Router()
const passport = require('passport')
passport.use(require('../../../common/middleware/passport-token').TokenStrategy)

router.route('/:guardian_id/audio/uploads')
  .post(passport.authenticate('token', { session: false }), function (req, res) {
    models.Guardian
      .findOne({
        where: { guid: req.params.guardian_id }
      }).then(function (dbGuardian) {
        const uploadInfo = {
          measured_at: (req.body.measured_at != null) ? new Date(req.body.measured_at) : null,
          url: (req.body.url != null) ? req.body.url : null
        }

        models.GuardianAudioUpload
          .create({
            guardian_id: dbGuardian.id,
            measured_at: uploadInfo.measured_at,
            url: null // uploadInfo.url
          }).then(function (dbGuardianAudioUpload) {
            res.status(200).json({ measured_at: uploadInfo.measured_at, url: uploadInfo.url })
          }).catch(function (err) {
            console.log('failed to create audio upload | ' + err)
            res.status(500).json({ msg: 'failed to create audio upload' })
          })
      }).catch(function (err) {
        console.log('failed to find guardian | ' + err)
        if (err) { res.status(500).json({ msg: 'failed to find guardian' }) }
      })
  })

module.exports = router
