const bodyParser = require('body-parser')
const multer = require('multer')

const urlEncoded = bodyParser.urlencoded({ extended: false })
// `verify` stashes the raw request body on req.rawBody so downstream
// middleware (e.g. HMAC-signature webhook auth in core/webhooks/bucket-events/) can
// validate the bytes that were actually transmitted. Zero behavioural
// impact on routes that don't read req.rawBody.
const json = bodyParser.json({
  limit: '5mb',
  verify: (req, _res, buf) => { req.rawBody = buf }
})
const multipartFile = multer({ dest: process.env.CACHE_DIRECTORY + 'uploads/' })

module.exports = { urlEncoded, json, multipartFile }
