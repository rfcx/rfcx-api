const { httpErrorHandler } = require('../../common/error-handling/http')
const dao = require('./dao/index')
const classifierService = require('./bl/index')
const Converter = require('../../common/converter')

/**
 * @swagger
 *
 * /classifier-jobs:
 *   post:
 *     summary: Create a classifier job
 *     tags:
 *       - jobs
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
  const user = req.rfcx.auth_token_info
  const converter = new Converter(req.body, {}, true)
  converter.convert('project_id').toString().minLength(12).maxLength(12)
  converter.convert('query_streams').optional().toString()
  converter.convert('query_start').optional().toMomentUtc()
  converter.convert('query_end').optional().toMomentUtc()
  converter.convert('query_hours').optional().toString()

  return converter.validate()
    .then(async (params) => {
      const { projectId, queryStreams, queryStart, queryEnd, queryHours } = params
      const createdById = user.id
      const readableBy = await classifierService.getPermissableBy(user)
      const streamsNames = await classifierService.getStreamsNames(queryStreams)
      const segmentsTotal = await classifierService.getSegmentsCount(projectId, queryStreams, queryStart, queryEnd, queryHours)
      const classifierJob = await classifierService.getClassifierJobParams(projectId, streamsNames, queryStart, queryEnd, queryHours, createdById, segmentsTotal)
      const result = await dao.create(classifierJob, readableBy)

      return res.location(`/classifier-jobs/${result.id}`).sendStatus(201)
    })
    .catch(httpErrorHandler(req, res, 'Failed creating classifier job'))
}
