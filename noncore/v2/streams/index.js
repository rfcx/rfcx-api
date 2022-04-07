const router = require('express').Router()
const { getGuardianInfoByStreamId } = require('../../_services/guardians/guardians-service')
const { httpErrorHandler } = require('../../../common/error-handling/http')

router.get('/:id', (req, res) => {
  const streamId = req.params.id
  getGuardianInfoByStreamId(streamId)
    .then(data => res.json(data))
    .catch(httpErrorHandler(req, res, 'Not found'))
})

module.exports = router
