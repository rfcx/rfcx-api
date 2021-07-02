const router = require('express').Router()
const ensureUserSynced = require('../../../middleware/legacy/ensure-user-synced')

router.post('/', ensureUserSynced, require('./create'))
router.get('/', require('./list'))
router.post('/sync', require('./create2'))
router.get('/:id', require('./get'))
// router.patch('/:id', ensureUserSynced, require('./update'))
router.patch('/:id', require('./update'))
router.delete('/:id', ensureUserSynced, require('./remove'))

module.exports = router
