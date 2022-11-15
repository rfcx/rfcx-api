const router = require('express').Router()
const { httpErrorHandler } = require('../../../common/error-handling/http')
const { StreamSegment, Sequelize } = require('../../_models')
const projectsService = require('../../projects/dao')
const rolesService = require('../../roles/dao')
const fileFormatDao = require('../../stream-segments/dao/file-extensions')
const streamSegmentDao = require('../../stream-segments/dao')
const streamSourceFilesDao = require('../../stream-source-files/dao')
const { getSegmentRemotePath } = require('../../stream-segments/bl/segment-file-utils')
const Converter = require('../../../common/converter')
const { ForbiddenError } = require('../../../common/error-handling/errors')
const S3Service = require('../../../noncore/_services/legacy/s3/s3-service')

/**
 * @swagger
 *
 * /internal/arbimon/segments:
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
router.delete('/segments', (req, res) => {
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('project_external_id').toInt()
  params.convert('segments').toArray()

  return params.validate()
    .then(() => StreamSegment.findAll({ where: { id: { [Sequelize.Op.in]: convertedParams.segments } }, raw: true }))
    .then(async (segments) => {
      if (!segments.length) {
        return res.sendStatus(204)
      }
      const externalProject = await projectsService.get({ external_id: convertedParams.project_external_id })
      const allowed = await rolesService.hasPermission('D', req.rfcx.auth_token_info, externalProject.id, rolesService.PROJECT)
      if (!allowed) {
        throw new ForbiddenError('You do not have permission to delete segments.')
      }
      const extensions = await fileFormatDao.findAll()
      const paths = segments.map(s => { return getSegmentRemotePath({ ...s, file_extension: extensions.find(ext => ext.id === s.file_extension_id) }) })
      await S3Service.deleteObjects(process.env.INGEST_BUCKET, paths)
      await streamSegmentDao.destroy(segments.map(s => s.id))
      await streamSourceFilesDao.destroy(segments.map(s => s.stream_source_file_id))
      return res.sendStatus(204)
    })
    .catch(httpErrorHandler(req, res, 'Failed deleting segments'))
})

module.exports = router
