const router = require('express').Router()

router.get('/', require('./list'))
router.get('/:id/:start', require('./get'))

module.exports = router
