const models = require('../../models')
const EmptyResultError = require('../../utils/converter/empty-result-error')
const Promise = require('bluebird')
const hash = require('../../utils/misc/hash')

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
      : null
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

function updateGuardian (guardian, attrs) {
  const allowedAttrs = ['shortname', 'latitude', 'longitude', 'is_visible']
  allowedAttrs.forEach((allowedAttr) => {
    if (attrs[allowedAttr] !== undefined) {
      guardian[allowedAttr] = attrs[allowedAttr]
    }
  })
  return guardian.save()
    .then(() => {
      return guardian.reload({ include: [{ all: true }] })
    })
}

async function createGuardian (attrs) {
  const guardianAttrs = {
    guid: attrs.guid,
    creator: (attrs.creator_id != null) ? attrs.creator_id : null
  }
  const [dbGuardian, dbGuardianCreated] = await models.Guardian.findOrCreate({ where: guardianAttrs }) // eslint-disable-line no-unused-vars

  dbGuardian.shortname = attrs.shortname ? attrs.shortname : `RFCx Guardian (${attrs.guid.substr(0, 6).toUpperCase()})`

  const tokenSalt = hash.randomHash(320)
  dbGuardian.auth_token_salt = tokenSalt
  dbGuardian.auth_token_hash = hash.hashedCredentials(tokenSalt, attrs.token)
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
