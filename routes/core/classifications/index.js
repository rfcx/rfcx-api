const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')
const classificationService = require('../../../services/classification/classification-service')
const Converter = require('../../../utils/converter/converter')

/**
 * @swagger
 *
 * /classifications/{value}:
 *   get:
 *     summary: Get a classfication
 *     tags:
 *       - classfications
 *     parameters:
 *       - name: value
 *         description: Classification identifier
 *         in: path
 *         type: string
 *         example: gibbon
 *     responses:
 *       200:
 *         description: A classification
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Classification'
 *       404:
 *         description: Not found
 */
router.get('/:value', authenticatedWithRoles('rfcxUser'), function (req, res) {
  return classificationService.get(req.params.value)
    .then(data => res.json(data))
    .catch(httpErrorHandler(req, res, 'Failed getting classification'))
})

/**
 * @swagger
 *
 * /classifications:
 *   get:
 *     summary: Get list of classifications matching search criteria
 *     tags:
 *       - classfications
 *     parameters:
 *       - name: keyword
 *         description: Match classifications with title or alternative name (if keyword matches an alternative name then it will be included in the response)
 *         in: query
 *         type: string
 *         example: owl
 *       - name: levels
 *         description: Limit the results to classifications from specific levels in the hierarchy (meaning, different classification types)
 *         in: query
 *         type: array
 *         items:
 *           type: string
 *           example: species
 *       - name: limit
 *         description: Maximum number of results to return
 *         in: query
 *         type: int
 *         default: 100
 *       - name: offset
 *         description: Number of results to skip
 *         in: query
 *         type: int
 *         default: 0
 *     responses:
 *       200:
 *         description: List of classification objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ClassificationLite'
 *       400:
 *         description: Invalid query parameters
 */
router.get('/', authenticatedWithRoles('rfcxUser'), function (req, res) {
  const transformedParams = {}
  const params = new Converter(req.query, transformedParams)

  params.convert('keyword').optional().toString()
  params.convert('levels').optional().toArray()
  params.convert('limit').default(100).toInt()
  params.convert('offset').default(0).toInt()

  params.validate()
    .then(() => {
      const { keyword, levels, limit, offset } = transformedParams
      return classificationService.queryByKeyword(keyword, levels, limit, offset)
    })
    .then(data => res.json(data))
    .catch(httpErrorHandler(req, res, 'Failed searching for classifications'))
})

/**
 * @swagger
 *
 * /classifications/{value}/characteristics:
 *   get:
 *     summary: Get the characteristics belonging to a classification
 *     tags:
 *       - classfications
 *     parameters:
 *       - name: value
 *         description: Classification identifier
 *         in: path
 *         type: string
 *         example: attenuata
 *     responses:
 *       200:
 *         description: List of classification objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ClassificationLite'
 *       400:
 *         description: Invalid query parameters
 */
router.get('/:value/characteristics', authenticatedWithRoles('rfcxUser'), function (req, res) {
  return classificationService.queryByParent(req.params.value, 'characteristic')
    .then(data => res.json(data))
    .catch(httpErrorHandler(req, res, 'Failed getting characteristics'))
})

module.exports = router
