const moment = require('moment')
const { parseFileNameAttrs } = require('../../../core/_services/streams/segment-file-parsing')
const { gluedDateStrToMoment } = require('../../../utils/misc/datetime')

const assetsPrefix = '/internal/assets/streams/'
const streamPrefix = '/streams/'

/**
 * Parses stream id, start time and end time from url and query params
 * @param {*} req Express request object
 * @returns
 */
async function parseStreamAndTime (req) {
  let stream, start, end
  const url = req.originalUrl
  if (url.startsWith(assetsPrefix)) {
    const attrs = await parseFileNameAttrs(req.originalUrl.replace('/internal/assets/streams/', '')) // TODO Don't make middleware dependent on url structure
    stream = attrs.streamId
    if (attrs.time) {
      if (attrs.time.starts) {
        start = gluedDateStrToMoment(attrs.time.starts).valueOf()
      }
      if (attrs.time.ends) {
        end = gluedDateStrToMoment(attrs.time.ends).valueOf()
      }
    }
  } else if (url.startsWith(streamPrefix)) {
    stream = url.replace(streamPrefix, '').substr(0, 12)
    if (req.query) {
      if (req.query.start) {
        start = moment.utc(req.query.start).valueOf()
      }
      if (req.query.end) {
        end = moment.utc(req.query.end).valueOf()
      }
    }
  }
  return { stream, start, end }
}

module.exports = {
  parseStreamAndTime
}
