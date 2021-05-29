const router = require('express').Router()
const ensureUserSynced = require('../../../middleware/legacy/ensure-user-synced')
const { authenticate } = require('../../../middleware/authorization/authorization')

router.post('/', authenticate(), ensureUserSynced, require('./create'))
router.get('/', authenticate(), require('./list'))
router.get('/:id', authenticate(), require('./get'))
router.patch('/:id', authenticate(), ensureUserSynced, require('./update'))
router.delete('/:id', authenticate(), ensureUserSynced, require('./remove'))

module.exports = router
