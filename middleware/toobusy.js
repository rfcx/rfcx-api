const toobusy = require('toobusy-js')

module.exports = function (req, res, next) {
  if (toobusy()) {
    console.error('Server is too busy to handle request', {
      req: req.guid,
      info: {
        url: req.url,
        body: req.body
      }
    })
  }
  next()
}
