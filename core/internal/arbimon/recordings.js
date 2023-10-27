const router = require('express').Router()
const { httpErrorHandler } = require('../../../common/error-handling/http')
const ArrayConverter = require('../../../common/converter/array')
const { updateBatch } = require('./bl/recordings')

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
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/requestBodies/ArbimonRecordingsDeleteData'
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/ArbimonRecordingsDeleteData'
 *     responses:
 *       200:
 *         description: Updated
 *       400:
 *         description: Invalid parameters
 */
router.delete('/recordings', (req, res) => {
  const converter = new ArrayConverter(req.body, true)
  converter.convert('stream').toString()
  converter.convert('starts').toArray()

  return converter.validate()
    .then(async (params) => {
      await updateBatch(params)
      return res.sendStatus(200)
    })
    .catch(httpErrorHandler(req, res, 'Failed update stream source file and segments'))
})

module.exports = router
