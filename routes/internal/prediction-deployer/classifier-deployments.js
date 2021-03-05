const router = require('express').Router()
const Converter = require('../../../utils/converter/converter')
const { hasRole } = require('../../../middleware/authorization/authorization')


/**
 * @swagger
 * 
 * /internal/prediction-deployer/classifier-deployments
 *   get:
 *     summary: Get classifier deployment information
 *     description: This endpoint is used by the "prediction-deployer" service for create, update, or delete the k8s deployment
 *     tags:
 *       - internal
 *     parameters:
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: 
 */
router.get('/classifier-deployments', hasRole(['systemUser']), function (req, res) {
    // Not yet implemented
    res.sendStatus(501)
})

/**
 * @swagger
 * 
 * /internal/prediction-deployer/classifier-deployments
 *   get:
 *     summary: Get classifier deployment information
 *     description: This endpoint is used by the "prediction-deployer" service for create, update, or delete the k8s deployment
 *     tags:
 *       - internal
 *     parameters:
 *     responses:
 *       200:
 *         description: Success
 */
 router.patch('/classifier-deployments', hasRole(['systemUser']), function (req, res) {
    // Not yet implemented
    res.sendStatus(501)
})

module.exports = router
