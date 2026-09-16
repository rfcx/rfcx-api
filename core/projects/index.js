const router = require('express').Router()

router.post('/', require('./create'))
router.get('/', require('./list'))
router.get('/:id', require('./get'))
router.patch('/:id', require('./update'))
router.delete('/:id', require('./remove'))
// Compensation counterpart of the delete above (§330 item (6)): the bio-api-owned
// delete chain restores this plane when a later leg fails. DAO `restore` already
// existed unexposed; this is only the route.
router.post('/:id/restore', require('./restore'))

module.exports = router
