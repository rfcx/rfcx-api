module.exports = {
  authenticate: function () {
    return function (req, res, next) {
      next(null)
    }
  },
  authenticatedWithRoles: function () {
    return function (req, res, next) {
      next(null)
    }
  },
  hasRole: function () {
    return function (req, res, next) {
      next(null)
    }
  }
}
