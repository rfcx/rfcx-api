const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const classificationsService = require('../../../services/classifications')
const Converter = require('../../../utils/converter/converter')
const { hasStreamPermission } = require('../../../middleware/authorization/roles')

/**
 * @swagger
 *
 * /internal/explorer/streams/{id}/classifications:
 *   get:
 *     summary: Get a list of classifications for a stream, together with their characteristics
 *     description: This endpoint is used by the Explorer "classification list" component
 *     tags:
 *       - internal
 *     parameters:
 *       - name: id
 *         description: Stream identifier
 *         in: path
 *         required: true
 *         type: string
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
 *         description: List of classification with their characteristics
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $allOf:
 *                   - $ref: '#/components/schemas/ClassificationLite'
 *                   - type: object
 *                     properties:
 *                       children:
 *                         type: array
 *                         items:
 *                           $ref: '#/components/schemas/ClassificationLite'
 *               example:
 *                 - value: "obscurus"
 *                   title: "Trachypithecus obscurus"
 *                   image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Dusky_leaf_monkey_%288050982300%29.jpg/360px-Dusky_leaf_monkey_%288050982300%29.jpg"
 *                   type:
 *                     value: "species"
 *                   children:
 *                     - value: obscurus_laugh
 *                       title: Laugh
 *                     - value: obscurus_giggle
 *                       title: Giggle
 *       400:
 *         description: Invalid query parameters
 *       404:
 *         description: Stream not found
 */
router.get('/streams/:id/classifications', hasStreamPermission('R'), function (req, res) {
  const streamId = req.params.id
  const params = new Converter(req.query)
  params.convert('limit').default(100).toInt()
  params.convert('offset').default(0).toInt()
  return params.validate()
    .then(async validatedParams => {
      const { limit, offset } = validatedParams
      const classifications = await classificationsService.queryByStreamIncludeChildren(streamId, 'characteristic', limit, offset)
      return res.json(classifications)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting stream classifications'))
})

module.exports = router
