const router = require('express').Router()

router.get('/count', require('./count'))
router.post('/dequeue', require('./dequeue'))
router.get('/awaiting-cancellation', require('./cancel'))
router.post('/:id/results', require('./post-results'))

module.exports = router
