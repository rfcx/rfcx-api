const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')
const service = require('../../../services/classifiers')
const Converter = require('../../../utils/converter/converter')

/**
 * @swagger
 *
 * /classifiers/{id}:
 *   get:
 *     summary: Get a classifier (model)
 *     tags:
 *       - classifiers
 *     parameters:
 *       - name: id
 *         description: Classifier identifier
 *         in: path
 *         type: string
 *         example: gibbon
 *     responses:
 *       200:
 *         description: A classifier
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Classifier'
 *       404:
 *         description: Not found
 */
router.get('/:id', authenticatedWithRoles('appUser', 'rfcxUser'), function (req, res) {
  return service.get(req.params.id)
    .then(data => res.json(data))
    .catch(httpErrorHandler(req, res, 'Failed getting classifier'))
})

/**
 * @swagger
 *
 * /classifiers:
 *   get:
 *     summary: Get list of classifiers (models) matching search criteria
 *     tags:
 *       - classfiers
 *     parameters:
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
 *         description: List of classifier objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ClassifierLite'
 *       400:
 *         description: Invalid query parameters
 */
router.get('/', authenticatedWithRoles('appUser', 'rfcxUser'), function (req, res) {
  const transformedParams = {}
  const params = new Converter(req.query, transformedParams)
  params.convert('limit').default(100).toInt()
  params.convert('offset').default(0).toInt()

  params.validate()
    .then(() => {
      const { limit, offset } = transformedParams
      const attributes = { limit, offset }
      return service.query(attributes)
    })
    .then(data => res.json(data))
    .catch(httpErrorHandler(req, res, 'Failed searching for classifiers'))
})

module.exports = router
