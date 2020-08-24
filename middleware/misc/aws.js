var AWS = require('aws-sdk')
var logger = require('../../utils/logger').debugLogger
var instanceId = null

function getInstanceId (cb) {
  var awsMetadataService = new AWS.MetadataService({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.AWS_REGION_ID
  })
  awsMetadataService.request('/latest/meta-data/instance-id', function (err, id) {
    logger.log('getInstanceId', { id: id, error: err })
    if (err) {
      cb(null)
      return
    }
    cb(id)
  })
}

getInstanceId(function (id) {
  instanceId = id
})

function addInstanceId (req, res, next) {
  if (instanceId) {
    req.instance = instanceId
  }
  next()
}

module.exports = {
  addInstanceId: addInstanceId
}
