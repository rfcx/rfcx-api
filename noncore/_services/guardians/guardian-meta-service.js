const models = require('../../_models')
const { EmptyResultError } = require('../../../common/error-handling/errors')

function getGuardianByStreamId (id, ignoreMissing) {
  return models.Guardian
    .findOne({
      where: { stream_id: id },
      include: [
        { model: models.GuardianSite, as: 'Site' }
      ]
    })
    .then((item) => {
      if (!item && !ignoreMissing) {
        throw new EmptyResultError('Guardian with given stream id not found.')
      }
      return item
    })
}

async function getDeploymentMeta (streamId) {
  const guardian = await getGuardianByStreamId(streamId)
  const where = { guardian_id: guardian.id, pref_key: 'api_protocol_escalation_order' }
  const pref = await models.GuardianSoftwarePrefs.findOne({ where })
  const type = !pref ? 'unknown' : (pref.pref_value.includes('sat') ? 'satellite' : 'cell')
  return { guardian_guid: guardian.guid, deployed_at: guardian.deployed_at, type }
}

module.exports = { getDeploymentMeta }
