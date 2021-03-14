const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const streamsService = require('../../../services/streams')
const streamAssetsService = require('../../../services/streams/assets')
const Converter = require('../../../utils/converter/converter')

/**
 * @swagger
 *
 * /streams/{id}/assets:
 *   post:
 *     summary: Create a stream asset
 *     tags:
 *       - streams
 *     requestBody:
 *       description: Asset object
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/requestBodies/StreamAsset'
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/StreamAsset'
 *     responses:
 *       201:
 *         description: Created
 *         headers:
 *           Location:
 *             description: Path of the created resource (e.g. `/streams/xyz123/assets/456abc`)
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid request body
 *       403:
 *         description: Forbidden
 */

router.post('/:streamId/assets', function (req, res) {
  const streamId = req.params.streamId
  const userId = req.rfcx.auth_token_info.id
  const converter = new Converter(req.body, {})
  converter.convert('type').toString()
  converter.convert('url').toString()

  return converter.validate()
    .then(params => {
      const { type, url } = params
      return streamAssetsService.create({ streamId, type, url, createdById: userId }, { creatableBy: userId })
    })
    .then(asset => res.location(`/streams/${streamId}/assets/${asset.id}`).sendStatus(201))
    .catch(httpErrorHandler(req, res, 'Failed creating stream asset'))
})

/**
 * @swagger
 *
 * /streams/{id}/assets:
 *   get:
 *     summary: Get list of assets belonging to a stream
 *     tags:
 *       - streams
 *     parameters:
 *       - name: id
 *         description: Stream identifier
 *         in: path
 *         required: true
 *         type: string
 *       - name: type
 *         description: Filter by type of asset
 *         in: query
 *         type: string
 *       - name: fields
 *         description: Include specific fields
 *         in: query
 *         type: string[]
 *     responses:
 *       200:
 *         description: List of assets
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/StreamAsset'
 *       400:
 *         description: Invalid query parameters
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Stream not found
 */
router.get('/:streamId/assets', function (req, res) {
  const streamId = req.params.streamId
  const userId = req.rfcx.auth_token_info.id
  const converter = new Converter(req.query, {})
  converter.convert('type').optional().toString()
  converter.convert('fields').optional().toArray()

  return streamsService.get(streamId)
    .then(() => converter.validate())
    .then(params => {
      const { type, fields } = params
      return streamAssetsService.query({ streamId, type }, { readableBy: userId, fields })
    })
    .then(assets => res.json(assets))
    .catch(httpErrorHandler(req, res, 'Failed getting stream assets'))
})

module.exports = router
