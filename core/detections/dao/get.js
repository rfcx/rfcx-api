const { EmptyResultError } = require('../../../common/error-handling/errors')
const { Detection } = require('../../_models')
const { availableIncludes } = require('./index')
const moment = require('moment-timezone')

async function get (filters, options = {}) {
  const attributes = options.fields && options.fields.length > 0 ? Detection.attributes.full.filter(a => options.fields.includes(a)) : Detection.attributes.full
  const include = options.fields && options.fields.length > 0 ? availableIncludes.filter(i => options.fields.includes(i.as)) : availableIncludes
  const where = {
    streamId: filters.streamId,
    start: moment.utc(filters.start).valueOf()
  }
  if (filters.classificationId !== undefined) {
    where.classificationId = filters.classificationId
  }
  if (filters.classifierId !== undefined) {
    where.classifierId = filters.classifierId
  }

  const detection = await Detection.findOne({
    where,
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
