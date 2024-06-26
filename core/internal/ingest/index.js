const router = require('express').Router()
const { hasRole } = require('../../../common/middleware/authorization/authorization')

router.get('/streams/:id/stream-source-file', require('./get'))
router.post('/streams/:streamId/stream-source-file-and-segments', hasRole(['systemUser']), require('./post'))
router.delete('/streams/:streamId/stream-source-file-and-segments', hasRole(['systemUser']), require('./delete'))

module.exports = router
