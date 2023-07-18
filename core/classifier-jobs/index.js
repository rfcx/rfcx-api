const router = require('express').Router()

router.get('/', require('./list'))
router.get('/:id', require('./get'))
router.post('/', require('./create'))
router.patch('/:id', require('./update'))

module.exports = router
