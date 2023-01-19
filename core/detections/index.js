// const router = require('express').Router()
// const { httpErrorHandler } = require('../../common/error-handling/http')
// const dao = require('./dao')
// const Converter = require('../../common/converter')

// /**
//  * @swagger
//  *
//  * /detections:
//  *   get:
//  *     summary: Get list of detections
//  *     description:
//  *     tags:
//  *       - detections
//  *     parameters:
//  *       - name: start
//  *         description: Limit to a start date on or after (iso8601 or epoch)
//  *         in: query
//  *         required: true
//  *         type: string
//  *         example: 2020-01-01T00:00:00.000Z
//  *       - name: end
//  *         description: Limit to a start date before (iso8601 or epoch)
//  *         in: query
//  *         required: true
//  *         type: string
//  *         example: 2020-12-31T00:00:00.000Z
//  *       - name: streams
//  *         description: List of stream ids to limit results
//  *         in: query
//  *         type: array|string
//  *       - name: classifications
//  *         description: List of classification values
//  *         in: query
//  *         type: array|string
//  *       - name: classifiers
//  *         description: List of classifier ids
//  *         in: query
//  *         type: array|string
//  *       - name: min_confidence
//  *         description: Return results above a minimum confidence
//  *         in: query
//  *         type: float
//  *         example: 0.95
//  *       - name: is_reviewed
//  *         description: Return reviewed/unreviewed detections
//  *         in: query
//  *         type: boolean
//  *         example: true
//  *       - name: is_positive
//  *         description: Return confirmed/rejected detections
//  *         in: query
//  *         type: boolean
//  *         example: true
//  *       - name: limit
//  *         description: Maximum number of results to return
//  *         in: query
//  *         type: int
//  *         default: 100
//  *       - name: offset
//  *         description: Number of results to skip
//  *         in: query
//  *         type: int
//  *         default: 0
//  *       - name: descending
//  *         description: Order the results in descending order (newest first)
//  *         in: query
//  *         type: boolean
//  *         default: false
//  *       - name: fields
//  *         description: Customize included fields and relations
//  *         in: query
//  *         type: array
//  *
//  *     responses:
//  *       200:
//  *         description: List of detection (lite) objects
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: array
//  *       400:
//  *         description: Invalid query parameters
//  */
// router.get('/', (req, res) => {
//   const user = req.rfcx.auth_token_info
//   const convertedParams = {}
//   const params = new Converter(req.query, convertedParams)
//   params.convert('start').toMomentUtc()
//   params.convert('end').toMomentUtc()
//   params.convert('streams').optional().toArray()
//   params.convert('classifications').optional().toArray()
//   params.convert('classifiers').optional().toArray()
//   params.convert('min_confidence').optional().toFloat()
//   params.convert('limit').optional().toInt().maximum(1000)
//   params.convert('offset').optional().toInt()
//   params.convert('descending').default(false).toBoolean()
//   params.convert('fields').optional().toArray()

//   return params.validate()
//     .then(async () => {
//       const streamIds = convertedParams.streams
//       const minConfidence = convertedParams.min_confidence
//       const { start, end, classifications, classifiers, descending, fields, limit, offset } = convertedParams
//       const result = await dao.query(start, end, streamIds, classifications, minConfidence, limit, offset, user, classifiers, descending, fields)
//       return res.json(result)
//     })
//     .catch(httpErrorHandler(req, res, 'Failed getting detections'))
// })

// module.exports = router

const router = require('express').Router()

router.get('/', require('./list'))
// router.get('/:id/:start', require('./get'))
// router.post('/:id/:start/review', require('./review'))

module.exports = router
