var models = require('../../models')
var sequelize = require('sequelize')
var Converter = require('../../utils/converter/converter')
var Promise = require('bluebird')
var sitesService = require('../sites/sites-service')
const hash = require('../../utils/misc/hash').hash
const guid = require('../../utils/misc/guid')
const sensationsService = require('../sensations/sensations-service')
const moment = require('moment-timezone')
const ValidationError = require('../../utils/converter/validation-error')
const ForbiddenError = require('../../utils/converter/forbidden-error')
const sqlUtils = require('../../utils/misc/sql')
var S3Service = require('../s3/s3-service')
const pathCompleteExtname = require('path-complete-extname')
var probe = require('probe-image-size')
var fs = require('fs')

const unsubscriptionSalt = 'you_will_never_guess_this_salt'

function getUserByParams (params, ignoreMissing) {
  return models.User
    .findOne({
      where: params,
      include: [{ all: true }]
    })
    .then((user) => {
      if (!user && !ignoreMissing) { throw new sequelize.EmptyResultError('User with given guid not found.') }
      return user
    })
}

function getUserByGuid (guid, ignoreMissing) {
  return getUserByParams({ guid }, ignoreMissing)
}

function getUserByEmail (email, ignoreMissing) {
  return getUserByParams({ email: email }, ignoreMissing)
}

function getUserByGuidOrEmail (field1, field2) {
  field2 = field2 || field1
  return getUserByParams({
    [models.Sequelize.Op.or]: {
      guid: field1,
      email: field2
    }
  })
}

function getUserFromTokenInfo (authTokenInfo) {
  if (!authTokenInfo || authTokenInfo.userType !== 'auth0') {
    return Promise.resolve(null)
  } else {
    return getUserByGuid(authTokenInfo.guid)
  }
}

function getUserBySubscriptionEmail (email, ignoreMissing) {
  return models.User
    .findOne({
      where: {
        [models.Sequelize.Op.or]: {
          subscription_email: email,
          email
        }
      },
      include: [{ all: true }]
    })
    .then((user) => {
      if (!user && !ignoreMissing) { throw new sequelize.EmptyResultError('User with given guid not found.') }
      return user
    })
}

function getAllUsers () {
  return models.User
    .findAll({
      include: [{ all: true }]
    })
}

function refreshLastLogin (user) {
  user.last_login_at = new Date()
  return user.save()
}

function removeUserByGuidFromMySQL (opts) {
  return models.User
    .destroy({ where: { guid: opts.guid } })
}

function createUser (opts) {
  const data = combineNewUserData(opts)
  return models.User
    .create(data)
    .then(user => {
      return user.reload({ include: [{ all: true }] })
    })
}

function findOrCreateUser (where, defaults) {
  const data = combineNewUserData(defaults)
  return models.User
    .findOrCreate({
      where: where,
      defaults: data
    })
    .spread((user, created) => {
      return [user, created]
    })
}

function combineNewUserData (opts) {
  const passwordData = getPasswordData(opts.password)
  return {
    guid: opts.guid || guid.generate(),
    type: 'user',
    firstname: opts.firstname || '',
    lastname: opts.lastname || '',
    email: opts.email,
    subscription_email: opts.subscription_email,
    auth_password_salt: passwordData.auth_password_salt,
    auth_password_hash: passwordData.auth_password_hash,
    auth_password_updated_at: passwordData.auth_password_updated_at,
    rfcx_system: (opts.rfcx_system !== undefined ? opts.rfcx_system : false)
  }
}

function getPasswordData (password) {
  password = password || hash.randomString(50)
  const passwordSalt = hash.randomHash(320)
  return {
    auth_password_salt: passwordSalt,
    auth_password_hash: hash.hashedCredentials(passwordSalt, password),
    auth_password_updated_at: new Date()
  }
}

function updateMySQLUserPassword (password, email, guid) {
  return getUserByGuidOrEmail(guid, email)
    .then((user) => {
      const passwordData = getPasswordData(password)
      user.auth_password_salt = passwordData.auth_password_salt
      user.auth_password_hash = passwordData.auth_password_hash
      user.auth_password_updated_at = passwordData.auth_password_updated_at
      return user.save()
    })
    .then((user) => {
      return user.reload({ include: [{ all: true }] })
    })
}

