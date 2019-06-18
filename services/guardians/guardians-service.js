const models = require("../../models");
const EmptyResultError = require('../../utils/converter/empty-result-error');
const Promise = require('bluebird');

function getGuardianByGuid(guid, ignoreMissing) {
  return models.Guardian
    .findOne({
      where: { guid: guid }
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
  return new Promise((resolve, reject) => {
    let guardianFormatted = {
      guid: guardian.guid,
      shortname: guardian.shortname,
      latitude: guardian.latitude,
      longitude: guardian.longitude,
      notes: guardian.notes,
      phone_number: guardian.phone_number,
      user: guardian.User?
        {
          firstname: guardian.User.firstname,
          lastname: guardian.User.lastname,
          guid: guardian.User.guid,
          email: guardian.User.guid.email
        } : null,
      site: guardian.Site?
        {
          guid: guardian.Site.guid,
          name: guardian.Site.name,
          timezone: guardian.Site.timezone,
        } : null,
    };
    resolve(guardianFormatted);
  });
}

function formatGuardians(guardians) {
  return guardians.map((guardian) => {
    return formatGuardian(guardian);
  });
}

module.exports = {
  getGuardianByGuid,
  getGuardiansByGuids,
  formatGuardian,
  formatGuardians,
}
