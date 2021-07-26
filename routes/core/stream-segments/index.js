const router = require('express').Router()

router.get('/:id/stream-segments', require('./list'))

module.exports = router
