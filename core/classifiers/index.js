const router = require('express').Router()

router.get('/:id', require('./get'))
router.get('/', require('./list'))
router.post('/', require('./create'))
router.patch('/:id', require('./update'))
router.get('/:id/file', require('./download'))

module.exports = router
