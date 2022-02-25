const router = require('express').Router()
const { getDeploymentMeta } = require('../../_services/guardians/guardian-meta-service')
const { httpErrorHandler } = require('../../../common/error-handling/http')

router.get('/:id', (req, res) => {
  const streamId = req.params.id
  getDeploymentMeta(streamId)
    .then(data => res.json(data))
    .catch(httpErrorHandler(req, res, 'Not found'))
})

module.exports = router
