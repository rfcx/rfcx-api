module.exports = function (req, res, next) {
  const requestStartTime = (new Date()).valueOf()
  const apiUrlDomain = `${process.env.REST_PROTOCOL}://${process.env.REST_HOST}`

  let paramLimit = (req.query.limit == null) ? 20 : parseInt(req.query.limit)
  if (paramLimit > 1000) { paramLimit = 1000 } else if (paramLimit < 1) { paramLimit = 1 }

  const paramOffset = (req.query.offset == null) ? 0 : parseInt(req.query.offset)

  let paramAfter = (req.query.starting_after == null) ? null : (isNaN(Number(req.query.starting_after))) ? (new Date('' + req.query.starting_after)) : (new Date(parseInt(req.query.starting_after)))
  let paramBefore = (req.query.ending_before == null) ? null : (isNaN(Number(req.query.ending_before))) ? (new Date('' + req.query.ending_before)) : (new Date(parseInt(req.query.ending_before)))
  const fallbackDurationInMinutes = 60
  if ((paramAfter != null) && (paramBefore == null)) { paramBefore = new Date(paramAfter.valueOf() + fallbackDurationInMinutes * 60 * 1000) }
  if ((paramBefore != null) && (paramAfter == null)) { paramAfter = new Date(paramBefore.valueOf() - fallbackDurationInMinutes * 60 * 1000) }

  const paramOrder = (req.query.order == null || typeof (req.query.order) !== 'string') ? null : ((req.query.order.toLowerCase() === 'ascending') ? 'ASC' : 'DESC')

  const authUser = { header: null, query: null, body: null }
  if (req.headers['x-auth-user'] != null) { authUser.header = req.headers['x-auth-user'] }
  if (req.query.auth_user != null) { authUser.query = req.query.auth_user }
  if (req.body.auth_user != null) { authUser.body = req.body.auth_user }

  const apiVersion = { header: null, query: null, body: null }
  if (req.headers['x-rfcx-version'] != null) { apiVersion.header = req.headers['x-rfcx-version'] }
  if (req.query.rfcx_version != null) { apiVersion.query = req.query.rfcx_version }
  if (req.body.rfcx_version != null) { apiVersion.body = req.body.rfcx_version }

  req.rfcx = {
    request_start_time: requestStartTime,
    api_url_protocol: process.env.REST_PROTOCOL,
    api_url_domain: apiUrlDomain,
    api_version: apiVersion,
    limit: paramLimit,
    offset: paramOffset,
    starting_after: paramAfter,
    ending_before: paramBefore,
    order: paramOrder,
    auth_user: authUser
  }

  const allowedOverInsecureConnection = ['rf.cx', 'api-insecure.rfcx.org', 'checkin.rfcx.org']

  if (((process.env.NODE_ENV === 'production') || (process.env.NODE_ENV === 'staging')) &&
    (req.rfcx.api_url_protocol === 'http') &&
    (allowedOverInsecureConnection.indexOf(req.headers.host) < 0)
  ) {
    res.redirect('https://' + req.headers.host + req.url)
  } else {
    next()
  }
}
