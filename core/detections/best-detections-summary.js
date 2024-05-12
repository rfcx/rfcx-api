const Converter = require('../../common/converter')
const { httpErrorHandler } = require('../../common/error-handling/http')
const router = require('express').Router()
const dao = require('./dao')

router.get('/:jobId/best-detections/summary', (req, res) => {
  const user = req.rfcx.auth_token_info

  const { jobId } = req.params
  const converter = new Converter(req.query, {}, true)
  converter.convert('streams').optional().toArray()
  converter.convert('by_date').default(false).toBoolean()
  converter.convert('start').optional().toMomentUtc()
  converter.convert('end').optional().toMomentUtc()
  converter.convert('review_statuses').optional().toArray()
  converter.convert('n_per_stream').default(1).toInt().maximum(10)

  return converter.validate().then(async (filters) => {
    filters.classifierJobId = jobId
    const options = { user }

    const response = await dao.queryBestDetectionsSummary(filters, options)
    return res.json(response)
  }).catch(httpErrorHandler(req, res, 'Failed getting best detections summary'))
})

module.exports = router
