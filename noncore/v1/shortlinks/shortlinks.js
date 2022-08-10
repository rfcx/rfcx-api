const models = require('../../_models')
const express = require('express')
const router = express.Router()
const passport = require('passport')
passport.use(require('../../../common/middleware/passport-token').TokenStrategy)

router.route('/:shortlink_id')
  .get(function (req, res) {
    let linkId = req.params.shortlink_id; const linkDelim = linkId.indexOf('+')
    const linkPre = (linkDelim > 0) ? linkId.substr(0, linkDelim) : null
    linkId = (linkDelim > 0) ? linkId.substr(1 + linkDelim) : linkId

    if (linkPre === 'ap') {
      res.redirect(301, 'https://adopt-protect.rfcx.org/#/a/' + linkId.toLowerCase())
    } else if (linkPre === 'bt') {
      res.redirect(301, 'https://bit.ly/' + linkId)
    } else {
      models.ShortLink
        .findOne({
          where: { guid: linkId },
          include: [{ all: true }]
        }).then(function (dbShortLink) {
          dbShortLink.access_count = 1 + dbShortLink.access_count
          dbShortLink.save()
          res.redirect(301, dbShortLink.url)
        }).catch(function () {
          res.sendStatus(404)
        })
    }
  })

router.route('/')
  .get(function (req, res) {
    res.redirect(301, 'https://rfcx.org/')
  })

module.exports = router
