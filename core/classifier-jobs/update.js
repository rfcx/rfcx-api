const { httpErrorHandler } = require('../../common/error-handling/http')
const { update } = require('./dao')
const Converter = require('../../common/converter')
const { RUNNING } = require('./classifier-job-status')
const { ForbiddenError, ValidationError } = require('../../common/error-handling/errors')

/**
 * @swagger
 *
 * /classifier-jobs/{id}:
 *   patch:
 *     summary: Update a classifier job
 *     tags:
 *       - classifier-jobs
 *     requestBody:
  *       description: Classifier object
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/ClassifierJobUpdate'
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/requestBodies/ClassifierJobUpdate'
 *     responses:
 *       200:
 *         description: Updated
 *       400:
 *         description: Invalid parameters
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Not found
 */
module.exports = async (req, res) => {
  try {
    // Check authorization
    if (!req.rfcx.auth_token_info.has_system_role && !req.rfcx.auth_token_info.is_super) {
      throw new ForbiddenError()
    }

    // Validate params
    const converter = new Converter(req.body, {}, true)
    converter.convert('status').optional().toInt()
    const params = await converter.validate()

    if (params.status === RUNNING) {
      throw new ValidationError('Use POST /classifier-jobs/dequeue to start a job')
    }

    // Call DAO & return
    const id = req.params.id
    await update(id, params)

    return res.sendStatus(200)
  } catch (err) {
    httpErrorHandler(req, res)
  }
}
