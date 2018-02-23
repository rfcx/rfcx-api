var models = require("../../models");
var sequelize = require("sequelize");
var Converter = require("../../utils/converter/converter");
var Promise = require("bluebird");
var sitesService = require("../sites/sites-service");
const hash = require('../../utils/misc/hash').hash;
const guid = require('../../utils/misc/guid');
const sensationsService = require('..//sensations/sensations-service');

function getUserByParams(params) {
  return models.User
    .findOne({
      where: params,
      include: [{ all: true }]
    })
    .then((user) => {
      if (!user) { throw new sequelize.EmptyResultError('User with given guid not found.'); }
      return user;
    });
}

function getUserByGuid(guid) {
  return this.getUserByParams({ guid });
}

function getUserByEmail(email) {
  return this.getUserByParams({ email });
}

function getAllUsers() {
  return models.User
    .findAll({
      include: [{ all: true }]
    });
}

function refreshLastLogin(user) {
  user.last_login_at = new Date();
  return user.save()
             .then(() => {
               return user.reload({ include: [{ all: true }] });
             });
}

function createUser(opts) {
  let data = combineNewUserData(opts);
  return models.User
    .create(data)
    .then(user => {
      return user.reload({ include: [{ all: true }] });
    });
}

function findOrCreateUser(where, defaults) {
  let data = combineNewUserData(defaults);
  return models.User
    .findOrCreate({
      where: where,
      defaults: data,
    })
    .bind({})
    .spread((user, created) => {
      this.created = created;
      return user.reload({ include: [{ all: true }] });
    })
    .then(user => {
      return [user, this.created];
    })
}

function combineNewUserData(opts) {
  let passwordData = getPasswordData(opts.password);
  return {
    guid: opts.guid || guid.generate(),
    type: 'user',
    firstname: opts.firstname || '',
    lastname: opts.lastname || '',
    email: opts.email,
    auth_password_salt: passwordData.auth_password_salt,
    auth_password_hash: passwordData.auth_password_hash,
    auth_password_updated_at: passwordData.auth_password_updated_at,
    rfcx_system: (opts.rfcx_system !== undefined? opts.rfcx_system : false),
  };
}

function getPasswordData(password) {
  password = password || hash.randomString(50);
  let password_salt = hash.randomHash(320);
  return {
    auth_password_salt: password_salt,
    auth_password_hash: hash.hashedCredentials(password_salt, password),
    auth_password_updated_at: new Date()
  };
}

function formatUser(user, short) {
  short = (short === undefined? false : short);
  let userFormatted = {
    guid: user.guid,
    email: user.email,
    firstname: user.firstname,
    lastname: user.lastname,
    username: user.username,
  };
  if (!short) {
    userFormatted.accessibleSites = [];
    userFormatted.defaultSite = user.DefaultSite? user.DefaultSite.guid : null;
    if (user.GuardianSites) {
      user.GuardianSites.forEach((site) => {
        userFormatted.accessibleSites.push(site.guid);
      });
    }
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

function getUserLastCheckin(user) {
  return sensationsService.getLastCheckinByUserId(user.id)
    .then(data => {
      if (data.length) {
        data[0].user = this.formatUser(user, true);
      }
      return data;
    });
}

function formatCheckin(checkin) {
  return {
    latitude: checkin.location.coordinates[0],
    longitude: checkin.location.coordinates[1],
    user: checkin.user,
  };
}

module.exports = {
  getUserByParams,
  getUserByGuid,
  getUserByEmail,
  getAllUsers,
  createUser,
  findOrCreateUser,
  refreshLastLogin,
  formatUser,
  formatUsers,
  updateSiteRelations,
  updateUserInfo,
  getUserLastCheckin,
  formatCheckin,
};
