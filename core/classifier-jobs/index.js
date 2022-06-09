const router = require('express').Router()

router.get('/', require('./list'))
router.get('/queue', require('./queue'))
router.post('/', require('./create'))

module.exports = router
