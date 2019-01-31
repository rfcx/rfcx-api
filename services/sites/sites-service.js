var models = require("../../models");
var sequelize = require("sequelize");

function getSiteByGuid(guid) {
  return models.GuardianSite
    .findOne({
      where: { guid: guid }
    })
    .then((site) => {
      if (!site) {
        throw new sequelize.EmptyResultError('Site with given guid not found.');
      }
      return site;
    });
}

module.exports = {
  getSiteByGuid,
}
