const { ForbiddenError } = require('../../common/error-handling/errors')
const { httpErrorHandler } = require('../../common/error-handling/http')
const { getSignedUrl } = require('./dao/download')
const { get } = require('./dao')

/**
 * /classifier/{id}/file
 *  get:
 *    summary: Downlaod a classifier file
 *    tags:
 *      - classifiers
 *     parameters:
 *       - name: id
 *         description: Classifier identifier
 *         in: path
 *         type: string
 *         example: 1
 *     responses:
 *       200:
 *         description: A classifier file
 *         content:
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Not found
 */
module.exports = (req, res) => {
  const user = req.rfcx.auth_token_info
  const readableBy = user && (user.is_super || user.has_system_role) ? undefined : user.id
  const classifierId = req.params.id

  return get(classifierId, { attributes: ['model_url'], readableBy })
    .then(async (classifier) => {
      const classifierUrl = classifier.model_url
      const signedUrl = await getSignedUrl(classifierUrl)

      res.redirect(signedUrl)
    })
    .catch(httpErrorHandler(req, res))
}
