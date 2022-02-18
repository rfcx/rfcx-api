const router = require('express').Router()
const guardiansService = require('../../_services/guardians/guardians-service')
const { GuardianSoftwarePrefs } = require('../../_models')
const { httpErrorHandler } = require('../../../common/error-handling/http')

router.get('/:id', (req, res) => {
  const streamId = req.params.id

  guardiansService.getGuardianByStreamId(streamId).then(async (guardian) => {
    const where = { guardian_id: guardian.id, pref_key: 'api_protocol_escalation_order' }
    const pref = await GuardianSoftwarePrefs.findOne({ where })
    const type = !pref ? 'unknown' : (pref.pref_value.includes('sat') ? 'satellite' : 'cell')
    res.json({ guardian_guid: guardian.guid, deployed_at: guardian.deployed_at, type })
  }).catch(httpErrorHandler(req, res, 'Not found'))
})

module.exports = router
