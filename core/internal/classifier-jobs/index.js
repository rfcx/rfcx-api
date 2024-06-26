const router = require('express').Router()

router.get('/count', require('./count'))
router.post('/dequeue', require('./dequeue'))
router.post('/:id/results', require('./post-results'))

module.exports = router
