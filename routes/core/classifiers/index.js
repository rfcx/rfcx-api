const router = require('express').Router()
const ValidationError = require('../../../utils/converter/validation-error')
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')
const service = require('../../../services/classifiers')
const Converter = require('../../../utils/converter/converter')
const storageService = process.env.PLATFORM === 'google' ? require('../../../services/storage/google') : require('../../../services/storage/amazon')
const { hash } = require('../../../utils/misc/hash')

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
router.get('/:id', authenticatedWithRoles('appUser', 'rfcxUser'), function (req, res) {
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
router.get('/', authenticatedWithRoles('appUser', 'rfcxUser'), function (req, res) {
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Classifier'
 *       400:
 *         description: Invalid query parameters
 */
// multipartFormDataMiddleware.single('file')
router.post('/', authenticatedWithRoles('appUser', 'rfcxUser'), function (req, res) {
  const transformedParams = {}
  const params = new Converter(req.body, transformedParams)
  params.convert('name').toString()
  params.convert('version').toInt()
  params.convert('external_id').toString()
  params.convert('supported_classification_values').optional().toArray()
  params.convert('active_projects').optional().toArray()
  params.convert('active_streams').optional().toArray()

  params.validate()
    .then(async () => {
      let modelUrl = ''
      if (req.files && req.files.file) {
        const file = req.files.file
        if (!file.originalname.endsWith('.tar.gz')) {
          throw new ValidationError('File must be .tar.gz')
        }
        // Perform upload
        const storageBucket = process.env.ASSET_BUCKET_AI
        const storagePath = `classifiers/${hash.randomString(8)}.tar.gz`
        await storageService.upload(storageBucket, storagePath, file.path)
        modelUrl = `${process.env.PLATFORM === 'google' ? 'gs' : 's3'}://${storageBucket}/${storagePath}`
      }

      const createdById = req.rfcx.auth_token_info.owner_id
      const classifier = {
        name: transformedParams.name,
        version: transformedParams.version,
        external_id: transformedParams.external_id,
        model_url: modelUrl,
        created_by_id: createdById
      }
      return service.create(classifier)
    })
    .then(classifier => {
      // TODO create outputs and streams/projects
    })
    .then(data => res.json(data))
    .catch(httpErrorHandler(req, res, 'Failed searching for classifiers'))
})

router.put('/:id', authenticatedWithRoles('appUser', 'rfcxUser'), function (req, res) {
  const transformedParams = {}
  const id = req.params.id
  const params = new Converter(req.body, transformedParams)
  // params.convert('status').optional.toInt()
  params.convert('deployment_parameters').optional.toString()
  params.convert('active_streams').optional().toArray()

  const createdById = req.rfcx.auth_token_info.owner_id

  console.log(transformedParams.active_streams)
  params.validate()
    .then(async () => {
      return service.update(id, createdById, transformedParams)
    })
    .then(data => res.json(data))
    .catch(httpErrorHandler(req, res, 'Failed updating classifiers'))
})

router.patch('/:id', authenticatedWithRoles('appUser', 'rfcxUser'), function (req, res) {
  const transformedParams = {}
  const id = req.params.id
  const params = new Converter(req.body, transformedParams)
  // params.convert('status').optional.toInt()
  params.convert('deployment_parameters').optional.toString()
  params.convert('active_streams').optional().toArray()

  const createdById = req.rfcx.auth_token_info.owner_id
  params.validate()
    .then(async () => {
      return service.update(id, createdById, transformedParams)
    })
    .then(data => res.json(data))
    .catch(httpErrorHandler(req, res, 'Failed updating classifiers'))
})

module.exports = router
