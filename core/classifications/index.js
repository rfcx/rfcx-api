const router = require('express').Router()
const { httpErrorHandler } = require('../../utils/http-error-handler')
const classificationService = require('../_services/classifications')
const Converter = require('../../utils/converter/converter')

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
router.get('/:value', function (req, res) {
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
 *       - name: classifiers
 *         description: Classifiers ids to filters classifications (giving '*' to get all).
 *         in: query
 *         type: array
 *         items:
 *           type: number
 *           example: 1
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
router.get('/', function (req, res) {
  const converter = new Converter(req.query, {}, true)

  converter.convert('keyword').optional().toString()
  converter.convert('levels').optional().toArray()
  converter.convert('classifiers').optional().toArray()
  converter.convert('limit').default(100).toInt()
  converter.convert('offset').default(0).toInt()

  converter.validate()
    .then((params) => {
      const { keyword, levels, classifiers, limit, offset } = params
      const allClassifiers = classifiers && classifiers.length === 1 && classifiers[0] === '*'
      return classificationService.queryByKeyword(keyword, levels, allClassifiers, classifiers, limit, offset)
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
router.get('/:value/characteristics', function (req, res) {
  return classificationService.queryByParent(req.params.value, 'characteristic')
    .then(data => res.json(data))
    .catch(httpErrorHandler(req, res, 'Failed getting characteristics'))
})

module.exports = router
