const { httpErrorHandler } = require('../../common/error-handling/http')
const { getSignedUrl } = require('./dao/download')
const { get } = require('./dao')

/**
 * @swagger
 *
 * /classifiers/{id}/file:
 *  get:
 *    summary: Download a classifier file
 *    tags:
 *     - classifiers
 *    parameters:
 *     - name: id
 *       description: Classifier identifier
 *       in: path
 *       type: string
 *       example: 1
 *    responses:
 *      200:
 *        description: A classifier file
 *        content:
 *          application/zip:
 *            schema:
 *              type: string
 *              format: binary
 *      404:
 *        description: Not found
 */
module.exports = (req, res) => {
  const user = req.rfcx.auth_token_info
  const readableBy = user && (user.is_super || user.has_system_role) ? undefined : user.id
  const classifierId = req.params.id

  return get(classifierId, { fields: ['model_url'], readableBy })
    .then(async (classifier) => {
      const classifierUrl = classifier.modelUrl
      const signedUrl = await getSignedUrl(classifierUrl)

      res.redirect(signedUrl)
    })
    .catch(httpErrorHandler(req, res))
}
