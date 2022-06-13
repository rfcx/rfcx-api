const { httpErrorHandler } = require('../../common/error-handling/http')
const { update } = require('./dao')
const Converter = require('../../common/converter')
const CLASSIFIER_JOB_STATUS = require('./classifier-job-status')

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
 *             $ref: '#/components/requestBodies/ClassifierJob'
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/requestBodies/ClassifierJob'
 *     responses:
 *       200:
 *         description: Updated
 *       400:
 *         description: Invalid parameters
 *       403:
 *         description: Insufficient privileges
 */
module.exports = async (req, res) => {
  try {
    const id = req.params.id

    // Check authorization
    if (!req.rfcx.auth_token_info.has_system_role && !req.rfcx.auth_token_info.is_super) {
      console.warn(`WARN: PATCH /classifier-jobs/${id} Forbidden`)
      return res.sendStatus(403)
    }

    // Validate params
    const converter = new Converter(req.body, {}, true)
    converter.convert('status').optional().toInt()
    const params = await converter.validate()

    if (params.status === CLASSIFIER_JOB_STATUS.RUNNING) {
      console.warn(`WARN: PATCH /classifier-jobs/${id} Invalid parameters`)
      return res.status(400).send('Use POST /classifier-jobs/dequeue to start a job')
    }

    // Set/clear completedAt
    params.completedAt = params.status === CLASSIFIER_JOB_STATUS.DONE
      ? new Date()
      : null

    // Call DAO & return
    await update(id, params)
    return res.sendStatus(200)
  } catch (err) {
    console.error(err)
    httpErrorHandler(req, res, 'Failed to update classifier jobs')
  }
}
