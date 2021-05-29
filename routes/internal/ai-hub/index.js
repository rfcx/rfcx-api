const router = require('express').Router()
const { authenticate } = require('../../../middleware/authorization/authorization')

router.get('/detections', authenticate(), require('./get'))

module.exports = router
