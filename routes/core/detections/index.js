const router = require('express').Router()

router.get('/', require('./list'))
router.get('/:id/:start', require('./get'))
router.post('/:id/:start/review', require('./review'))

module.exports = router
