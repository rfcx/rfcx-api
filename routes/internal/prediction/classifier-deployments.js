const router = require('express').Router()
const Converter = require('../../../utils/converter/converter')
const { hasRole } = require('../../../middleware/authorization/authorization')
const classifierDeploymentsService = require('../../../services/classifiers/deployments')
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')

router.use(hasRole(['systemUser']))

/**
 * @swagger
 *
 * /internal/prediction/classifier-deployments/{id}:
 *   get:
 *     summary: Get the classifier deployment by id
 *     tags:
 *       - internal
 *     responses:
 *       200:
 *         description: Success
 *       404:
 *         Not found the classifier deployment with given id
 */
router.get('/classifier-deployments/:id', (req, res) => {
  const id = req.params.id

  return classifierDeploymentsService.get(id)
    .then(deployments => res.json(deployments))
    .catch(httpErrorHandler(req, res, 'Failed to get deployment'))
})

/**
 * @swagger
 *
 * /internal/prediction/classifier-deployments:
 *   get:
 *     summary: Get classifier deployments
 *     description: Used by the prediction-deployer to find out which classifiers need deploying/deleting
 *     tags:
 *       - internal
 *     parameters:
 *       - name: platform
 *         description: platform keyword e.g. aws, hwc
 *         in: query
 *         required: false
 *         type: string
 *       - name: deployed
 *         description: classifier deployed status
 *         in: query
 *         required: false
 *         type: boolean
 *       - name: start
 *         description: Time to query the classifier which have start time greater or equal given time
 *         in: query
 *         required: false
 *         type: string
 *       - name: end
 *         description: Time to query the classifier which have end time less or equal given time
 *         in: query
 *         required: false
 *         type: string
 *       - name: sort
 *         description: Name of field to sorted / "-" for DESC default for ASC
 *         in: query
 *         type: string
 *         default: -start
 *       - name: fields
 *         description: Customize included fields and relations
 *         in: query
 *         type: array
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
 *         description: Success
 */
router.get('/classifier-deployments', (req, res) => {
  const converter = new Converter(req.query, {}, true)
  converter.convert('platform').optional().toString()
  converter.convert('deployed').optional().toBoolean()
  converter.convert('start').optional().toMomentUtc()
  converter.convert('end').optional().toMomentUtc()
  converter.convert('sort').default('-start').toString()
  converter.convert('fields').optional().toArray()
  converter.convert('limit').default(100).toInt()
  converter.convert('offset').default(0).toInt()

  return converter.validate()
    .then((params) => {
      const { platform, deployed, start, end, ...options } = params
      return classifierDeploymentsService.query({ platform, deployed, start, end }, options)
    })
    .then(deployments => res.json(deployments))
    .catch(httpErrorHandler(req, res, 'Failed to get deployments'))
})

/**
 * @swagger
 *
 * /internal/prediction/classifier-deployments/{id}:
 *   patch:
 *     summary: Update the deployed status of given classifier id
 *     description: Used by the prediction-deployer to update the deployment status of classifiers
 *     tags:
 *       - internal
 *     parameters:
 *       - name: id
 *         description: Classifier deployment identifier
 *         in: path
 *         required: true
 *         type: string
 *     requestBody:
 *       description: Classifier deployment attributes
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/requestBodies/ClassifierDeployment'
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/ClassifierDeployment'
 *     responses:
 *       200:
 *         description: Success
 *       400:
 *         description: Invalid body parameters
 */
router.patch('/classifier-deployments/:id', (req, res) => {
  const id = req.params.id
  const converter = new Converter(req.body, {}, true)
  converter.convert('deployed').toBoolean()

  return converter.validate()
    .then((deployment) => {
      return classifierDeploymentsService.update(id, deployment)
    })
    .then(() => res.status(200).send('Updated'))
    .catch(httpErrorHandler(req, res, 'Failed to update classifier deployment'))
})

module.exports = router