exports.sbdRockBlock = {

  validateIncomingMessage: function (req) {
    if ((req.headers['x-forwarded-for'] != null) && ((req.headers['x-forwarded-for'] === '212.71.235.32') || (req.headers['x-forwarded-for'] === '109.74.196.135')) && (req.body.data !== '')) {
      return true
    }

    return false
  }

}
