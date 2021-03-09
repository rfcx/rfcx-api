const router = require('express').Router()
const Converter = require('../../../utils/converter/converter')
const { hasRole } = require('../../../middleware/authorization/authorization')
const classifierDeploymentService = require('../../../services/classifiers/deployments')
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')

/**
 * @swagger
 * 
 * /internal/prediction-deployer/classifier-deployments
 *   get:
 *     summary: Get latest of each classifier deployment information
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
 *       - name: start_after
 *         description: Time to query the classifier which have start time greater or equal given time
 *         in: query
 *         required: false
 *         type: string
 *       - name: end_before
 *         description: Time to query the classifier which have end time less or equal given time
 *         in: query
 *         required: false
 *         type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/classifier-deployments', hasRole(['systemUser']), (req, res) => {
  const params = new Converter(req.query, {}, true)
  params.convert('platform').optional().toString()
  params.convert('deployed').optional().toBoolean()
  params.convert('start_after').optional().toMomentUtc()
  params.convert('end_before').optional().toMomentUtc()

  return params.validate()
    .then((params) => {
      const { platform, deployed, startAfter, endBefore } = params
      return classifierDeploymentService.query({ platform, deployed, endBefore, startAfter })
    })
    .then(deployments => {
      const filteredDeployments = []
      for (const deployment of deployments) {
        const idx = filteredDeployments.findIndex(d => d.classifier_id === deployment.classifier_id)
        if (idx < 0) {
          filteredDeployments.push(deployment)
        }
      }
      return filteredDeployments
    })
    .then(deployments => res.json(deployments))
    .catch(httpErrorHandler(req, res, 'Failed to get deployments'))
})

/**
 * @swagger
 * 
 * /internal/prediction-deployer/classifier-deployments/{id}
 *   get:
 *     summary: Get classifier deployment information
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