function formatUser (user, short) {
  short = (short === undefined ? false : short)
  const userFormatted = {
    guid: user.guid,
    email: user.email,
    subscription_email: user.subscription_email,
    firstname: user.firstname,
    lastname: user.lastname,
    username: user.username,
    rfcx_system: user.rfcx_system
  }
  if (!short) {
    userFormatted.accessibleSites = []
    userFormatted.defaultSite = user.DefaultSite ? user.DefaultSite.guid : null
    if (user.GuardianSites) {
      user.GuardianSites.forEach((site) => {
        userFormatted.accessibleSites.push(site.guid)
      })
    }
  }
  return userFormatted
}

function formatUsers (users) {
  return users.map((user) => {
    return formatUser(user)
  })
}

function validateSiteRelationsParams (params) {
  params = new Converter(params)
  params.convert('sites').toArray()
  return params.validate()
};

function getAllSitesByGuids (sites) {
  const proms = []
  sites.forEach((site) => {
    const prom = models.GuardianSite
      .findOne({ where: { guid: site } })
      .then((user) => {
        if (!user) { throw new sequelize.EmptyResultError('Site with given guid not found: ' + site) }
        return user
      })
    proms.push(prom)
  })
  return Promise.all(proms)
}

// remove all relations from this user to any sites
function clearSitesRelationsForUser (user) {
  return models.UserSiteRelation.destroy({ where: { user_id: user.id } })
}

function getAllUserSiteGuids (dbUser) {
  const guids = []
  if (dbUser.DefaultSite) {
    guids.push(dbUser.DefaultSite.guid)
  }
  if (dbUser.GuardianSites) {
    dbUser.GuardianSites.forEach((site) => {
      if (!guids.includes(site.guid)) {
        guids.push(site.guid)
      }
    })
  }
  return guids
}

function attachSitesToUser (sites, user) {
  const proms = []
  sites.forEach(site => {
    const prom = user.addGuardianSite(site)
    proms.push(prom)
  })
  return Promise.all(proms)
}

function updateSiteRelations (user, params) {
  return validateSiteRelationsParams(params)
    .bind({})
    .then(data => {
      return getAllSitesByGuids(data.sites)
    })
    .then(sites => {
      this.sites = sites
      return clearSitesRelationsForUser(user)
    })
    .then(sites => {
      return attachSitesToUser(this.sites, user)
    })
    .then(() => {
      return getUserByGuid(user.guid)
    })
    .then(formatUser)
}

function updateDefaultSite (user, siteGuid) {
  return sitesService.getSiteByGuid(siteGuid)
    .then(function (site) {
      return user.update({
        default_site: site.id
      })
    })
    .then(() => {
      return getUserByGuid(user.guid)
    })
    .then(formatUser)
}

function getGuardianGroupsByGuids (guids, ignoreMissing) {
  const proms = []
  guids.forEach((guid) => {
    const prom = models.GuardianGroup
      .findOne({ where: { shortname: guid } })
      .then((item) => {
        if (!item && !ignoreMissing) { throw new sequelize.EmptyResultError(`GuardianGroup with guid "${guid}" not found.`) }
        return item
      })
    proms.push(prom)
  })
  return Promise.all(proms)
}

function subscribeUserToGroups (user, groups) {
  return getGuardianGroupsByGuids(groups)
    .then((dbGuardianGroups) => {
      const proms = []
      dbGuardianGroups.forEach(group => {
        const prom = user.addGuardianGroup(group)
        proms.push(prom)
      })
      return Promise.all(proms)
    })
}

function unsubscribeUserFromGroups (user, groups, ignoreMissing) {
  return getGuardianGroupsByGuids(groups, ignoreMissing)
    .then((dbGuardianGroups) => {
      const proms = []
      dbGuardianGroups.forEach(group => {
        if (group) {
          const prom = user.removeGuardianGroup(group)
          proms.push(prom)
        }
      })
      return Promise.all(proms)
    })
}

function updateUserAtts (user, attrs) {
  ['firstname', 'lastname', 'picture', 'subscription_email'].forEach((attr) => {
    if (attrs[attr]) {
      user[attr] = attrs[attr]
    }
  })
  return user.save()
    .then(() => {
      return user.reload({ include: [{ all: true }] })
    })
}

function updateUserInfo (user, params) {
  const proms = []
  if (params.rfcx_system !== undefined) {
    proms.push(user.update({ rfcx_system: params.rfcx_system }))
  }
  if (params.defaultSite) {
    proms.push(updateDefaultSite(user, params.defaultSite))
  }
  return Promise.all(proms)
    .then(() => {
      return getUserByGuid(user.guid)
    })
    .then(formatUser)
}

function getUserLastCheckin (user) {
  return sensationsService.getLastCheckinByUserId(user.id)
    .then(data => {
      if (data.length) {
        data[0].user = this.formatUser(user, true)
      }
      return data
    })
}

