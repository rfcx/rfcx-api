const crypto = require('crypto')
const iotdaApp = require('../../../mqtt/iotda')
const moment = require('moment')

const availableProject = ['3dvrocmagfiw']
function parse (pingObj) {
  const time = new Date(parseInt(pingObj.json.battery[0][0]))
  const percentage = parseInt(pingObj.json.battery[0][1])
  const temp = parseInt(pingObj.json.battery[0][2])
  const messageBody = {
    services: [
      {
        service_id: 'TestService',
        properties: {
          batteryPercentage: percentage,
          batteryTemp: temp
        },
        event_time: `${time.getFullYear()}${time.getMonth()}${time.getDay()}T${time.getHours()}${time.getMinutes()}${time.getSeconds()}Z`
      }
    ]
  }
  return messageBody
}

function forward (pingObj) {
  const targetProject = pingObj.db.dbGuardian.project_id
  if (availableProject.includes(targetProject)) {
    const mqttMessage = parse(pingObj)

    const guid = pingObj.db.dbGuardian.guid
    const now = moment.utc()
    const month = (now.month() < 10) ? `0${now.month() + 1}` : now.month()
    const day = (now.date() < 10) ? `0${now.date()}` : now.date()
    const hour = (now.hours() < 10) ? `0${now.hours()}` : now.hours()
    const key = `${now.year()}${month}${day}${hour}`
    const clientId = `${guid}_0_0_${key}`
    const password = crypto.createHmac('sha256', key).update(`rfcxrfcx`).digest('hex');

    const device = {
      clientId: clientId,
      username: guid,
      password: password
    }
    iotdaApp.forwardMessage(device, mqttMessage)
  }
}

module.exports = { forward }
