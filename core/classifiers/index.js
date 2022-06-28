const router = require('express').Router()
const { ValidationError, ForbiddenError } = require('../../common/error-handling/errors')
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
    .catch(httpErrorHandler(req, res))
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
  const converter = new Converter(req.query, {}, true)
  converter.convert('limit').default(100).toInt()
  converter.convert('offset').default(0).toInt()

  return converter.validate()
    .then(async params => {
      const user = req.rfcx.auth_token_info
      const readableBy = user && (user.is_super || user.has_system_role) ? undefined : user.id

      const options = { ...params, readableBy }
      const { results } = await dao.query({}, options)

      return res.json(results)
    })
    .catch(httpErrorHandler(req, res))
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
router.post('/', async (req, res) => {
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
 *       403:
 *         description: Insufficient privileges
 */
router.patch('/:id', async (req, res) => {
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
    converter.convert('external_id').optional().toString()
    converter.convert('status').optional().toInt()
    converter.convert('platform').optional().toString().default('aws')
    converter.convert('deployment_parameters').optional().toString({ emptyStringToNull: true })
    converter.convert('active_projects').optional().toArray()
    converter.convert('active_streams').optional().toArray()
    const params = await converter.validate()

    // Call DAO & return
    const createdById = req.rfcx.auth_token_info.id
    await dao.update(id, createdById, params)
    return res.sendStatus(200)
  } catch (err) {
    return httpErrorHandler(req, res)(err)
  }
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
router.get('/:id/file', async (req, res) => {
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
})

module.exports = router
