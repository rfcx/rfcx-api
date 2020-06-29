const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')

/**
 * @swagger
 *
 * /internal/assets/streams/{attrs}:
 *   post:
 *     summary: (Not yet implemented) Generate stream asset file (audio or spectrogram)
 *     tags:
 *       - internal
 *     parameters:
 *     responses:
 *       200:
 *         description: Success
 *       403:
 *         description: Insufficient privileges
 */
router.post("/assets/streams/:attrs", authenticatedWithRoles('rfcxUser'), function (req, res) {
  // Not yet implemented
  res.sendStatus(501);
})

module.exports = router
