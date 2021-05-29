const ensureUserSynced = require('../../../middleware/legacy/ensure-user-synced')
const router = require('express').Router()
const { authenticate } = require('../../../middleware/authorization/authorization')

router.post('/', authenticate(), ensureUserSynced, require('./create'))
router.get('/', authenticate(), require('./list'))
router.get('/:id', authenticate(), require('./get'))
router.patch('/:id', authenticate(), require('./update'))
router.delete('/:id', authenticate(), require('./remove'))

module.exports = router
