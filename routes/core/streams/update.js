const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const streamsService = require('../../../services/streams')
const Converter = require('../../../utils/converter/converter')
const arbimonService = require('../../../services/arbimon')
const models = require('../../../modelsTimescale')

/**
 * @swagger
 *
 * /streams/{id}:
 *   patch:
 *     summary: Update a stream
 *     tags:
 *       - streams
 *     parameters:
 *       - name: id
 *         description: Stream id
 *         in: path
 *         required: true
 *         type: string
 *     requestBody:
 *       description: Stream object attributes
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/requestBodies/StreamPatch'
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/StreamPatch'
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Stream'
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Stream not found
 */
module.exports = (req, res) => {
  const user = req.rfcx.auth_token_info
  const updatableBy = user.is_super || user.has_system_role ? undefined : user.id
  const id = req.params.id
  const options = { updatableBy }

  const converter = new Converter(req.body, {})
  converter.convert('name').optional().toString()
  converter.convert('description').optional().toString()
  converter.convert('is_public').optional().toBoolean()
  converter.convert('latitude').optional().toFloat().minimum(-90).maximum(90)
  converter.convert('longitude').optional().toFloat().minimum(-180).maximum(180)
  converter.convert('altitude').optional().toFloat()

  let transaction
  converter.validate()
    .then(async (params) => {
      transaction = await models.sequelize.transaction()
      options.transaction = transaction

      return await streamsService.update(id, params, options)
    })
    .then(async () => {
      // TODO move - route handler should not contain business logic
      if (arbimonService.isEnabled && req.headers.source !== 'arbimon') {
        try {
          const updatedStream = await streamsService.get(id, { transaction: transaction })
          const idToken = req.headers.authorization
          return await arbimonService.updateSite(updatedStream, idToken)
        } catch (err) {
          console.error('Failed updating stream in Arbimon', err)
          await transaction.rollback()
          throw err
        }
      }
      return undefined
    })
    .then(async () => {
      await transaction.commit()
      res.sendStatus(204)
    })
    .catch(httpErrorHandler(req, res, 'Failed updating stream'))
}
