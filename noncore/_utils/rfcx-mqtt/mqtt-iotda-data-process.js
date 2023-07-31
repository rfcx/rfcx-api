const crypto = require('crypto')
const iotdaApp = require('../../../mqtt/iotda')
const moment = require('moment')

const isEnabled = `${process.env.IOTDA_ENABLED}` === 'true'

const availableProject = ['3dvrocmagfiw']
function parse (pingObj) {
  const battery = strArrToJSArr(pingObj.json.battery, '|', '*')
  const lastIndex = battery.length - 1
  const time = moment(parseInt(battery[lastIndex][0])).utc()

  const percentage = parseInt(battery[lastIndex][1])
  const temp = parseInt(battery[lastIndex][2])
  const messageBody = {
    services: [
      {
        service_id: 'TestService',
        properties: {
          batteryPercentage: percentage,
          batteryTemp: temp
        },
        event_time: `${time.format('YYYYMMDD')}T${time.format('HHmmss')}Z`
      }
    ]
  }
  return messageBody
}

function getIoTDAConnectionOptions (pingObj, now) {
  const guid = pingObj.db.dbGuardian.guid
  const key = `${now.format('YYYYMMDDHH')}`
  const clientId = `${guid}_0_0_${key}`
  const password = crypto.createHmac('sha256', key).update('rfcxrfcx').digest('hex')

  return {
    clientId: clientId,
    username: guid,
    password: password
  }
}

function forward (pingObj) {
  const targetProject = pingObj.db.dbGuardian.project_id
  if (availableProject.includes(targetProject)) {
    const mqttMessage = parse(pingObj)
    const device = getIoTDAConnectionOptions(pingObj, moment.utc())
    iotdaApp.forwardMessage(device, mqttMessage)
  }
}

function strArrToJSArr (str, delimA, delimB) {
  if ((str == null) || (str.length === 0)) { return [] }
  try {
    const rtrnArr = []; const arr = str.split(delimA)
    if (arr.length > 0) { for (const i in arr) { rtrnArr.push(arr[i].split(delimB)) } return rtrnArr } else { return [] }
  } catch (e) {
    console.error(e); return []
  }
}

module.exports = { forward, parse, getIoTDAConnectionOptions, isEnabled }
