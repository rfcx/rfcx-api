const router = require('express').Router()
const { httpErrorHandler } = require('../../common/error-handling/http')
const { hasRole } = require('../../common/middleware/authorization/authorization')
const dao = require('./dao')

/**
 * @swagger
 *
 * /stream-source-file/{id}:
 *   delete:
 *     summary: Delete a stream source file
 *     tags:
 *       - stream-source-files
 *     parameters:
 *       - name: id
 *         description: Stream source file id
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Success
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Stream not found
 */
router.delete('/:uuid', hasRole(['systemUser']), (req, res) => {
  return dao.get(req.params.uuid)
    .then(async (streamSourceFile) => {
      await dao.remove(streamSourceFile)
    })
    .then(() => res.sendStatus(204))
    .catch(httpErrorHandler(req, res, 'Failed deleting stream source file'))
})

module.exports = router
