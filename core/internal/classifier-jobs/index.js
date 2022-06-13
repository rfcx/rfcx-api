const router = require('express').Router()

router.get('/count', require('./count'))

module.exports = router
