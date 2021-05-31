const TokenStrategy = require('passport-accesstoken').Strategy
const ValidationError = require('../../utils/converter/validation-error')
const { getStreamRangeToken } = require('../../services/streams/index')
const { parseStreamAndTime } = require('./service')

const strategy = new TokenStrategy({
  tokenHeader: 'stream-token',
  tokenQuery: 'stream-token',
  passReqToCallback: true
}, async function (req, token, done) {
  const { stream, start, end } = await parseStreamAndTime(req)
  if (!stream || !start || !end) {
    return done(new ValidationError('`stream`, `start` and `end` must be specified'))
  }
  const correctToken = getStreamRangeToken(stream, start, end)
  if (correctToken !== token) {
    return done(null, false)
  }
  req.rfcx.auth_token_info = {
    id: -1,
    owner_id: -1,
    has_stream_token: true,
    stream_token: {
      stream,
      start,
      end
    }
  }
  done(null, req.rfcx.auth_token_info)
})

module.exports = strategy
