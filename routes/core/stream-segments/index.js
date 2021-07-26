const router = require('express').Router()

router.get('/:id/segments', require('./list'))

module.exports = router
