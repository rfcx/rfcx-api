var httpError = require('../../utils/http-errors');

function checkForYggdrasil(req, res, next) {
  let regExp = new RegExp(process.env.YGGDRASIL_IP_MASK);
  if (regExp.test(req.ip)) {
    next();
  }
  else {
    httpError(res, 403);
  }
}

module.exports = {
  checkForYggdrasil,
};
