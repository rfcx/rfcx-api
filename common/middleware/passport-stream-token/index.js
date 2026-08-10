const TokenStrategy = require('passport-accesstoken').Strategy
const { ValidationError } = require('../../../common/error-handling/errors')
const { getStreamRangeToken } = require('../../../core/streams/dao')
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
  // Optional expiry. `exp` is epoch SECONDS and is part of the SIGNED message,
  // so it cannot be tampered with: editing it in the URL changes the token that
  // would be required. A token minted WITHOUT an exp still verifies (the
  // historical, non-expiring form) -- that keeps this backward compatible while
  // callers migrate. Tighten to mandatory once all minters send an exp.
  const rawExp = (req.query || {}).exp
  let exp
  if (rawExp !== undefined && rawExp !== null && `${rawExp}` !== '') {
    exp = Number(rawExp)
    // FAIL CLOSED on a malformed `exp` -- 401, not a ValidationError.
    // Passing an error to done() surfaces as a 500 here (verified live: the
    // pre-existing missing-stream/start/end ValidationError path also 500s),
    // and a 500 on a bad query param is both wrong for the caller and noisy
    // for monitoring. An unparseable expiry is indistinguishable from a bad
    // credential, so treat it as one.
    if (!Number.isInteger(exp) || exp * 1000 <= Date.now()) {
      return done(null, false)
    }
  }

  const correctToken = getStreamRangeToken(stream, start, end, exp)
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
      end,
      exp
    }
  }
  done(null, req.rfcx.auth_token_info)
})

module.exports = strategy
