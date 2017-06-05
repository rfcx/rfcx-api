var models = require("../../models");
var sequelize = require("sequelize");
var Converter = require("../../utils/converter/converter");
var Promise = require("bluebird");
var sitesService = require("../sites/sites-service");

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
    .findAll({
      include: [{ all: true }]
    });
}

function formatUser(user) {
  let userFormatted = {
    guid: user.guid,
    email: user.email,
    firstname: user.firstname,
    lastname: user.lastname,
    username: user.username,
    accessibleSites: [],
    defaultSite: user.DefaultSite? user.DefaultSite.guid : null
  };
  if (user.GuardianSites) {
    user.GuardianSites.forEach((site) => {
      userFormatted.accessibleSites.push(site.guid);
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

function updateDefaultSite(user, siteGuid) {
  return sitesService.getSiteByGuid(siteGuid)
    .then(function(site) {
      return user.update({
        default_site: site.id
      });
    })
    .then(() => {
      return getUserByGuid(user.guid);
    })
    .then(formatUser);
}

function updateUserInfo(user, params) {
  // only one attribute for now...
  // when there will be more attributes, we need to update logic of this function
  if (params.defaultSite) {
    return updateDefaultSite(user, params.defaultSite);
  }
  return getUserByGuid(user.guid)
    .then(formatUser);
}

module.exports = {
  getUserByGuid: getUserByGuid,
  getAllUsers: getAllUsers,
  formatUser: formatUser,
  formatUsers: formatUsers,
  updateSiteRelations: updateSiteRelations,
  updateUserInfo: updateUserInfo,
};
