const router = require('express').Router()
const { ValidationError } = require('../../common/error-handling/errors')
const { httpErrorHandler } = require('../../common/error-handling/http')
const dao = require('./dao')
const Converter = require('../../common/converter')
const { getIds } = require('../classifications/dao')
const { parseClassifierOutputMapping } = require('./dao/parsing')
const { upload } = require('./dao/upload')
const { getSignedUrl } = require('./dao/download')

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
router.get('/:id', function (req, res) {
  return dao.get(req.params.id, { joinRelations: true })
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
router.get('/', function (req, res) {
  const user = req.rfcx.auth_token_info
  const readableBy = user && (user.is_super || user.has_system_role) ? undefined : user.id
  const converter = new Converter(req.query, {}, true)
  converter.convert('limit').default(100).toInt()
  converter.convert('offset').default(0).toInt()

  return converter.validate()
    .then(async params => {
      const options = { ...params, readableBy }
      const result = await dao.query({}, options)
      return res.json(result.results)
    })
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
router.post('/', function (req, res) {
  if (!req.rfcx.auth_token_info.has_system_role && !req.rfcx.auth_token_info.is_super) {
    console.warn('WARN: POST /classifiers Forbidden')
    return res.sendStatus(403)
  }

  const transformedParams = {}
  const params = new Converter(req.body, transformedParams, true)
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
        activeProjects: transformedParams.activeProjects,
        activeStreams: transformedParams.activeStreams
      }
      return dao.create(classifier)
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

  // TODO: Only the owner can change it?
  if (!req.rfcx.auth_token_info.has_system_role && !req.rfcx.auth_token_info.is_super) {
    console.warn(`WARN: PATCH /classifiers/${id} Forbidden`)
    return res.sendStatus(403)
  }

  const params = new Converter(req.body, {}, true)
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
    .then((params) => {
      return dao.update(id, createdById, params)
    })
    .then(data => res.json(data))
    .catch(httpErrorHandler(req, res, 'Failed updating classifiers'))
})

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
router.get('/:id/file', function (req, res) {
  const id = req.params.id

  // TODO: Only the owner can download it?
  if (!req.rfcx.auth_token_info.has_system_role && !req.rfcx.auth_token_info.is_super) {
    console.warn(`WARN: GET /classifiers/${id}/file Forbidden`)
    return res.sendStatus(403)
  }

  getSignedUrl(id)
    .then(signedUrl => {
      res.redirect(signedUrl)
    })
    .catch(httpErrorHandler(req, res, `Failed downloading classifiers id ${id}`))
})

module.exports = router
