const { EmptyResultError, ForbiddenError } = require('../../../common/error-handling/errors')
const models = require('../../_models')
const { STREAM, hasPermission, READ } = require('../../roles/dao')
const { availableIncludes } = require('./index')
const moment = require('moment-timezone')

async function get (filters, options = {}) {
  const attributes = options.fields && options.fields.length > 0 ? models.Detection.attributes.full.filter(a => options.fields.includes(a)) : models.Detection.attributes.full
  const include = options.fields && options.fields.length > 0 ? availableIncludes.filter(i => options.fields.includes(i.as)) : availableIncludes
  const fieldsIncludeStreamId = options.fields && options.fields.includes('stream_id')

  if (!fieldsIncludeStreamId) {
    attributes.push('stream_id') // it is required for 'hasPermission' function call later
  }

  const detection = await models.Detection.findOne({
    where: {
      id: filters.id,
      start: moment.utc(filters.start).valueOf()
    },
    attributes,
    include
  })

  if (!detection) {
    throw new EmptyResultError('Detection with given parameters not found')
  }

  if (options.readableBy && !(await hasPermission(READ, options.readableBy, detection.stream_id, STREAM))) {
    throw new ForbiddenError()
  }

  if (!fieldsIncludeStreamId) {
    delete detection.stream_id
  }
  return detection
}

module.exports = {
  get
}
