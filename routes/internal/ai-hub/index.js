const router = require('express').Router()

router.get('/reviews', require('./get'))

module.exports = router
