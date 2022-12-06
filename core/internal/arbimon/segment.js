const router = require('express').Router()
const { httpErrorHandler } = require('../../../common/error-handling/http')
const Converter = require('../../../common/converter')
const { sequelize } = require('../../_models')
const { getSegmentData, deleteSegmentAsync } = require('../../stream-segments/bl/segment-delete')

/**
 * @swagger
 *
 * /internal/arbimon/segment:
 *   delete:
 *     summary: Delete segments
 *     tags:
 *       - segments
 *     parameters:
 *       - segments: Segment ids
 *         description: Segment ids to delete
 *         in: path
 *         required: true
 *         type: array
 *         example: 4b022b7a-ed0e-41d5-ad90-a7febd57c8bf
 *     responses:
 *       200:
 *         description: Success
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Segment not found
 */
router.delete('/segment', (req, res) => {
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('segments').toArray()
  sequelize.transaction()
    .then((transaction) => {
      return params.validate()
        .then(() => getSegmentData(convertedParams.segments, transaction))
        .then(async (data) => {
          if (!data.results.length) {
            transaction.rollback()
            return res.sendStatus(204)
          }
          await deleteSegmentAsync(req.rfcx.auth_token_info, data.results, transaction)
          await transaction.commit()
          return res.sendStatus(204)
        })
        .catch((err) => {
          transaction.rollback()
          httpErrorHandler(req, res, 'Failed deleting segments')(err)
        })
    })
})

module.exports = router
