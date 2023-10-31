const router = require('express').Router()
const { httpErrorHandler } = require('../../../common/error-handling/http')
const ArrayConverter = require('../../../common/converter/array')
const { softDeleteRecordings } = require('./bl/recordings')

/**
 * @swagger
 *
 * /internal/arbimon/recordings:
 *   delete:
 *     summary: Delete segments and stream source files for recordings
 *     tags:
 *       - internal
 *     requestBody:
 *       description: Array of objects stream and start
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/ArbimonRecordingsDeleteData'
 *     responses:
 *       200:
 *         description: Deleted
 *       500:
 *         description: Invalid parameters
 */
router.delete('/recordings', (req, res) => {
  const converter = new ArrayConverter(req.body, true)
  converter.convert('stream').toString()
  converter.convert('starts').toArray()

  return converter.validate()
    .then(async (params) => {
      await softDeleteRecordings(params)
      return res.sendStatus(200)
    })
    .catch(httpErrorHandler(req, res, 'Failed to soft delete recordings'))
})

module.exports = router
