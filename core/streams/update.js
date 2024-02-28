const { httpErrorHandler } = require('../../common/error-handling/http')
const dao = require('./dao')
const Converter = require('../../common/converter')
const arbimonService = require('../_services/arbimon')

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
  converter.convert('hidden').optional().toBoolean()

  converter.validate()
    .then((params) => {
      if (params.latitude === 0) {
        params.latitude = null
      }

      if (params.longitude === 0) {
        params.longitude = null
      }
      return dao.update(id, params, options)
    })
    .then(async () => {
      // TODO move - route handler should not contain business logic
      if (arbimonService.isEnabled && req.headers.source !== 'arbimon') {
        try {
          const updatedStream = await dao.get(id)
          const idToken = req.headers.authorization
          return await arbimonService.updateSite(updatedStream, idToken)
        } catch (err) {
          console.error('Failed updating stream in Arbimon', err)
        }
      }
      return undefined
    })
    .then(() => res.sendStatus(204))
    .catch(httpErrorHandler(req, res, 'Failed updating stream'))
}
