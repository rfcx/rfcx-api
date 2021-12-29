const path = require('path')

module.exports = function (req, res, next) {
  let contentType = path.extname(req.path).trim().substr(1)
  if (contentType.trim().length === 0) { contentType = 'json' }
  const urlPath = req.originalUrl
  req.url = req.url.replace('.' + contentType, '')
  req.rfcx.url_path = urlPath
  req.rfcx.content_type = contentType.toLowerCase()
  next()
}
