const router = require('express').Router()

router.get('/', require('./list'))
router.post('/', require('./create'))
router.patch('/:id', require('./update'))

module.exports = router
