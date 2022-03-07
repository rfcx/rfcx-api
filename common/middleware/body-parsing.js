const bodyParser = require('body-parser')
const multer = require('multer')

const urlEncoded = bodyParser.urlencoded({ extended: false })
const json = bodyParser.json({ limit: '5mb' })
const multipartFile = multer({ dest: process.env.CACHE_DIRECTORY + 'uploads/' })

module.exports = { urlEncoded, json, multipartFile }
