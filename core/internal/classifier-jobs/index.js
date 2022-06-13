const router = require('express').Router()

router.get('/count', require('./count'))
router.post('/dequeue', require('./dequeue'))

module.exports = router
