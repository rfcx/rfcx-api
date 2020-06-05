const router = require("express").Router()

/**
 * @swagger
 *
 * /detections:
 *   get:
 *     summary: Get list of detections (not yet implemented)
 *     description:
 *     tags:
 *       - detections
 *     responses:
 *       200:
 *         description: List of detection (lite) objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *       400:
 *         description: Invalid query parameters
 */
router.get("/", (req, res) => {
  res.sendStatus(504)
})

module.exports = router