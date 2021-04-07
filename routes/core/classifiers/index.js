const router = require('express').Router()
const ValidationError = require('../../../utils/converter/validation-error')
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')
const service = require('../../../services/classifiers')
const Converter = require('../../../utils/converter/converter')
const { getIds } = require('../../../services/classifications')
const { parseClassifierOutputMapping } = require('../../../services/classifiers/parsing')
const { upload } = require('../../../services/classifiers/upload')

/**
 * @swagger
 *
 * /classifiers/{id}:
 *   get:
 *     summary: Get a classifier (model)
 *     tags:
 *       - classifiers
 *     parameters:
 *       - name: id
 *         description: Classifier identifier
 *         in: path
 *         type: string
 *         example: gibbon
 *     responses:
 *       200:
 *         description: A classifier
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Classifier'
 *       404:
 *         description: Not found
 */
router.get('/:id', authenticatedWithRoles('rfcxUser', 'systemUser'), function (req, res) {
  return service.get(req.params.id, { joinRelations: true })
    .then(data => res.json(data))
    .catch(httpErrorHandler(req, res, 'Failed getting classifier'))
})

/**
 * @swagger
 *
 * /classifiers:
 *   get:
 *     summary: Get list of classifiers (models) matching search criteria
 *     tags:
 *       - classifiers
 *     parameters:
 *       - name: limit
 *         description: Maximum number of results to return
 *         in: query
 *         type: int
 *         default: 100
 *       - name: offset
 *         description: Number of results to skip
 *         in: query
 *         type: int
 *         default: 0
 *     responses:
 *       200:
 *         description: List of classifier objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ClassifierLite'
 *       400:
 *         description: Invalid query parameters
 */
router.get('/', authenticatedWithRoles('rfcxUser', 'systemUser'), function (req, res) {
  const transformedParams = {}
  const params = new Converter(req.query, transformedParams)
  params.convert('limit').default(100).toInt()
  params.convert('offset').default(0).toInt()

  params.validate()
    .then(() => {
      const { limit, offset } = transformedParams
      const attributes = { limit, offset }
      return service.query(attributes)
    })
    .then(data => res.json(data))
    .catch(httpErrorHandler(req, res, 'Failed searching for classifiers'))
})

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
router.post('/', authenticatedWithRoles('rfcxUser', 'systemUser'), function (req, res) {
  const transformedParams = {}
  const params = new Converter(req.body, transformedParams)
  params.convert('name').toString()
  params.convert('version').toInt()
  params.convert('external_id').optional().toString()
  params.convert('classification_values').toArray()
  params.convert('active_projects').optional().toArray()
  params.convert('active_streams').optional().toArray()

  params.validate()
    .then(async () => {
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
      const outputMappings = transformedParams.classification_values.map(parseClassifierOutputMapping)
      let serverIds = {}
      try {
        serverIds = await getIds(outputMappings.map(value => value.to))
      } catch (_) {
        throw new ValidationError('Classification values not found')
      }
      const outputs = outputMappings.map(value => ({ className: value.from, id: serverIds[value.to] }))

      const createdById = req.rfcx.auth_token_info.id
      const classifier = {
        name: transformedParams.name,
        version: transformedParams.version,
        externalId: transformedParams.external_id,
        modelUrl,
        createdById,
        outputs,
        activeProjects: transformedParams.active_projects,
        activeStreams: transformedParams.active_streams
      }
      return service.create(classifier)
    })
    .then(classifier => {
      res.location(`${req.baseUrl}${req.path}${classifier.id}`).sendStatus(201)
    })
    .catch(httpErrorHandler(req, res, 'Failed searching for classifiers'))
})

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
 */
router.patch('/:id', function (req, res) {
  const id = req.params.id

  if (!req.rfcx.auth_token_info.has_system_role && !req.rfcx.auth_token_info.is_super) {
    console.warn(`WARN: PATCH /classifiers/${id} Forbidden`)
    return res.sendStatus(403)
  }

  const transformedParams = {}
  const params = new Converter(req.body, transformedParams)
  params.convert('name').optional().toString()
  params.convert('version').optional().toInt()
  params.convert('external_id').optional().toString()
  params.convert('status').optional().toInt()
  params.convert('platform').optional().toString().default('aws')
  params.convert('deployment_parameters').optional().toString({ emptyStringToNull: true })
  params.convert('active_projects').optional().toArray()
  params.convert('active_streams').optional().toArray()

  const createdById = req.rfcx.auth_token_info.id
  params.validate()
    .then(() => {
      return service.update(id, createdById, transformedParams)
    })
    .then(data => res.json(data))
    .catch(httpErrorHandler(req, res, 'Failed updating classifiers'))
})

module.exports = router
