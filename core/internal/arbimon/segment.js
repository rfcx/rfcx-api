const router = require('express').Router()
const { httpErrorHandler } = require('../../../common/error-handling/http')
const Converter = require('../../../common/converter')
const streamSegmentDao = require('../../stream-segments/dao')
const streamSourceFileDao = require('../../stream-source-files/dao')
const { sequelize } = require('../../_models')

/**
 * @swagger
 *
 * /internal/arbimon/segment:
 *   patch:
 *     summary: Update segments and source files
 *     tags:
 *       - internal
 *     requestBody:
 *       description: Stream attributes and segments data
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
router.patch('/streams/:externalId', (req, res) => {
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('segment_id').toArray()
  params.convert('segment_start').toArray()
  params.convert('new_stream_id').toString()
  params.convert('old_segment_id').toString()

  sequelize.transaction()
    .then((transaction) => {
      return params.validate()
        .then(async () => {
          return await streamSegmentDao.findByStreamAndStarts(convertedParams.old_segment_id, convertedParams.segment_start.map(start => start.toISOString()), {
            transaction,
            fields: ['id', 'stream_id', 'start', 'stream_source_file_id']
          })
        })
        .then(async (existingSegments) => {
          if (!existingSegments.length) {
            throw new Error('No segments found')
          }
          await streamSegmentDao.updateByStreamAndStarts(convertedParams.new_stream_id, existingSegments.map(s => s.start.toISOString()), { availability: 1 }, { transaction })
          return existingSegments
        })
        .then(async (existingSegments) => {
          const filter = {
            id: existingSegments.map(segment => segment.stream_source_file_id)
          }
          return streamSourceFileDao.query(filter, {
            transaction,
            fields: ['id']
          })
        })
        .then(async (existingSourceFilesId) => {
          if (!existingSourceFilesId.length) {
            throw new Error('No source files found')
          }
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
