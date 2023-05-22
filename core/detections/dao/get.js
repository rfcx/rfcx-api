// const { EmptyResultError, ForbiddenError } = require('../../../common/error-handling/errors')
const { EmptyResultError } = require('../../../common/error-handling/errors')
const { Detection } = require('../../_models')
// const { STREAM, hasPermission, READ } = require('../../roles/dao')
const { availableIncludes } = require('./index')
const moment = require('moment-timezone')

async function get (filters, options = {}) {
  const attributes = options.fields && options.fields.length > 0 ? Detection.attributes.full.filter(a => options.fields.includes(a)) : Detection.attributes.full
  const include = options.fields && options.fields.length > 0 ? availableIncludes.filter(i => options.fields.includes(i.as)) : availableIncludes

  const detection = await Detection.findOne({
    where: {
      stream_id: filters.streamId,
      start: moment.utc(filters.start).valueOf()
    },
    attributes,
    include
  })

  if (!detection) {
    throw new EmptyResultError('Detection with given parameters not found')
  }

  return detection
}

module.exports = {
  get
}
