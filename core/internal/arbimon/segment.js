const router = require('express').Router()
const { httpErrorHandler } = require('../../../common/error-handling/http')
const Converter = require('../../../common/converter')
const streamSegmentDao = require('../../stream-segments/dao')
const streamSourceFileDao = require('../../stream-source-files/dao')
const { sequelize } = require('../../_models')

/**
 * @swagger
 *
 * /internal/arbimon/segments:
 *   patch:
 *     summary: Update segments and source files
 *     tags:
 *       - internal
 *     requestBody:
 *       description: Stream ids and segments start
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/requestBodies/SegmentPatch'
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/SegmentPatch'
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Segment'
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Segment not found
 */
router.patch('/segments', (req, res) => {
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('new_stream_id').toString()
  params.convert('stream_start')

  sequelize.transaction()
    .then((transaction) => {
      return params.validate()
        .then(async () => {
          const streamObj = convertedParams.stream_start
          if (!streamObj || !Object.values(streamObj)) {
            throw new Error('No segments found')
          }
          return await streamSegmentDao.findByMultipleStreamsAndStarts(streamObj, {
            transaction,
            fields: ['stream_source_file_id']
          })
        })
        .then(async (existingSourceFilesId) => {
          const streamObj = convertedParams.stream_start
          if (!existingSourceFilesId.length) {
            throw new Error('No source files found')
          }
          await streamSegmentDao.updateByMultipleStreamsAndStarts({ stream_id: convertedParams.new_stream_id }, streamObj, { transaction })
          return existingSourceFilesId
        })
        .then(async (existingSourceFilesId) => {
          await streamSourceFileDao.updateById({ stream_id: convertedParams.new_stream_id }, existingSourceFilesId, { transaction })
          await transaction.commit()
          return res.sendStatus(200)
        })
        .catch((err) => {
          transaction.rollback()
          httpErrorHandler(req, res, 'Failed creating stream source file and segments')(err)
        })
    })
})
