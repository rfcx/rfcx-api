const models = require("../../models");
const EmptyResultError = require('../../utils/converter/empty-result-error');
const Promise = require('bluebird');

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

module.exports = {
  getGuardianByGuid,
  getGuardiansByGuids,
  formatGuardian,
  formatGuardians,
  formatGuardianPublic,
  formatGuardiansPublic,
  updateGuardian,
}
