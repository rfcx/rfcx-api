const Promise = require('bluebird')
const moment = require('moment-timezone')
const S3Service = require('../legacy/s3/s3-service')
const models = require('../../models')
const sequelize = require('sequelize')

function uploadAttachment (opts) {
  const s3Path = getS3PathForType(opts.type, opts.time)
  const s3FullPath = `/${s3Path}/${opts.fileName}`
  return new Promise((resolve, reject) => {
    S3Service.putObject(opts.filePath, s3FullPath, opts.bucket)
      .then(() => {
        resolve(opts.fileName)
      })
      .catch((err) => {
        reject(err)
      })
  })
}

function removeAttachmentFromS3 (opts) {
  const s3Path = getS3PathForType(opts.type, opts.time)
  const s3FullPath = `/${s3Path}/${opts.fileName}`
  return new Promise((resolve, reject) => {
    S3Service.deleteObject(opts.bucket, s3FullPath)
      .then(() => {
        resolve()
      })
      .catch((err) => {
        reject(err)
      })
  })
}

function getS3PathForType (type, time) {
  const momentTime = moment.tz(time, 'UTC')
  return `${type}/${momentTime.format('YYYY')}/${momentTime.format('MM')}/${momentTime.format('DD')}`
}

function removeAttachment (opts) {
  return models.Attachment
    .destroy({ where: { guid: opts.guid } })
}

function getAttachmentByGuid (guid) {
  return models.Attachment
    .findOne({
      where: { guid },
      include: [{ all: true }]
    })
    .then((item) => {
      if (!item) { throw new sequelize.EmptyResultError('Attachment with given guid not found.') }
      return item
    })
}

function findOrCreateAttachmentType (type) {
  return models.AttachmentType.findOrCreate({
    where: { type },
    defaults: { type }
  })
    .spread((dbAttachmentType, created) => {
      return dbAttachmentType
    })
}

function createAttachment (opts) {
  return models.Attachment
    .create({
      guid: opts.guid,
      reported_at: opts.reported_at,
      url: opts.url,
      type_id: opts.type_id,
      user_id: opts.user_id
    })
    .then((attachment) => {
      return attachment.reload({
        include: [{ all: true }]
      })
    })
}

function formatAttachment (attachment) {
  return {
    guid: attachment.guid,
    reported_at: attachment.reported_at,
    url: attachment.url,
    reporter: {
      guid: attachment.User.guid,
      firstname: attachment.User.firstname,
      lastname: attachment.User.lastname,
      email: attachment.User.email
    },
    type: attachment.Type.type
  }
}

function formatAttachments (attachments) {
  return attachments.map(formatAttachment)
}

module.exports = {
  uploadAttachment,
  removeAttachmentFromS3,
  removeAttachment,
  getS3PathForType,
  getAttachmentByGuid,
  findOrCreateAttachmentType,
  createAttachment,
  formatAttachment,
  formatAttachments
}
