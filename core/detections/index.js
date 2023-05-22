const router = require('express').Router()

router.get('/', require('./list'))

module.exports = router
