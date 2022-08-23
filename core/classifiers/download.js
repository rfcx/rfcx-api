const { ForbiddenError } = require('../../common/error-handling/errors')
const { httpErrorHandler } = require('../../common/error-handling/http')
const { getSignedUrl } = require('./dao/download')

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
module.exports = async (req, res) => {
  try {
    // Check authorization
    // TODO: Only the owner can download it?
    if (!req.rfcx.auth_token_info.has_system_role && !req.rfcx.auth_token_info.is_super) {
      throw new ForbiddenError()
    }

    const id = req.params.id
    const signedUrl = await getSignedUrl(id)

    return res.redirect(signedUrl)
  } catch (err) {
    return httpErrorHandler(req, res)(err)
  }
}
