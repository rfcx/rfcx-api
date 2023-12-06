const router = require('express').Router()
const { authenticatedWithRoles } = require('../../common/middleware/authorization/authorization')

router.post('/', authenticatedWithRoles('systemUser'), require('./create'))
router.patch('/:email', require('./update'))

module.exports = router