function formatCheckin (checkin) {
  return {
    latitude: checkin.location.coordinates[0],
    longitude: checkin.location.coordinates[1],
    user: checkin.user
  }
}

function createUserLocation (data) {
  return models.UserLocation.create(data)
}

function createUserLocations (data) {
  return models.UserLocation.bulkCreate(data, { validate: true })
}

function getLocations (req) {
  let dir = 'DESC'
  if (req.query.dir && ['ASC', 'DESC'].indexOf(req.query.dir.toUpperCase()) !== -1) {
    dir = req.query.dir.toUpperCase()
  }

  const opts = {
    limit: req.query.limit ? parseInt(req.query.limit) : 10000,
    offset: req.query.offset ? parseInt(req.query.offset) : 0,
    afterTime: req.query.after_time,
    beforeTime: req.query.before_time,
    afterLocalTime: req.query.after_local_time,
    beforeLocalTime: req.query.before_local_time,
    dayTimeLocalAfter: req.query.daytime_local_after,
    dayTimeLocalBefore: req.query.daytime_local_before,
    weekdays: req.query.weekdays !== undefined ? (Array.isArray(req.query.weekdays) ? req.query.weekdays : [req.query.weekdays]) : undefined,
    users: req.query.users ? (Array.isArray(req.query.users) ? req.query.users : [req.query.users]) : undefined,
    sites: req.query.sites ? (Array.isArray(req.query.sites) ? req.query.sites : [req.query.sites]) : undefined,
    order: 'Location.time',
    dir: dir
  }

  let sql = `SELECT Location.latitude, Location.longitude, Location.time,
                    User.firstname, User.lastname, User.email, User.guid as user_guid,
                    DefaultSite.guid as site_guid, DefaultSite.timezone as site_timezone
             FROM UserLocations AS Location
             LEFT JOIN Users AS User ON Location.user_id = User.id
             LEFT JOIN GuardianSites AS DefaultSite ON User.default_site = DefaultSite.id`

  sql = sqlUtils.condAdd(sql, true, ' WHERE 1=1')
  sql = sqlUtils.condAdd(sql, opts.afterTime, ' AND Location.time > :afterTime')
  sql = sqlUtils.condAdd(sql, opts.beforeTime, ' AND Location.time < :beforeTime')
  sql = sqlUtils.condAdd(sql, opts.afterLocalTime, ' AND Location.time > DATE_SUB(:afterLocalTime, INTERVAL 12 HOUR)')
  sql = sqlUtils.condAdd(sql, opts.beforeLocalTime, ' AND Location.time < DATE_ADD(:beforeLocalTime, INTERVAL 14 HOUR)')
  sql = sqlUtils.condAdd(sql, opts.users, ' AND User.guid IN (:users)')
  sql = sqlUtils.condAdd(sql, opts.sites, ' AND DefaultSite.guid IN (:sites)')
  sql = sqlUtils.condAdd(sql, opts.order, ' ORDER BY ' + opts.order + ' ' + opts.dir)
  sql = sqlUtils.condAdd(sql, true, ' LIMIT :limit OFFSET :offset')

  return models.sequelize
    .query(sql,
      { replacements: opts, type: models.sequelize.QueryTypes.SELECT }
    )
    .then((locations) => {
      return filterWithTz(opts, locations)
    })
}

function filterWithTz (opts, locations) {
  if (!opts.afterLocalTime && !opts.beforeLocalTime) {
    return locations
  }
  return locations.filter((location) => {
    const timeTz = moment.tz(location.time, location.site_timezone)

    if (opts.afterLocalTime) {
      if (timeTz < moment.tz(opts.afterLocalTime, location.site_timezone)) {
        return false
      }
    }
    if (opts.beforeLocalTime) {
      if (timeTz > moment.tz(opts.beforeLocalTime, location.site_timezone)) {
        return false
      }
    }
    if (opts.weekdays) { // we receive an array like ['0', '1', '2', '3', '4', '5', '6'], where `0` means Monday
      // momentjs by default starts day with Sunday, so we will get ISO weekday
      // (which starts from Monday, but is 1..7) and subtract 1
      if (!opts.weekdays.includes(`${parseInt(timeTz.format('E')) - 1}`)) {
        return false
      }
    }
    if (opts.dayTimeLocalAfter && opts.dayTimeLocalBefore && opts.dayTimeLocalBefore > opts.dayTimeLocalAfter) {
      if (timeTz.format('HH:mm:ss') < opts.dayTimeLocalAfter || timeTz.format('HH:mm:ss') >= opts.dayTimeLocalBefore) {
        return false
      }
    }
    if (opts.dayTimeLocalAfter && opts.dayTimeLocalBefore && opts.dayTimeLocalAfter > opts.dayTimeLocalBefore) {
      if (timeTz.format('HH:mm:ss') <= opts.dayTimeLocalAfter && timeTz.format('HH:mm:ss') >= opts.dayTimeLocalBefore) {
        return false
      }
    }
    if (opts.dayTimeLocalAfter && !opts.dayTimeLocalBefore) {
      if (timeTz.format('HH:mm:ss') <= opts.dayTimeLocalAfter) {
        return false
      }
    }
    if (!opts.dayTimeLocalAfter && opts.dayTimeLocalBefore) {
      if (timeTz.format('HH:mm:ss') >= opts.dayTimeLocalBefore) {
        return false
      }
    }
    return true
  })
}

