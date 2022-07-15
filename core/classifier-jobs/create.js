const { httpErrorHandler } = require('../../common/error-handling/http')
const { create } = require('./dao')
const Converter = require('../../common/converter')
const { ValidationError } = require('../../common/error-handling/errors')
const { validateQueryHours } = require('./dao/validate')

/**
 * @swagger
 *
 * /classifier-jobs:
 *   post:
 *     summary: Create a classifier job
 *     tags:
 *       - classifier-jobs
 *     requestBody:
 *       description: Job object
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/requestBodies/ClassifierJob'
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/ClassifierJob'
 *     responses:
 *       201:
 *         description: Created
 *         headers:
 *           Location:
 *             description: Path of the created resource (e.g. `/classifier-jobs/123`)
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid query parameters
 */
module.exports = (req, res) => {
  const converter = new Converter(req.body, {}, true)
  converter.convert('classifier_id').toInt()
  converter.convert('project_id').toString().minLength(12).maxLength(12)
  converter.convert('query_streams').optional().toString()
  converter.convert('query_start').optional().toMomentUtc()
  converter.convert('query_end').optional().toMomentUtc()
  converter.convert('query_hours').optional().toString().isPassingRegExp(/^(\b(0?[0-9]|1[0-9]|2[0-3])\b)(((-|,)\b(0?[0-9]|1[0-9]|2[0-3])\b)?)+$/g, 'invalid format')

  return converter.validate()
    .then(async (params) => {
      const isValidQueryHours = validateQueryHours(params.queryHours)
      if (!isValidQueryHours) {
        throw new ValidationError('query_hour with hyphen must given the lesser number first')
      }

      if (params.queryStart && params.queryEnd && params.queryStart.isAfter(params.queryEnd)) {
        throw new ValidationError('query_start must be before query_end')
      }

      const user = req.rfcx.auth_token_info
      const creatableBy = user && (user.is_super || user.has_system_role) ? undefined : user.id
      const job = { ...params, createdById: user.id }
      const result = await create(job, { creatableBy })

      return res.header('Access-Control-Expose-Headers', 'Location').location(`/classifier-jobs/${result.id}`).sendStatus(201)
    })
    .catch(httpErrorHandler(req, res))
}
