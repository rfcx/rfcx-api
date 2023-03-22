const { httpErrorHandler } = require('../../common/error-handling/http')
const dao = require('./dao')
const Converter = require('../../common/converter')
const { ValidationError, EmptyResultError } = require('../../common/error-handling/errors')

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
 *         type: number
 *         example: 2
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
module.exports = (req, res) => {
  const user = req.rfcx.auth_token_info
  const readableBy = user && (user.is_super || user.has_system_role) ? undefined : user.id

  const converter = new Converter(req.params, {}, true)
  converter.convert('id').toInt()
  return converter.validate()
    .then(async params => {
      const data = await dao.get(params.id, { joinRelations: true, readableBy })
      res.json(data)
    })
    .catch((err) => {
      if (err instanceof ValidationError) {
        err = new EmptyResultError()
      }
      httpErrorHandler(req, res)(err)
    })
}
