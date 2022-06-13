const router = require('express').Router()

router.get('/', require('./list'))
router.post('/', require('./create'))

module.exports = router
