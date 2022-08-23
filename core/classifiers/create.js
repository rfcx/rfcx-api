const { ValidationError, ForbiddenError } = require('../../common/error-handling/errors')
const { httpErrorHandler } = require('../../common/error-handling/http')
const dao = require('./dao')
const Converter = require('../../common/converter')
const { getIds } = require('../classifications/dao')
const { parseClassifierOutputMapping } = require('./dao/parsing')
const { upload } = require('./dao/upload')

/**
 * @swagger
 *
 * /classifiers:
 *   post:
 *     summary: Create a classifier
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
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/requestBodies/ClassifierWithFile'
 *     responses:
 *       201:
 *         description: Created
 *         headers:
 *           Location:
 *             description: Path of the created resource (e.g. `/classifiers/12`)
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid query parameters
 */
module.exports = async (req, res) => {
  try {
    if (!req.rfcx.auth_token_info.has_system_role && !req.rfcx.auth_token_info.is_super) {
      throw new ForbiddenError()
    }

    const converter = new Converter(req.body, {}, true)
    converter.convert('name').toString()
    converter.convert('version').toInt()
    converter.convert('external_id').optional().toString()
    converter.convert('classification_values').toArray()
    converter.convert('active_projects').optional().toArray()
    converter.convert('active_streams').optional().toArray()
    const params = await converter.validate()

    // Upload model if included
    let modelUrl = ''
    if (req.files && req.files.file) {
      const file = req.files.file
      if (!file.originalname.endsWith('.tar.gz')) {
        throw new ValidationError('File must be .tar.gz')
      }
      modelUrl = await upload(file)
    }

    // Get the classification ids for each output (or error if not found)
    const outputMappings = params.classificationValues.map(parseClassifierOutputMapping)
    let serverIds = {}
    try {
      serverIds = await getIds(outputMappings.map(value => value.to))
    } catch (_) {
      throw new ValidationError('Classification values not found')
    }
    const outputs = outputMappings.map(value => ({ className: value.from, id: serverIds[value.to] }))

    const createdById = req.rfcx.auth_token_info.id
    const classifier = {
      name: params.name,
      version: params.version,
      externalId: params.externalId,
      modelUrl,
      createdById,
      outputs,
      activeProjects: params.activeProjects,
      activeStreams: params.activeStreams
    }

    const result = await dao.create(classifier)

    res.location(`${req.baseUrl}${req.path}${result.id}`).sendStatus(201)
  } catch (err) {
    return httpErrorHandler(req, res)(err)
  }
}
