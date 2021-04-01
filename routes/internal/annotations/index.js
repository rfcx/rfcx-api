const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler')

/**
 * @swagger
 * /internal/annotations
 *   get:
 *     summary: Get list of annotations
 *     description: -
 *     tags:
 *       - internal
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/', async (req, res) => {
  try {
    res.sendStatus(501)
  } catch (e) {
    httpErrorHandler(req, res, 'Failed getting annotations')
  }
})

module.exports = router
