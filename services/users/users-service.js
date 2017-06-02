var models = require("../../models");
var sequelize = require("sequelize");
var Converter = require("../../utils/converter/converter");
var Promise = require("bluebird");

function getUserByGuid(guid) {
  return models.User
    .findOne({
      where: { guid: guid },
      include: [{ all: true }]
    })
    .then((user) => {
      if (!user) {
        throw new sequelize.EmptyResultError('User with given guid not found.');
      }
      return user;
    });
}

function getAllUsers() {
  return models.User
    .findAll();
}

function formatUser(user) {
  let userFormatted = {
    guid: user.guid,
    email: user.email,
    firstname: user.firstname,
    lastname: user.lastname,
    username: user.username,
    accesibleSites: [],
  };
  if (user.GuardianSites) {
    user.GuardianSites.forEach((site) => {
      userFormatted.accesibleSites.push(site.guid);
    });
  }
  return userFormatted;
}

function formatUsers(users) {
  return users.map((user) => {
    return formatUser(user);
  });
}

function validateSiteRelationsParams(params) {
  params = new Converter(params);
  params.convert('sites').toArray();
  return params.validate();
};

function getAllSitesByGuids(sites) {
  let proms = [];
  sites.forEach((site) => {
    const prom = models.GuardianSite
      .findOne({ where: { guid: site } })
      .then((user) => {
        if (!user) { throw new sequelize.EmptyResultError('Site with given guid not found: ' + site); }
        return user;
      });
    proms.push(prom);
  });
  return Promise.all(proms);
}

// remove all relations from this user to any sites
function clearSitesRelationsForUser(user) {
  return models.UserSiteRelation.destroy({ where: { user_id: user.id } });
}

function attachSitesToUser(sites, user) {
  let proms = [];
  sites.forEach(site => {
    let prom = user.addGuardianSite(site);
    proms.push(prom);
  });
  return Promise.all(proms);
}

function updateSiteRelations(user, params) {
  return validateSiteRelationsParams(params)
    .bind({})
    .then(data => {
      return getAllSitesByGuids(data.sites);
    })
    .then(sites => {
      this.sites = sites;
      return clearSitesRelationsForUser(user);
    })
    .then(sites => {
      return attachSitesToUser(this.sites, user);
    })
    .then(() => {
      return getUserByGuid(user.guid);
    })
    .then(formatUser);
}

module.exports = {
  getUserByGuid: getUserByGuid,
  getAllUsers: getAllUsers,
  formatUser: formatUser,
  formatUsers: formatUsers,
  updateSiteRelations: updateSiteRelations,
};
