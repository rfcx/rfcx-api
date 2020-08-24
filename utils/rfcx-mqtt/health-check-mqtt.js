var Promise = require('bluebird')
var models = require('../../models')

exports.healthCheck = {

  dbCheck: function () {
    return new Promise(function (resolve, reject) {
      models.HealthCheck
        .findOne({
          attributes: [[models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count']]
        }).then(function (dbRowCount) {
          try {
            resolve(dbRowCount.dataValues.count >= 0)
          } catch (e) { reject(e) }
        }).catch(function (err) {
          console.log('failed to fetch row count | ' + err)
          reject(new Error(err))
        })
    })
  },

  httpResponse: function (req, res) {
    var rtrnJson = { healthy: null }
    if (req.query.headers === '1') { rtrnJson.http_headers = {}; for (const i in req.headers) { rtrnJson.http_headers[i] = req.headers[i] } }

    this.dbCheck()
      .then(function (isConnected) {
        rtrnJson.healthy = isConnected
        res.status(isConnected ? 200 : 500).json(rtrnJson)
      }).catch(function (err) {
        if (err) {
          console.log(err.message)
          rtrnJson.healthy = false
          res.status(500).json(rtrnJson)
        }
      })
  }

}
