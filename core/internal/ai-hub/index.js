const router = require('express').Router()

router.get('/detections', require('./get'))

module.exports = router
