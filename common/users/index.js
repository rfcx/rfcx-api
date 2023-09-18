const { User, Sequelize } = require('../../core/_models')
const { randomGuid } = require('../crypto/random')
const { EmptyResultError, ValidationError } = require('../error-handling/errors')
const { createReadStream } = require('fs')
const probe = require('probe-image-size')
const path = require('path')
const s3Service = require('../../noncore/_services/legacy/s3/s3-service')

function fillUserData (data) {
  if (!data.guid) {
    data.guid = randomGuid()
  }
}

function findOrCreateUser (defaults) {
  fillUserData(defaults)
  const where = { [Sequelize.Op.or]: { guid: defaults.guid, email: defaults.email } }
  return User
    .findOrCreate({ where, defaults })
    .spread((user, created) => {
      return [user, created]
    })
}

function getUserByParams (params, ignoreMissing, options = {}) {
  const transaction = options.transaction
  return User
    .findOne({
      where: params,
      include: [{ all: true }],
      transaction
    })
    .then((user) => {
      if (!user && !ignoreMissing) { throw new EmptyResultError('User not found') }
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
    [Sequelize.Op.or]: {
      guid: field1,
      email: field2
    }
  })
}

/**
 * Get user id by guid
 * @param {string} guid
 * @returns {number|undefined} user id
 */
async function getIdByGuid (guid) {
  try {
    const user = await getUserByGuid(guid)
    return user.id
  } catch (err) {
    return undefined
  }
}

function update (user, attrs) {
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
    const input = createReadStream(file.path)
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

function uploadImageFile (opts) {
  return s3Service.putObject(opts.filePath, opts.fileName, opts.bucket, opts.acl)
}

function deleteImageFile (picture, guid) {
  const extension = path.extname(picture)
  const fullPath = `/userpics/${guid}${extension}`
  return s3Service.deleteObject(process.env.USERS_BUCKET, fullPath)
}

function prepareUserUrlPicture (user, url) {
  const opts = { picture: url }
  return update(user, opts)
}

function formatUser (user) {
  return {
    guid: user.guid,
    email: user.email,
    subscription_email: user.email,
    firstname: user.firstname,
    lastname: user.lastname,
    username: user.username
  }
}

module.exports = {
  findOrCreateUser,
  getUserByParams,
  getUserByGuid,
  getUserByEmail,
  getUserByGuidOrEmail,
  getIdByGuid,
  update,
  checkUserPicture,
  uploadImageFile,
  deleteImageFile,
  prepareUserUrlPicture,
  formatUser
}
