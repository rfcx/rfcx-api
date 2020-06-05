const models = require("../../models");
const EmptyResultError = require('../../utils/converter/empty-result-error');
const Promise = require('bluebird');
var hash = require("../../utils/misc/hash.js").hash;

function getGuardianByGuid(guid, ignoreMissing) {
  return models.Guardian
    .findOne({
      where: { guid: guid },
      include: [{ all: true }],
    })
    .then((item) => {
      if (!item && !ignoreMissing) {
        throw new EmptyResultError('Guardian with given guid not found.');
      }
      return item;
    });
}

function getGuardiansByGuids(guids, ignoreMissing) {
  let proms = [];
  (guids || []).forEach((guid) => {
    proms.push(getGuardianByGuid(guid, ignoreMissing))
  });
  return Promise.all(proms);
}

function formatGuardian(guardian) {
  let guardianFormatted = {
    guid: guardian.guid,
    shortname: guardian.shortname,
    latitude: guardian.latitude,
    longitude: guardian.longitude,
    notes: guardian.notes,
    phone_number: guardian.phone_number,
    is_visible: guardian.is_visible,
    user: guardian.User?
      {
        firstname: guardian.User.firstname,
        lastname: guardian.User.lastname,
        guid: guardian.User.guid,
        email: guardian.User.email
      } : null,
    site: guardian.Site?
      {
        guid: guardian.Site.guid,
        name: guardian.Site.name,
        timezone: guardian.Site.timezone,
      } : null,
  };
  return guardianFormatted;
}

function formatGuardians(guardians) {
  return guardians.map((guardian) => {
    return formatGuardian(guardian);
  });
}

function formatGuardianPublic(guardian) {
  return {
    guid: guardian.guid,
    shortname: guardian.shortname,
    latitude: guardian.latitude,
    longitude: guardian.longitude,
    site: guardian.Site?
      {
        guid: guardian.Site.guid,
        name: guardian.Site.name,
        timezone: guardian.Site.timezone,
      } : null,
  };
}

function formatGuardiansPublic(guardians) {
  return guardians.map((guardian) => {
    return formatGuardianPublic(guardian);
  });
}

function updateGuardian(guardian, attrs) {
  let allowedAttrs = ['shortname', 'latitude', 'longitude', 'is_visible'];
  allowedAttrs.forEach((allowedAttr) => {
    if (attrs[allowedAttr] !== undefined) {
      guardian[allowedAttr] = attrs[allowedAttr];
    }
  });
  return guardian.save()
    .then(() => {
      return guardian.reload({ include: [{ all: true }] });
    });
}

async function createGuardian(attrs) {
  const guardianAttrs = {
    guid: attrs.guid,
    shortname: attrs.shortname? attrs.shortname : `RFCx Guardian (${attrs.guid.substr(0,6).toUpperCase()})`,
    latitude: attrs.latitude || 0,
    longitude: attrs.longitude || 0
  }
  let [dbGuardian, dbGuardianCreated] = await models.Guardian.findOrCreate({ where: guardianAttrs });

  const token_salt = hash.randomHash(320);
  dbGuardian.auth_token_salt = token_salt;
  dbGuardian.auth_token_hash = hash.hashedCredentials(token_salt, attrs.token);
  dbGuardian.auth_token_updated_at = new Date();
  dbGuardian.site_id = attrs.site_id || 1;
  if (attrs.creator_id) {
    dbGuardian.creator = attrs.creator_id;
  }
  if (attrs.is_private !== undefined) {
    dbGuardian.is_private = attrs.is_private;
  }
  return dbGuardian.save();
}

module.exports = {
  getGuardianByGuid,
  getGuardiansByGuids,
  formatGuardian,
  formatGuardians,
  formatGuardianPublic,
  formatGuardiansPublic,
  updateGuardian,
  createGuardian,
}
