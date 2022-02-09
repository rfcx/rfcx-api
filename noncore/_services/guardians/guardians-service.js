const models = require('../../_models')
const { EmptyResultError } = require('../../../common/error-handling/errors')
const Promise = require('bluebird')
const { hashedCredentials } = require('../../../common/crypto/sha256')
const random = require('../../../common/crypto/random')

function getGuardianByGuid (guid, ignoreMissing) {
  return models.Guardian
    .findOne({
      where: { guid: guid },
      include: [{ all: true }]
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
    stream_id: guardian.stream_id
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
  const allowedAttrs = ['shortname', 'latitude', 'longitude', 'is_visible', 'stream_id', 'last_deployed']
  allowedAttrs.forEach((allowedAttr) => {
    if (attrs[allowedAttr] !== undefined) {
      guardian[allowedAttr] = attrs[allowedAttr]
    }
  })
  const transaction = options.transaction || null
  return guardian.save({ transaction })
    .then(() => {
      return guardian.reload({ include: [{ all: true }], transaction })
    })
}

async function createGuardian (attrs) {
  const guardianAttrs = {
    guid: attrs.guid,
    creator: (attrs.creator_id != null) ? attrs.creator_id : null
  }
  const [dbGuardian, dbGuardianCreated] = await models.Guardian.findOrCreate({ where: guardianAttrs }) // eslint-disable-line no-unused-vars

  dbGuardian.shortname = attrs.shortname ? attrs.shortname : `RFCx Guardian (${attrs.guid.substr(0, 6).toUpperCase()})`

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
  getGuardianByGuid,
  getGuardiansByGuids,
  formatGuardian,
  formatGuardians,
  formatGuardianPublic,
  formatGuardiansPublic,
  updateGuardian,
  createGuardian
}
