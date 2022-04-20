const models = require('../../_models')
const { EmptyResultError } = require('../../../common/error-handling/errors')
const Promise = require('bluebird')
const { hashedCredentials } = require('../../../common/crypto/sha256')
const random = require('../../../common/crypto/random')
const { hasPermission, READ, PROJECT } = require('../../../core/roles/dao')

function getGuardianByGuid (guid, ignoreMissing) {
  return models.Guardian
    .findOne({
      where: { guid: guid },
      // TODO: make includes editable if needed later
      include: [
        { model: models.GuardianSite, as: 'Site' }
      ]
    })
    .then((item) => {
      if (!item && !ignoreMissing) {
        throw new EmptyResultError('Guardian with given guid not found.')
      }
      return item
    })
}

function getGuardiansByGuids (guids, ignoreMissing) {
  const proms = [];
  (guids || []).forEach((guid) => {
    proms.push(getGuardianByGuid(guid, ignoreMissing))
  })
  return Promise.all(proms)
}

function getGuardianByStreamId (id, ignoreMissing) {
  return models.Guardian
    .findOne({
      where: { stream_id: id },
      // TODO: make includes editable if needed later
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

async function list (options = {}) {
  const { where, order, limit, offset } = options
  return await models.Guardian.findAll({ where, order, limit, offset })
}

async function getLastAudio (id) {
  return await models.GuardianAudio
    .findOne({
      order: [['measured_at', 'DESC']],
      where: { guardian_id: id }
    })
}

async function getGuardianMetaHardware (id) {
  return await models.GuardianMetaHardware
    .findOne({
      where: { guardian_id: id },
      attributes: ['phone_imei', 'phone_sim_number', 'phone_sim_serial']
    })
}

async function getGuardianMetaBattery (id) {
  return await models.GuardianMetaBattery
    .findOne({
      where: {
        guardian_id: id,
        measured_at: { [models.Sequelize.Op.gt]: Date.now() - 604800000 }
      },
      order: [['measured_at', 'DESC']]
    })
}

async function getGuardianMetaSentinelPower (id) {
  return await models.GuardianMetaSentinelPower
    .findOne({
      where: {
        guardian_id: id,
        measured_at: { [models.Sequelize.Op.gt]: Date.now() - 604800000 }
      },
      order: [['measured_at', 'DESC']]
    })
}

async function checkUserPermissions (guardians, userId) {
  if (!userId) {
    return
  }
  const g = guardians.filter(async (guardian) => {
    const projectId = guardian.project_id
    if (!projectId) {
      return true
    }
    return await hasPermission(READ, userId, projectId, PROJECT)
  })
  return g
}

async function listMonitoringData (options = {}) {
  let guardians = await list(options)
  if (!guardians.length) {
    return []
  }
  guardians = await checkUserPermissions(guardians, options.readableBy)
  if (!guardians.length) {
    return []
  }
  if (options.lastAudio === true) {
    for (const guardian of guardians) {
      const audio = await getLastAudio(guardian.id)
      guardian.last_audio = {
        guid: (audio && audio.guid) || null,
        measured_at: (audio && audio.measured_at) || null
      }
    }
  }
  if (options.includeHardware === true) {
    for (const guardian of guardians) {
      const hardware = await getGuardianMetaHardware(guardian.id)
      guardian.phone_imei = (hardware && hardware.phone_imei) || null
      guardian.phone_sim_number = (hardware && hardware.phone_sim_number) || null
      guardian.phone_sim_serial = (hardware && hardware.phone_sim_serial) || null
    }
  }
  if (options.includeLastSync === true) {
    for (const guardian of guardians) {
      guardian.last_sync = guardian.last_ping
      const metaBattery = await getGuardianMetaBattery(guardian.id)
      guardian.battery_percent_internal = (metaBattery && metaBattery.battery_percent) || null
      const metaPower = await getGuardianMetaSentinelPower(guardian.id)
      guardian.battery_percent = (metaPower && metaPower.battery_state_of_charge) || null
    }
  }
  return guardians
}

async function getGuardianInfoByStreamId (streamId) {
  const guardian = await getGuardianByStreamId(streamId)
  const where = { guardian_id: guardian.id, pref_key: 'api_protocol_escalation_order' }
  const pref = await models.GuardianSoftwarePrefs.findOne({ where })
  const type = !pref ? 'unknown' : (pref.pref_value.includes('sat') ? 'satellite' : 'cell')
  return { guardian_guid: guardian.guid, deployed_at: guardian.deployed_at, type }
}

function formatGuardian (guardian) {
  const guardianFormatted = {
    guid: guardian.guid,
    shortname: guardian.shortname,
    latitude: guardian.latitude,
    longitude: guardian.longitude,
    notes: guardian.notes,
    phone_number: guardian.phone_number,
    is_visible: guardian.is_visible,
    user: guardian.User
      ? {
          firstname: guardian.User.firstname,
          lastname: guardian.User.lastname,
          guid: guardian.User.guid,
          email: guardian.User.email
        }
      : null,
    site: guardian.Site
      ? {
          guid: guardian.Site.guid,
          name: guardian.Site.name,
          timezone: guardian.Site.timezone
        }
      : null,
    stream_id: guardian.stream_id,
    project_id: guardian.project_id,
    timezone: guardian.timezone
  }
  return guardianFormatted
}

function formatGuardians (guardians) {
  return guardians.map((guardian) => {
    return formatGuardian(guardian)
  })
}

function formatGuardianPublic (guardian) {
  return {
    guid: guardian.guid,
    shortname: guardian.shortname,
    latitude: guardian.latitude,
    longitude: guardian.longitude,
    site: guardian.Site
      ? {
          guid: guardian.Site.guid,
          name: guardian.Site.name,
          timezone: guardian.Site.timezone
        }
      : null
  }
}

function formatGuardiansPublic (guardians) {
  return guardians.map((guardian) => {
    return formatGuardianPublic(guardian)
  })
}

function updateGuardian (guardian, attrs, options = {}) {
  const allowedAttrs = ['shortname', 'latitude', 'longitude', 'is_visible', 'stream_id', 'project_id', 'last_deployed', 'timezone']
  allowedAttrs.forEach((allowedAttr) => {
    if (attrs[allowedAttr] !== undefined) {
      guardian[allowedAttr] = attrs[allowedAttr]
    }
  })
  const transaction = options.transaction || null
  return guardian.save({ transaction })
    .then(() => {
      return guardian.reload({ include: [{ model: models.GuardianSite, as: 'Site' }], transaction })
    })
}

async function createGuardian (attrs) {
  const guardianAttrs = {
    guid: attrs.guid,
    creator: (attrs.creator_id != null) ? attrs.creator_id : null
  }
  const [dbGuardian, dbGuardianCreated] = await models.Guardian.findOrCreate({ where: guardianAttrs }) // eslint-disable-line no-unused-vars

  dbGuardian.shortname = attrs.shortname ? attrs.shortname : `X New Device (${attrs.guid.substr(0, 6).toUpperCase()})`

  const tokenSalt = random.randomString(62)
  dbGuardian.auth_token_salt = tokenSalt
  dbGuardian.auth_token_hash = hashedCredentials(tokenSalt, attrs.token)
  dbGuardian.auth_token_updated_at = new Date()
  dbGuardian.auth_pin_code = attrs.pinCode
  dbGuardian.site_id = attrs.site_id || 1
  if (attrs.is_private !== undefined) {
    dbGuardian.is_private = attrs.is_private
  }
  return dbGuardian.save()
}

module.exports = {
  list,
  listMonitoringData,
  getGuardianByGuid,
  getGuardiansByGuids,
  getGuardianByStreamId,
  getGuardianInfoByStreamId,
  formatGuardian,
  formatGuardians,
  formatGuardianPublic,
  formatGuardiansPublic,
  updateGuardian,
  createGuardian
}
