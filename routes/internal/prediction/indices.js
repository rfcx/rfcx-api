const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')
const indicesService = require('../../../services/indices')
const indexValuesService = require('../../../services/indices/values')
const Converter = require('../../../utils/converter/converter')

/**
 * @swagger
 *
 * /internal/prediction/index-values:
 *   post:
 *     summary: Create a sequence of values for an index
 *     description: This endpoint is only accessible to the prediction service
 *     tags:
 *       - internal
 *     requestBody:
 *       description: A short form for a sequence of consequetive index values
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/IndexValuesCompact'
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Invalid query parameters
 *       404:
 *         description: Stream not found
 */
router.post('/index-values', authenticatedWithRoles('systemUser'), function (req, res) {
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('stream_id').toString()
  params.convert('time').toMomentUtc()
  params.convert('index').toString()
  params.convert('values').toFloatArray()
  params.convert('step').toFloat()

  return params.validate()
    .then(() => indicesService.getId(convertedParams.index))
    .then(indexId => {
      const streamId = convertedParams.stream_id
      const { time, values, step } = convertedParams
      const objects = values.map((value, i) => {
        // Values are spaced by "step" seconds
        const offsetTime = time.clone().add(i * step, 's')
        return { streamId, indexId, time: offsetTime, value }
      })
      indexValuesService.clearHeatmapCache(streamId, time.valueOf()) // it's async, but we don't need to wait for it
      return indexValuesService.create(objects)
    })
    .then(detections => res.sendStatus(201))
    .catch(httpErrorHandler(req, res, 'Failed creating detections'))
})

module.exports = router
