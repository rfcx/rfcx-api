const { httpErrorHandler } = require('../../../common/error-handling/http')
const dao = require('./dao/index')
const classifierService = require('./bl/index')
const Converter = require('../../../common/converter')

/**
 * @swagger
 *
 * /jobs:
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
 *             description: Path of the created resource (e.g. `/jobs/123`)
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid query parameters
 */
module.exports = (req, res) => {
  const converter = new Converter(req.body, {}, true)
  converter.convert('project_id').toString().minLength(12).maxLength(12)
  converter.convert('query_streams').optional().toString()
  converter.convert('query_start').optional().toMomentUtc()
  converter.convert('query_end').optional().toMomentUtc()
  converter.convert('query_hours').optional().toString()

  return converter.validate()
    .then(async (params) => {
      const { projectId, queryStreams, queryStart, queryEnd, queryHours } = params
      const user = req.rfcx.auth_token_info
      const createdById = user.id
      const readableBy = await classifierService.getReadableBy(user)
      const streamsNames = await classifierService.getStreamsNames(queryStreams)
      const segmentsTotal = await classifierService.getSegmentsCount(projectId, queryStreams, queryStart, queryEnd, queryHours)
      const classifierJob = await classifierService.getClassifierJobParams(projectId, streamsNames, queryStart, queryEnd, queryHours, createdById, segmentsTotal)
      const createdJob = await dao.create(classifierJob, readableBy)

      return res.location(`/jobs/${createdJob.id}`).sendStatus(201)
    })
    .catch(httpErrorHandler(req, res, 'Failed creating classifier job'))
}
