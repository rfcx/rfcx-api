const router = require("express").Router()
const models = require("../../../models")
const { httpErrorHandler } = require("../../../utils/http-error-handler.js")
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')
const streamsService = require('../../../services/streams/streams-service')
const annotationsService = require('../../../services/annotations')
const Converter = require("../../../utils/converter/converter")

router.get("/:streamId/annotations", authenticatedWithRoles('rfcxUser'), function (req, res) {
  const streamId = req.params.streamId
  const convertedParams = {}
  const params = new Converter(req.query, convertedParams)
  params.convert('start').toMoment()
  params.convert('end').toMoment()
  params.convert('classification').optional().toInt()

  return params.validate()
    .then(() => {
      return streamsService.getStreamByGuid(streamId)
    })
    .then((stream) => {
      streamsService.checkUserAccessToStream(req, stream)
      const { start, end, classification } = convertedParams
      return annotationsService.get(start, end, streamId, classification)
    })
    .then((annotations) => res.json(annotations))
    .catch(httpErrorHandler(req, res, 'Failed getting annotations'))
})

module.exports = router
