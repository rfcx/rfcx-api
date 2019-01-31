var models = require("../../models");
var sequelize = require("sequelize");

function getSiteByGuid(guid, ignoreMissing) {
  return models.GuardianSite
    .findOne({
      where: { guid: guid }
    })
    .then((site) => {
      if (!site && !ignoreMissing) {
        throw new sequelize.EmptyResultError('Site with given guid not found.');
      }
      return site;
    });
}

function getSitesByGuids(guids, ignoreMissing) {
  let proms = [];
  (guids || []).forEach((guid) => {
    proms.push(getSiteByGuid(guid, ignoreMissing))
  });
  return Promise.all(proms);
}

module.exports = {
  getSiteByGuid,
  getSitesByGuids,
}