function getUserDataFromReq (req) {
  return {
    guid: req.rfcx.auth_token_info.guid,
    firstname: req.rfcx.auth_token_info.given_name || (req.rfcx.auth_token_info.user_metadata ? req.rfcx.auth_token_info.user_metadata.given_name : ''),
    lastname: req.rfcx.auth_token_info.family_name || (req.rfcx.auth_token_info.user_metadata ? req.rfcx.auth_token_info.user_metadata.family_name : ''),
    avatar: req.rfcx.auth_token_info.picture || null,
    email: req.rfcx.auth_token_info.email
  }
}

function collectUserDataForSync (req) {
  const { guid, email, avatar } = getUserDataFromReq(req)
  return getUserByGuidOrEmail(guid, email)
    .then((dbUser) => {
      const { id, firstname, lastname, username } = dbUser
      return { id, firstname, lastname, username, email, guid, picture: avatar }
    })
}

function checkUserPicture (files) {
  return new Promise((resolve, reject) => {
    if (Array.isArray(files.file)) {
      return reject(new ValidationError('It is only one file allowed to be uploaded.'))
    }
    const file = files.file
    if (!file) {
      return reject(new ValidationError('No file provided.'))
    }
    if (file.size > 2048000) {
      return reject(new ValidationError('File size exceeds maximum value of 2mb.'))
    }
    const allowedExtensions = ['png', 'jpg']
    if (!allowedExtensions.includes(file.extension.toLowerCase())) {
      return reject(new ValidationError(`Wrong file type. Allowed types are: ${allowedExtensions.join(', ')}`))
    }
    var input = fs.createReadStream(file.path)
    probe(input)
      .then(result => {
        if (result.width > 2000 || result.height > 2000) {
          input.destroy()
          return reject(new ValidationError('Image should be not more than 2000px x 2000px.'))
        }
        input.destroy()
        return resolve()
      })
      .catch((err) => {
        reject(err)
      })
  })
}

function checkUserConnection (userId, connection, errorMessage) {
  return new Promise((resolve, reject) => {
    const connectionType = userId.split('|')[0]
    if (connectionType !== connection) {
      return reject(new ForbiddenError(errorMessage || 'Operation not supported for your account type.'))
    }
    return resolve()
  })
}

function uploadImageFile (opts) {
  return S3Service.putObject(opts.filePath, opts.fileName, opts.bucket, opts.acl)
}

function deleteImageFile (picture, guid) {
  const ext = pathCompleteExtname(picture)
  const fullPath = `/userpics/${guid}${ext}`
  return S3Service.deleteObject(process.env.USERS_BUCKET, fullPath)
}

function prepareUserUrlPicture (user, url) {
  const opts = { picture: url }
  return updateUserAtts(user, opts)
}

module.exports = {
  getUserByParams,
  getUserByGuid,
  getUserByEmail,
  getUserByGuidOrEmail,
  getUserFromTokenInfo,
  getUserBySubscriptionEmail,
  getAllUsers,
  createUser,
  findOrCreateUser,
  refreshLastLogin,
  formatUser,
  formatUsers,
  updateSiteRelations,
  subscribeUserToGroups,
  unsubscribeUserFromGroups,
  unsubscriptionSalt,
  updateDefaultSite,
  getAllUserSiteGuids,
  updateUserInfo,
  updateUserAtts,
  getUserLastCheckin,
  formatCheckin,
  createUserLocation,
  createUserLocations,
  getLocations,
  removeUserByGuidFromMySQL,
  updateMySQLUserPassword,
  getUserDataFromReq,
  collectUserDataForSync,
  checkUserPicture,
  checkUserConnection,
  uploadImageFile,
  deleteImageFile,
  prepareUserUrlPicture
}
