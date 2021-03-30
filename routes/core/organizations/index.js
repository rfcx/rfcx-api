const router = require('express').Router()

router.post('/', require('./create'))
router.get('/', require('./list'))
router.get('/:id', require('./get'))
router.patch('/:id', require('./update'))
router.delete('/:id', require('./remove'))

module.exports = router
