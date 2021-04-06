const router = require('express').Router()
const Converter = require('../../../utils/converter/converter')
const { hasRole } = require('../../../middleware/authorization/authorization')
const classifierDeploymentService = require('../../../services/classifiers/deployments')
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')

/**
 * @swagger
 * /internal/prediction-deployer/classifier-deployments/{id}
 *   get:
 *     summary: Get the classifier deployment by id
 *     description: -
 *     tags:
 *       - internal
 *     responses:
 *       200:
 *         description: Success
 *       404:
 *         Not found the classifier deployment with given id
 */
router.get('/classifier-deployments/:id', hasRole(['systemUser']), (req, res) => {
  const id = req.params.id

  return classifierDeploymentService.get(id)
    .then(deployments => res.json(deployments))
    .catch(httpErrorHandler(req, res, 'Failed to get deployments'))
})

/**
 * @swagger
 *
 * /internal/prediction-deployer/classifier-deployments
 *   get:
 *     summary: Get classifier deployments information
 *     description: This endpoint is used by the "prediction-deployer" service for create, update, or delete the k8s deployment
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
 *       - name: type
 *         description: Limit the result by returnin `only_first` or `only_last` of each classifier deployment
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum:
 *             - only_first
 *             - only_last
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/classifier-deployments', hasRole(['systemUser']), (req, res) => {
  const params = new Converter(req.query, {}, true)
  params.convert('platform').optional().toString()
  params.convert('deployed').optional().toBoolean()
  params.convert('start').optional().toMomentUtc()
  params.convert('end').optional().toMomentUtc()
  params.convert('type').optional().toString().isEqualToAny(['only_first', 'only_last'])

  return params.validate()
    .then((params) => {
      const { platform, deployed, start, end, type } = params
      return classifierDeploymentService.query({ platform, deployed, start, end, type })
    })
    .then(deployments => res.json(deployments))
    .catch(httpErrorHandler(req, res, 'Failed to get deployments'))
})

/**
 * @swagger
 *
 * /internal/prediction-deployer/classifier-deployments/{id}
 *   patch:
 *     summary: Update the deployed status of given classifier id
 *     description: This endpoint is used by the "prediction-deployer" service for create, update, or delete the k8s deployment
 *     tags:
 *       - internal
 *     parameters:
 *       - name: deployed
 *         description: classifier deployed status
 *         in: query
 *         required: true
 *         type: boolean
 *     responses:
 *       200:
 *         description: Success
 *       400:
 *         description: Invalid query parameters
 */
router.patch('/classifier-deployments/:id', hasRole(['systemUser']), (req, res) => {
  const convertedParams = {}
  const id = req.params.id
  const params = new Converter(req.query, convertedParams)
  params.convert('deployed').toBoolean()

  return params.validate()
    .then(() => {
      const deployed = convertedParams.deployed
      return classifierDeploymentService.update(id, deployed)
    })
    .then(() => res.status(200).send('Updated'))
    .catch(httpErrorHandler(req, res, 'Failed to update `deployed` status'))
})

module.exports = router
