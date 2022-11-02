const express = require('express')
const router = express.Router()
const passport = require('passport')
const hasRole = require('../../../common/middleware/authorization/authorization').hasRole
const models = require('../../_models')

router.route('/')
  .get(passport.authenticate(['token', 'jwt'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    const userGuid = req.rfcx.auth_token_info.guid
    if (userGuid !== '7f17c350-8ab7-b667-cfe2-9d69facda55b') { // return only for anonymous-assistant@rfcx.org which is used in Streaming app
      res.json([])
    } else {
      const siteIds = [ // ids copies from deleted UserSiteRelations table
        3, 6, 8, 13, 23, 26, 28, 30, 31, 32, 35, 38, 39, 40, 41, 43, 44,
        45, 47, 48, 49, 50, 51, 53, 54, 55, 56, 57, 60, 62, 63, 64, 65]
      models.Guardian.findAll({
        attributes: ['guid', 'is_visible', 'last_check_in', 'shortname', 'latitude', 'longitude'],
        include: [{
          model: models.GuardianSite,
          as: 'Site',
          where: { id: siteIds },
          attributes: ['guid', 'name']
        }],
        order: [['last_check_in', 'DESC']],
        limit: req.query.limit ? parseInt(req.query.limit) : req.rfcx.limit,
        offset: req.query.offset ? parseInt(req.query.offset) : req.rfcx.offset
      }).then((guardians) => {
        guardians = guardians.map((g) => {
          return {
            guid: g.guid,
            shortname: g.shortname,
            is_visible: g.is_visible,
            location: {
              latitude: g.latitude,
              longitude: g.longitude
            },
            checkins: {
              guardian: {
                last_checkin_at: g.last_check_in
              }
            },
            site: g.Site
          }
        })
        res.json(guardians)
      }).catch(function (err) {
        console.log(err)
        if (err) { res.status(500).json({ msg: 'failed to return guardians' }) }
      })
    }
  })

module.exports = router
