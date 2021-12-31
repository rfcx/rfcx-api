const models = require('../../../models-legacy')
const express = require('express')
const router = express.Router()
const httpError = require('../../../utils/http-errors.js')
const Converter = require('../../../utils/converter/converter')
const hasRole = require('../../../middleware/authorization/authorization').hasRole
const generator = require('generate-password')
const redisEnabled = `${process.env.REDIS_ENABLED}` === 'true'
const redis = redisEnabled ? require('../../../utils/redis') : {}
const ValidationError = require('../../../utils/converter/validation-error')
const passport = require('passport')
passport.use(require('../../../middleware/passport-token').TokenStrategy)

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

          console.log("redirecting client to: '" + dbShortLink.url + "'")
          res.redirect(301, dbShortLink.url)
        }).catch(function () {
          res.status(200).json({ shortlink: req.params.shortlink_id })
        })
    }
  })

// This route is used to share long page urls converted into something like https://rf.cx/s/esyA7ho
router.route('/s/:hash')
  .get(function (req, res) {
    if (!redisEnabled) {
      console.error('Someone is trying to open hashed shortlink while Redis is disabled')
      httpError(req, res, 501, null, 'This functionality is not available in the API.')
      return
    }
    const hash = req.params.hash
    redis.getAsync(hash)
      .then((url) => {
        if (!url) {
          return httpError(req, res, 404, null, 'Short link not found.')
        }
        res.redirect(301, url)
      })
      .catch(e => { httpError(req, res, 500, e, 'Error while getting the short link.'); console.log(e) })
  })

router.route('/')
  .get(function (req, res) {
    res.redirect(301, 'https://rfcx.org/')
  })

// This route is used in the Dashboard to share long page urls. Also could be used manually by team members to create short urls like https://rf.cx/s/esyA7ho
router.route('/')
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    if (!redisEnabled) {
      console.error('Someone is trying to open hashed shortlink while Redis is disabled')
      httpError(req, res, 501, null, 'This functionality is not available in the API.')
      return
    }
    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)

    params.convert('url').toString()
    params.convert('type').optional().toString().default('temp') // temp or const
    params.convert('expires').optional().toInt().default(86400000) // 24 hours in ms

    params.validate()
      .then(() => {
        if (transformedParams.type === 'const') {
          return models.ShortLink.find({
            where: { url: transformedParams.url },
            include: [{ all: true }]
          })
        } else {
          return null
        }
      })
      .then((dbShortLink) => {
        if (dbShortLink) {
          return dbShortLink.guid
        }
        const hash = generator.generate({
          length: 7,
          numbers: true,
          symbols: false,
          uppercase: true,
          excludeSimilarCharacters: false
        })
        hash.toUpperCase()
        if (transformedParams.type === 'const') {
          return models.ShortLink.create({
            guid: hash,
            url: transformedParams.url,
            access_count: 0
          })
            .then((dbShortLink) => {
              return dbShortLink.guid
            })
        } else {
          return redis.getAsync(hash)
            .then((url) => {
              if (!url) {
                redis.set(hash, transformedParams.url, 'PX', transformedParams.expires)
                return hash
              }
              throw new Error('Error while creating the short link.')
            })
        }
      })
      .then(function (hash) {
        const url = `${process.env.REST_PROTOCOL}://${process.env.REST_HOST_SHORT}${(transformedParams.type !== 'const')
         ? '/s'
: ''}/${hash}`
        res.status(200).send(url)
      })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { httpError(req, res, 500, e, 'Error while creating the short link.'); console.log(e) })
  })

module.exports = router
