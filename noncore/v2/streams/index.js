const router = require('express').Router()
const { getGuardianInfoByStreamId } = require('../../../services/guardians/guardians-service')
const { httpErrorHandler } = require('../../../utils/http-error-handler')

router.get('/:id', (req, res) => {
  const streamId = req.params.id
  getGuardianInfoByStreamId(streamId)
    .then(data => res.json(data))
    .catch(httpErrorHandler(req, res, 'Not found'))
})

module.exports = router
