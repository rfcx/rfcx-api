const router = require('express').Router()

router.get('/:id/segments', require('./list'))
router.get('/:id/segments/:start', require('./get'))

module.exports = router
