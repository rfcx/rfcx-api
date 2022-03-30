const router = require('express').Router()
const { getGuardianInfoByStreamId } = require('../../_services/guardians/guardians-service')
const { httpErrorHandler } = require('../../../common/error-handling/http')
const models = require('../../../core/_models')
const guardiansService = require('../../_services/guardians/guardians-service')
const Converter = require('../../../common/converter')
const passport = require('passport')
const views = require('../../views/v1')

router.route('/')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), function (req, res) {
    const user = req.rfcx.auth_token_info
    const converter = new Converter(req.query, {}, true)
    converter.convert('streams').toArray()
    converter.convert('last_audio').optional().toBoolean()
    converter.convert('include_hardware').optional().toBoolean()
    converter.convert('include_last_sync').optional().toBoolean()
    converter.convert('is_visible').optional().toBoolean()
    converter.convert('offset').default(0).toInt()
    converter.convert('limit').default(100).toInt()

    return converter.validate()
      .then(params => {
        const { streams, limit, offset, lastAudio, isVisible, includeLastSync, includeHardware } = params
        const where = {
          stream_id: {
            [models.Sequelize.Op.in]: streams
          },
          ...isVisible !== undefined ? { is_visible: isVisible === 'true' } : {}
        }
        const options = {
          readableBy: user && (user.is_super || user.has_system_role || user.has_stream_token) ? undefined : user.id,
          where,
          order: [['last_check_in', 'DESC']],
          limit,
          offset,
          lastAudio,
          includeLastSync,
          includeHardware
        }
        return guardiansService.listMonitoringData(options)
      })
      .then(dbGuardian => res.status(200).json(views.models.guardian(req, res, dbGuardian)))
      .catch(httpErrorHandler(req, res, 'Failed getting guardians'))
  })

router.get('/:id', (req, res) => {
  const streamId = req.params.id
  getGuardianInfoByStreamId(streamId)
    .then(data => res.json(data))
    .catch(httpErrorHandler(req, res, 'Not found'))
})

module.exports = router
