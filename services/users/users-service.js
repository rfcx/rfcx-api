var models = require("../../models");
var sequelize = require("sequelize");
var Converter = require("../../utils/converter/converter");
var Promise = require("bluebird");
var sitesService = require("../sites/sites-service");
const util = require('util');
const request = require('request');
const hash = require('../../utils/misc/hash').hash;
const guid = require('../../utils/misc/guid');
const sensationsService = require('..//sensations/sensations-service');
const moment = require("moment-timezone");
const ValidationError = require('../../utils/converter/validation-error');
const sqlUtils = require("../../utils/misc/sql");

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
  return getUserByParams({ guid });
}

function getUserByEmail(email) {
  return getUserByParams({ email });
}

function getUserByGuidOrEmail(field1, field2) {
  field2 = field2 || field1;
  return getUserByParams({
    $or: {
      guid: field1,
      email: field2
    }
  });
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

function removeUserByGuidFromMySQL(opts) {
  return models.User
    .destroy({ where: { guid: opts.guid } });
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

function updateMySQLUserPassword(password, guid) {
  return getUserByGuid(guid)
    .then((user) => {
      let passwordData = getPasswordData(password);
      user.auth_password_salt = passwordData.auth_password_salt;
      user.auth_password_hash = passwordData.auth_password_hash;
      user.auth_password_updated_at = passwordData.auth_password_updated_at;
      return user.save();
    })
    .then((user) => {
      return user.reload({ include: [{ all: true }] });
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
    rfcx_system: user.rfcx_system,
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
  let proms = [];
  if (params.rfcx_system !== undefined) {
    proms.push(user.update({ rfcx_system: params.rfcx_system }));
  }
  if (params.defaultSite) {
    proms.push(updateDefaultSite(user, params.defaultSite));
  }
  return Promise.all(proms)
    .then(() => {
      return getUserByGuid(user.guid)
    })
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

function createUserLocation(data) {
  return models.UserLocation.create(data);
}

function createUserLocations(data) {
  return models.UserLocation.bulkCreate(data, { validate: true });
}

function getLocations(req) {

  let dir = 'DESC';
  if (req.query.dir && ['ASC', 'DESC'].indexOf(req.query.dir.toUpperCase()) !== -1) {
    dir = req.query.dir.toUpperCase();
  }

  let opts = {
    limit: req.query.limit? parseInt(req.query.limit) : 10000,
    offset: req.query.offset? parseInt(req.query.offset) : 0,
    afterTime: req.query.after_time,
    beforeTime: req.query.before_time,
    afterLocalTime: req.query.after_local_time,
    beforeLocalTime: req.query.before_local_time,
    dayTimeLocalAfter: req.query.daytime_local_after,
    dayTimeLocalBefore: req.query.daytime_local_before,
    weekdays: req.query.weekdays !== undefined? (Array.isArray(req.query.weekdays)? req.query.weekdays : [req.query.weekdays]) : undefined,
    users: req.query.users? (Array.isArray(req.query.users)? req.query.users : [req.query.users]) : undefined,
    sites: req.query.sites? (Array.isArray(req.query.sites)? req.query.sites : [req.query.sites]) : undefined,
    order: 'Location.time',
    dir: dir,
  };

  let sql = `SELECT Location.latitude, Location.longitude, Location.time,
                    User.firstname, User.lastname, User.email, User.guid as user_guid,
                    DefaultSite.guid as site_guid, DefaultSite.timezone as site_timezone
             FROM UserLocations AS Location
             LEFT JOIN Users AS User ON Location.user_id = User.id
             LEFT JOIN GuardianSites AS DefaultSite ON User.default_site = DefaultSite.id`;

  sql = sqlUtils.condAdd(sql, true, ' WHERE 1=1');
  sql = sqlUtils.condAdd(sql, opts.afterTime, ' AND Location.time > :afterTime');
  sql = sqlUtils.condAdd(sql, opts.beforeTime, ' AND Location.time < :beforeTime');
  sql = sqlUtils.condAdd(sql, opts.afterLocalTime, ' AND Location.time > DATE_SUB(:afterLocalTime, INTERVAL 12 HOUR)');
  sql = sqlUtils.condAdd(sql, opts.beforeLocalTime, ' AND Location.time < DATE_ADD(:beforeLocalTime, INTERVAL 14 HOUR)');
  sql = sqlUtils.condAdd(sql, opts.users, ' AND User.guid IN (:users)');
  sql = sqlUtils.condAdd(sql, opts.sites, ' AND DefaultSite.guid IN (:sites)');
  sql = sqlUtils.condAdd(sql, opts.order, ' ORDER BY ' + opts.order + ' ' + opts.dir);
  sql = sqlUtils.condAdd(sql, true, ' LIMIT :limit OFFSET :offset');

  return models.sequelize
    .query(sql,
      { replacements: opts, type: models.sequelize.QueryTypes.SELECT }
    )
    .then((locations) => {
      return filterWithTz(opts, locations);
    });

}

function filterWithTz(opts, locations) {
  if (!opts.afterLocalTime && !opts.beforeLocalTime) {
    return locations;
  }
  return locations.filter((location) => {
    let timeTz = moment.tz(location.time, location.site_timezone);

    if (opts.afterLocalTime) {
      if (timeTz < moment.tz(opts.afterLocalTime, location.site_timezone)) {
        return false;
      }
    }
    if (opts.beforeLocalTime) {
      if (timeTz > moment.tz(opts.beforeLocalTime, location.site_timezone)) {
        return false;
      }
    }
    if (opts.weekdays) { // we receive an array like ['0', '1', '2', '3', '4', '5', '6'], where `0` means Monday
      // momentjs by default starts day with Sunday, so we will get ISO weekday
      // (which starts from Monday, but is 1..7) and subtract 1
      if ( !opts.weekdays.includes( `${parseInt(timeTz.format('E')) - 1}` ) ) {
        return false;
      }
    }
    if (opts.dayTimeLocalAfter && opts.dayTimeLocalBefore && opts.dayTimeLocalBefore > opts.dayTimeLocalAfter) {
      if (timeTz.format('HH:mm:ss') < opts.dayTimeLocalAfter || timeTz.format('HH:mm:ss') >= opts.dayTimeLocalBefore) {
        return false;
      }
    }
    if (opts.dayTimeLocalAfter && opts.dayTimeLocalBefore && opts.dayTimeLocalAfter > opts.dayTimeLocalBefore) {
      if (timeTz.format('HH:mm:ss') <= opts.dayTimeLocalAfter && timeTz.format('HH:mm:ss') >= opts.dayTimeLocalBefore) {
        return false;
      }
    }
    if (opts.dayTimeLocalAfter && !opts.dayTimeLocalBefore) {
      if (timeTz.format('HH:mm:ss') <= opts.dayTimeLocalAfter) {
        return false;
      }
    }
    if (!opts.dayTimeLocalAfter && opts.dayTimeLocalBefore) {
      if (timeTz.format('HH:mm:ss') >= opts.dayTimeLocalBefore) {
        return false;
      }
    }
    return true;
  });
}

module.exports = {
  getUserByParams,
  getUserByGuid,
  getUserByEmail,
  getUserByGuidOrEmail,
  getAllUsers,
  createUser,
  findOrCreateUser,
  refreshLastLogin,
  formatUser,
  formatUsers,
  updateSiteRelations,
  updateDefaultSite,
  updateUserInfo,
  getUserLastCheckin,
  formatCheckin,
  createUserLocation,
  createUserLocations,
  getLocations,
  removeUserByGuidFromMySQL,
  updateMySQLUserPassword,
};
