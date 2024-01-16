const { ForbiddenError } = require('../../common/error-handling/errors')
const { httpErrorHandler } = require('../../common/error-handling/http')
const dao = require('./dao')
const Converter = require('../../common/converter')

/**
   * @swagger
   *
   * /classifiers/{id}:
   *   patch:
   *     summary: Update a classifier
   *     tags:
   *       - classifiers
   *     requestBody:
   *       description: Classifier object
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/requestBodies/Classifier'
   *         application/x-www-form-urlencoded:
   *           schema:
   *             $ref: '#/components/requestBodies/Classifier'
   *     responses:
   *       200:
   *         description: Updated
   *       400:
   *         description: Invalid query parameters
   *       403:
   *         description: Insufficient privileges
   */
module.exports = async (req, res) => {
  try {
    const id = req.params.id

    // Check authorization
    // TODO: Only the owner can change it?
    if (!req.rfcx.auth_token_info.has_system_role && !req.rfcx.auth_token_info.is_super) {
      throw new ForbiddenError()
    }

    const converter = new Converter(req.body, {}, true)
    converter.convert('name').optional().toString()
    converter.convert('version').optional().toInt()
    converter.convert('parameters').optional().toString()
    converter.convert('external_id').optional().toString()
    converter.convert('status').optional().toInt()
    converter.convert('platform').optional().toString().default('aws')
    converter.convert('active_projects').optional().toArray()
    converter.convert('active_streams').optional().toArray()
    converter.convert('classification_values').optional().toArray()
    const params = await converter.validate()

    // Call DAO & return
    const createdById = req.rfcx.auth_token_info.id
    await dao.update(id, createdById, params)
    return res.sendStatus(200)
  } catch (err) {
    return httpErrorHandler(req, res)(err)
  }
}
