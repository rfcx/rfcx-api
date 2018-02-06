var models = require("../../models");
var sequelize = require("sequelize");
var Converter = require("../../utils/converter/converter");
var Promise = require("bluebird");
var sitesService = require("../sites/sites-service");
const sensationsService = require('..//sensations/sensations-service');
const token = require("../..//utils/internal-rfcx/token.js").token;
const hash = require('../../utils/misc/hash').hash;

function getUserByParams(params) {
  return models.User
    .findOne({
      where: params,
      include: [{ all: true }]
    });
}

function getUserByGuid(guid) {
  return getUserByParams({ guid })
    .then((user) => {
      if (!user) { throw new sequelize.EmptyResultError('User with given guid not found.'); }
      return user;
    });
}

function getUserByEmail(email) {
  return getUserByParams({ email })
    .then((user) => {
      if (!user) { throw new sequelize.EmptyResultError('User with given email not found.'); }
      return user;
    });
}

function getAllUsers() {
  return models.User
    .findAll({
      include: [{ all: true }]
    });
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

function refreshLastLogin(user) {
  user.last_login_at = new Date();
  return user.save();
}

function refreshLastToken(user, tokenInfo) {
  user.VisibleToken = {
    token: tokenInfo.token,
    token_expires_at: tokenInfo.token_expires_at,
  };
  return true;
}

function createLoginToken(opts) {
  return token.createUserToken({
    token_type: 'login',
    created_by: opts.urlPath,
    reference_tag: opts.user.guid,
    owner_primary_key: opts.user.id,
    minutes_until_expiration: opts.expires,
  });
}

function createUser(opts) {
  const pswd = hash.randomString(20);
  console.log('\n\npassword!!!', pswd, '\n\n');
  const password_salt = hash.randomHash(320);

  return models.User
    .create({
      type: 'user',
      firstname: opts.firstname || null,
      lastname: opts.lastname || null,
      email: opts.email.toLowerCase(),
      auth_password_salt: password_salt,
      auth_password_hash: hash.hashedCredentials(password_salt, pswd),
      auth_password_updated_at: new Date(),
    });
}

module.exports = {
  getUserByGuid: getUserByGuid,
  getUserByEmail: getUserByEmail,
  getAllUsers: getAllUsers,
  formatUser: formatUser,
  formatUsers: formatUsers,
  updateSiteRelations: updateSiteRelations,
  updateUserInfo: updateUserInfo,
  getUserLastCheckin: getUserLastCheckin,
  formatCheckin: formatCheckin,
  refreshLastLogin: refreshLastLogin,
  refreshLastToken: refreshLastToken,
  createLoginToken: createLoginToken,
  createUser: createUser,
};
