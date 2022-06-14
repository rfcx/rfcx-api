const Converter = require('../../../common/converter')
const ArrayConverter = require('../../../common/converter/array')
const { httpErrorHandler } = require('../../../common/error-handling/http')
const { createResults } = require('./dao/create-results')

/**
 * @swagger
 *
 * /internal/classifier-jobs/{id}/results:
 *   post:
 *     summary: Create detections and update job progress
 *     tags:
 *       - classifier-jobs
 *       - detections
 *     parameters:
 *       - name: id
 *         description: Classifier Job identifier
 *         in: path
 *         required: true
 *         type: string
 *     requestBody:
 *       description: An incremental result object containing detections & number of minutes that were processed
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/ClassifierResult'
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Invalid query parameters
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Job not found
 */
module.exports = (req, res) => {
  // Check authorization
  if (!req.rfcx.auth_token_info.has_system_role && !req.rfcx.auth_token_info.is_super) {
    console.warn(`WARN: ${req.method} ${req.path} Forbidden`)
    return res.sendStatus(403)
  }

  // Validate params
  const jobId = req.params.id

  const converter1 = new Converter(req.body, {}, true)
  converter1.convert('analyzedMinutes').toInt()

  const converter2 = new ArrayConverter(req.body.detections)
  converter2.convert('streamId').toString()
  converter2.convert('classifier').toString()
  converter2.convert('classification').toString()
  converter2.convert('start').toMomentUtc()
  converter2.convert('end').toMomentUtc()
  converter2.convert('confidence').toFloat()

  // Call DAO & return
  return Promise.all([converter1.validate(), converter2.validate()])
    .then(async ([paramsAnalyzedMinutes, paramsDetections]) => {
      const params = { ...paramsAnalyzedMinutes, detections: paramsDetections }
      await createResults(jobId, params)
      return res.sendStatus(201)
    })
    .catch(httpErrorHandler(req, res, 'Failed updating classifier job'))
}
