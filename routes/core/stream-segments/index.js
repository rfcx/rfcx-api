const router = require('express').Router()

router.get('/:id/segments', require('./list'))
router.get('/:id/segments/:start', require('./get'))
router.get('/:id/segments/:start/file', require('./file'))

module.exports = router
