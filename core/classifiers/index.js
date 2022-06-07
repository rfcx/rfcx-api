const router = require('express').Router()

router.get('/', require('./index/index'))
router.get('/:id', require('./index/index'))
router.get('/', require('./index/index'))
router.patch('/:id', require('./index/index'))
router.get('/:id/file', require('./index/index'))
router.post('/jobs', require('./jobs/create'))

module.exports = router
