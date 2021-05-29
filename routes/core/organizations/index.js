const router = require('express').Router()
const { authenticate } = require('../../../middleware/authorization/authorization')

router.use(authenticate())

router.post('/', require('./create'))
router.get('/', require('./list'))
router.get('/:id', require('./get'))
router.patch('/:id', require('./update'))
router.delete('/:id', require('./remove'))

module.exports = router
