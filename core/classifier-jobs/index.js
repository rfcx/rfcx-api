const router = require('express').Router()

router.get('/', require('./list'))
router.get('/:id', require('./get'))
router.get('/:id/summary', require('./summary'))
router.get('/:id/summary/:value', require('./summary-classification'))
router.post('/', require('./create'))
router.patch('/:id', require('./update'))
router.get('/:id/validation', require('./validation'))

module.exports = router
